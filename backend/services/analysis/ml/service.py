import os
import asyncio
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict
from sqlalchemy.orm import Session

from ..features import feature_extractor
from services.device import device_state_manager
from repositories.session import SessionRepository
from repositories.raw_data import RawDataRepository
from repositories.raw_data.mobile_repository import RawDataMobileRepository
from core.database import SessionLocal
from core.config import settings
from core.exceptions import InsufficientDataException, RecordingNotFoundException
from utils import (
    logger,
    resolve_path,
    MIN_SAMPLES_FOR_ANALYSIS,
    CLASS_INDEX_MAP,
    ECGClassification,
    WSMessageType,
    DEFAULT_MODEL_DIR,
    DEFAULT_SCALER_FILE,
    DEFAULT_MODEL_FILE,
)


class MLEngineService:

    def __init__(self, max_workers: int = 3):
        self.scaler = None
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.is_loaded = False

    def load_model(self):

        try:

            import tensorflow as tf

            model_dir = resolve_path(settings.MODEL_PATH or DEFAULT_MODEL_DIR)

            scaler_path = os.path.join(model_dir, DEFAULT_SCALER_FILE)
            model_path = os.path.join(model_dir, DEFAULT_MODEL_FILE)

            if not os.path.exists(scaler_path) or not os.path.exists(model_path):
                logger.warning(
                    f"[ML Engine] Model files not found at {model_dir}. "
                    "Prediction will be disabled."
                )
                return

            self.scaler = joblib.load(scaler_path)

            self.model = tf.keras.models.load_model(model_path)

            self.is_loaded = True
            logger.info(
                f"[ML Engine] AI Model and Scaler loaded successfully from {model_dir}"
            )

        except Exception as e:
            logger.error(f"[ML Engine] Critical error loading AI models: {e}")
            self.is_loaded = False

    def shutdown(self):

        logger.info("[ML Engine] Shutting down thread pool...")
        self.executor.shutdown(wait=False)
        logger.info("[ML Engine] Shutdown complete")

    async def trigger_analysis(
        self, recording_id: str, subject_id: str, device_id: str
    ):

        try:
            logger.info(
                f"[ML Engine] Received analysis trigger for recording {recording_id} (Device: {device_id})"
            )

            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._analyze_recording,
                recording_id,
                subject_id,
                device_id,
            )

            if result:
                await self._broadcast_result(device_id, result)
                logger.info(
                    f"[ML Engine] Analysis complete and broadcasted for {recording_id}"
                )
        except Exception as e:
            logger.error(
                f"[ML Engine] Failed to trigger analysis for {recording_id}: {e}"
            )

    def _analyze_recording(
        self, recording_id: str, subject_id: str, device_id: str
    ) -> Optional[Dict]:

        db = SessionLocal()

        try:
            logger.debug(
                f"[ML Engine] Processing classification for recording {recording_id}"
            )
            raw_data = self._fetch_raw_data(db, recording_id)

            features = self._extract_features_from_data(raw_data, device_id)

            classification, confidence = self._predict(features)

            self._save_results(db, recording_id, classification, confidence, features)

            logger.info(
                f"[ML Engine] Successfully classified {recording_id} as '{classification}' "
                f"(BPM: {int(features['bpm'])}, confidence: {confidence:.2%})"
            )

            return {
                "recording_id": recording_id,
                "device_id": device_id,
                "classification": classification,
                "confidence": confidence,
            }

        except InsufficientDataException as e:
            logger.warning(
                f"[ML Engine] Insufficient data for {recording_id}: {e.message}"
            )
            return None
        except Exception as e:
            logger.error(f"[ML Engine] Analysis failed for {recording_id}: {e}")
            return None
        finally:
            db.close()

    def _fetch_raw_data(self, db: Session, recording_id: str) -> pd.DataFrame:

        session_repo = SessionRepository(db)
        session = session_repo.get(recording_id)

        if not session:
            raise RecordingNotFoundException(recording_id)

        if session.created_by == "MOBILE":
            raw_repo = RawDataMobileRepository(db)
        else:
            raw_repo = RawDataRepository(db)

        rows = raw_repo.find_by_recording_id(recording_id)

        if not rows:
            raise RecordingNotFoundException(recording_id)

        if len(rows) < MIN_SAMPLES_FOR_ANALYSIS:
            raise InsufficientDataException(
                recording_id, samples=len(rows), required=MIN_SAMPLES_FOR_ANALYSIS
            )

        df = pd.DataFrame(
            [
                {"lead_I": r.mv_lead_I, "lead_II": r.mv_lead_II, "v1": r.mv_v1}
                for r in rows
            ]
        )

        return df

    def _extract_features_from_data(
        self, df: pd.DataFrame, device_id: str
    ) -> Dict[str, float]:

        lead_i = df["lead_I"].fillna(0).values
        lead_ii = df["lead_II"].fillna(0).values
        lead_v1 = df["v1"].fillna(0).values

        state = device_state_manager.get_state(device_id)
        s_rate = state.sampling_rate if state else 100

        features = feature_extractor.extract_features(
            lead_i, lead_ii, lead_v1, sampling_rate=s_rate
        )

        return features

    def _predict(self, features: Dict[str, float]) -> tuple[str, float]:

        if not self.is_loaded:
            logger.warning("[ML Engine] Model not loaded, returning Unknown")
            return ECGClassification.UNKNOWN.value, 0.0

        try:

            features_array = feature_extractor.features_to_array(features)

            features_array = np.nan_to_num(features_array)

            normalized = self.scaler.transform(features_array)

            predictions = self.model.predict(normalized, verbose=0)

            class_idx = np.argmax(predictions.flatten()) + 1
            confidence = float(np.max(predictions))

            classification = CLASS_INDEX_MAP.get(
                class_idx, ECGClassification.UNKNOWN
            ).value

            return classification, confidence

        except Exception as e:
            logger.error(f"[ML Engine] Prediction failed: {e}")
            return ECGClassification.UNKNOWN.value, 0.0

    def _save_results(
        self,
        db: Session,
        recording_id: str,
        classification: str,
        confidence: float,
        features: Dict[str, float],
    ):

        session_repo = SessionRepository(db)

        session_repo.update_analysis_results(
            recording_id=recording_id,
            classification=classification,
            confidence=confidence,
            features=features,
            analyzed_by="AI_ENGINE",
        )

    async def _broadcast_result(self, device_id: str, result: Dict):

        await device_state_manager.broadcast_to_device(
            device_id,
            WSMessageType.LIVE_RESULT.value,
            {
                "device_id": device_id,
                "recording_id": result["recording_id"],
                "classification": result["classification"],
                "confidence": result["confidence"],
                "changed_dt": datetime.now(timezone.utc).isoformat(),
            },
        )

        await device_state_manager.broadcast_to_all(
            {"type": WSMessageType.HISTORY_UPDATED.value}
        )

    def is_model_loaded(self) -> bool:

        return self.is_loaded

    def get_model_info(self) -> Dict:

        return {
            "is_loaded": self.is_loaded,
            "model_type": "ANN" if self.model else None,
            "scaler_type": "StandardScaler" if self.scaler else None,
            "executor_workers": self.executor._max_workers,
        }


ml_engine_service = MLEngineService()
