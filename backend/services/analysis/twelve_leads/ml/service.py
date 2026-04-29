import os
import asyncio
import joblib
import pandas as pd
import httpx
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict
from sqlalchemy.orm import Session

from ..features import feature_extractor_12leads as feature_extractor
from services.device import device_state_manager
from repositories.session import SessionRepository
from repositories.raw_data import (
    RawData12LeadsRepository,
    RawData12LeadsMobileRepository,
)
from repositories.raw_data.base import BaseRawDataRepository
from core.database import SessionLocal
from core.config import settings
from core.exceptions import InsufficientDataException, RecordingNotFoundException
from core.exceptions.definitions import AppException
from utils import (
    logger,
    resolve_path,
    MIN_SAMPLES_FOR_ANALYSIS,
    ECGClassification,
    WSMessageType,
    DEFAULT_MODEL_DIR,
    SAMPLING_RATE_12LEADS,
    BUFFER_SIZE_12LEADS,
)


class MLEngineService:

    def __init__(self, max_workers: int = 3):
        self.scaler = None
        self.model_xgb = None
        self.kmeans_abnormal = None
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.is_loaded = False
        self.api_url = "https://ecg-12-class-api.vps-1.ctailab.com/api/v1/analyze"

    def load_model(self):
        logger.debug("[MLEngineService] Starting load_model...")
        try:
            model_dir = resolve_path(
                os.path.join(settings.MODEL_PATH or DEFAULT_MODEL_DIR, "12leads")
            )

            scaler_path = os.path.join(model_dir, "scaler.joblib")
            model_xgb_path = os.path.join(model_dir, "model_xgb_binary.joblib")
            kmeans_path = os.path.join(model_dir, "kmeans_abnormal_model.joblib")

            if (
                not os.path.exists(scaler_path)
                or not os.path.exists(model_xgb_path)
                or not os.path.exists(kmeans_path)
            ):
                logger.warning(
                    f"[ML Engine] Model files not found at {model_dir}. "
                    "Prediction will use external API as primary."
                )
                return

            self.scaler = joblib.load(scaler_path)
            self.model_xgb = joblib.load(model_xgb_path)
            self.kmeans_abnormal = joblib.load(kmeans_path)

            self.is_loaded = True
            logger.info(
                f"[ML Engine] XGB and KMeans Models and Scaler loaded successfully from {model_dir}"
            )
            logger.debug("[MLEngineService] Successfully completed load_model.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in load_model: {e}")
            self.is_loaded = False
            raise AppException(status_code=500, message="Internal Service Error")

    def shutdown(self):
        logger.debug("[MLEngineService] Starting shutdown...")
        try:
            logger.info("[ML Engine] Shutting down thread pool...")
            self.executor.shutdown(wait=False)
            logger.info("[ML Engine] Shutdown complete")
            logger.debug("[MLEngineService] Successfully completed shutdown.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in shutdown: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def trigger_analysis(
        self, recording_id: str, subject_id: str, device_id: str
    ):
        logger.debug("[MLEngineService] Starting trigger_analysis...")
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
            logger.debug("[MLEngineService] Successfully completed trigger_analysis.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in trigger_analysis: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def _analyze_recording(
        self, recording_id: str, subject_id: str, device_id: str
    ) -> Optional[Dict]:
        logger.debug("[MLEngineService] Starting _analyze_recording...")
        db = SessionLocal()

        try:
            logger.debug(
                f"[ML Engine] Processing classification for recording {recording_id}"
            )
            raw_df = self._fetch_raw_data(db, recording_id, limit=BUFFER_SIZE_12LEADS)

            try:
                classification, features = self._call_external_api(raw_df, device_id)
                confidence = 1.0
                logger.info(
                    f"[ML Engine] External API Success for {recording_id}: {classification}"
                )
            except Exception as api_err:
                logger.error(
                    f"[ML Engine] External API Failed: {api_err}. Falling back to local model."
                )
                features = self._extract_features_from_data(raw_df, device_id)
                classification, confidence = self._predict(features)

            self._save_results(db, recording_id, classification, confidence, features)

            bpm = 0
            if "II" in features:
                bpm = features["II"].get("heart_rate_bpm", 0)
            elif "lead_ii" in features:
                bpm = features["lead_ii"].get("heart_rate_bpm", 0)
            else:
                bpm = features.get("heartrate_ii", 0)

            logger.info(
                f"[ML Engine] Successfully classified {recording_id} as '{classification}' "
                f"(BPM: {int(bpm or 0)}, confidence: {confidence:.2%})"
            )

            logger.debug("[MLEngineService] Successfully completed _analyze_recording.")
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
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[MLEngineService] Unexpected error in _analyze_recording: {e}"
            )
            return None
        finally:
            db.close()

    def _call_external_api(self, df: pd.DataFrame, device_id: str) -> tuple[str, Dict]:
        logger.debug("[MLEngineService] Starting _call_external_api...")

        state = device_state_manager.get_state(device_id)
        s_rate = (
            state.sampling_rate
            if (state and state.sampling_rate > 100)
            else SAMPLING_RATE_12LEADS
        )

        payload = {
            "sampling_rate": s_rate,
            "leads": {
                "I": df["i"].tolist(),
                "II": df["ii"].tolist(),
                "III": df["iii"].tolist(),
                "AVR": df["avr"].tolist(),
                "AVL": df["avl"].tolist(),
                "AVF": df["avf"].tolist(),
                "V1": df["v1"].tolist(),
                "V2": df["v2"].tolist(),
                "V3": df["v3"].tolist(),
                "V4": df["v4"].tolist(),
                "V5": df["v5"].tolist(),
                "V6": df["v6"].tolist(),
            },
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.api_url, json=payload)
                response.raise_for_status()
                data = response.json()

                classification = data.get("classification", {}).get("label", "Unknown")
                parameters = data.get("parameters", {})

                logger.debug(
                    "[MLEngineService] Successfully completed _call_external_api."
                )
                return classification, parameters

        except Exception as e:
            logger.error(f"[MLEngineService] External API Call Error: {e}")
            raise

    def _fetch_raw_data(
        self, db: Session, recording_id: str, limit: int = 8530
    ) -> pd.DataFrame:
        logger.debug("[MLEngineService] Starting _fetch_raw_data...")
        try:
            session_repo = SessionRepository(db)
            session = session_repo.get(recording_id)

            if not session:
                raise RecordingNotFoundException(recording_id)

            repo: BaseRawDataRepository
            if session.created_by == "MOBILE":
                repo = RawData12LeadsMobileRepository(db)
            else:
                repo = RawData12LeadsRepository(db)

            rows = repo.find_by_recording_id(recording_id, limit=limit)

            if not rows:
                raise RecordingNotFoundException(recording_id)

            if len(rows) < MIN_SAMPLES_FOR_ANALYSIS:
                raise InsufficientDataException(
                    recording_id, samples=len(rows), required=MIN_SAMPLES_FOR_ANALYSIS
                )

            data = []
            for r in rows:
                data.append(
                    {
                        "i": getattr(r, "mv_lead_i", 0.0),
                        "ii": getattr(r, "mv_lead_ii", 0.0),
                        "iii": getattr(r, "mv_lead_iii", 0.0),
                        "avr": getattr(r, "mv_avr", 0.0),
                        "avl": getattr(r, "mv_avl", 0.0),
                        "avf": getattr(r, "mv_avf", 0.0),
                        "v1": getattr(r, "mv_v1", 0.0),
                        "v2": getattr(r, "mv_v2", 0.0),
                        "v3": getattr(r, "mv_v3", 0.0),
                        "v4": getattr(r, "mv_v4", 0.0),
                        "v5": getattr(r, "mv_v5", 0.0),
                        "v6": getattr(r, "mv_v6", 0.0),
                    }
                )

            df = pd.DataFrame(data)
            logger.debug("[MLEngineService] Successfully completed _fetch_raw_data.")
            return df
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in _fetch_raw_data: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def _extract_features_from_data(
        self, df: pd.DataFrame, device_id: str
    ) -> Dict[str, float]:
        logger.debug("[MLEngineService] Starting _extract_features_from_data...")
        try:
            leads_data = {}
            for lead in [
                "i",
                "ii",
                "iii",
                "avr",
                "avl",
                "avf",
                "v1",
                "v2",
                "v3",
                "v4",
                "v5",
                "v6",
            ]:
                leads_data[lead] = df[lead].fillna(0).values

            state = device_state_manager.get_state(device_id)
            s_rate = state.sampling_rate if state else 100

            features = feature_extractor.extract_features(
                leads_data, sampling_rate=s_rate
            )

            logger.debug(
                "[MLEngineService] Successfully completed _extract_features_from_data."
            )
            return features
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[MLEngineService] Unexpected error in _extract_features_from_data: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def _predict(self, features: Dict[str, float]) -> tuple[str, float]:
        logger.debug("[MLEngineService] Starting _predict...")
        try:
            if not self.is_loaded:
                logger.warning("[ML Engine] Model not loaded, returning Unknown")
                return ECGClassification.UNKNOWN.value, 0.0

            if features.get("heartrate_ii", 0) <= 0 or features.get("rr_ii", 0) <= 0:
                logger.warning(
                    f"[ML Engine] Invalid features (BPM II: {features.get('heartrate_ii')}, RR II: {features.get('rr_ii')}). "
                    "Returning UNKNOWN."
                )
                return ECGClassification.UNKNOWN.value, 0.0

            LEAD_KEYS_STRING = [
                "i",
                "ii",
                "iii",
                "avr",
                "avl",
                "avf",
                "v1",
                "v2",
                "v3",
                "v4",
                "v5",
                "v6",
            ]
            FEATURE_FAMILIES = [
                "rr",
                "rr_std",
                "pr",
                "qs",
                "qtc",
                "st",
                "rs_ratio",
                "heartrate",
            ]
            EXPECTED_FEATURES = [
                f"{fam}_{lead_key.lower()}"
                for lead_key in LEAD_KEYS_STRING
                for fam in FEATURE_FAMILIES
            ]

            X = (
                pd.DataFrame([features], columns=EXPECTED_FEATURES)
                .astype(float)
                .fillna(0)
            )

            if self.scaler is not None and hasattr(self.scaler, "feature_names_in_"):
                X = X.reindex(columns=self.scaler.feature_names_in_, fill_value=0.0)

            if self.scaler is not None:
                normalized = self.scaler.transform(X)
            else:
                normalized = X

            if self.model_xgb is not None:
                is_normal = self.model_xgb.predict(normalized)
            else:
                is_normal = [1]

            if is_normal[0] == 1:
                classification = "Normal"
            else:
                if self.kmeans_abnormal is not None:
                    cls_num = self.kmeans_abnormal.predict(normalized) + 1
                else:
                    cls_num = [0]
                name_map = {
                    1: "Potential Slow Arrhytmia",
                    2: "Potential Fast Arrhytmia",
                }
                classification = name_map.get(cls_num[0], f"Cluster {cls_num[0]}")

            confidence = 1.0

            logger.debug("[MLEngineService] Successfully completed _predict.")
            return classification, confidence

        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in _predict: {e}")
            return ECGClassification.UNKNOWN.value, 0.0

    def _save_results(
        self,
        db: Session,
        recording_id: str,
        classification: str,
        confidence: float,
        features: Dict,
    ):
        logger.debug("[MLEngineService] Starting _save_results...")
        try:
            session_repo = SessionRepository(db)

            nested_features = {}

            is_nested = any(k in features for k in ["I", "II", "AVR", "AVL", "AVF"])

            if is_nested:
                key_map = {
                    "I": "lead_i",
                    "II": "lead_ii",
                    "III": "lead_iii",
                    "AVR": "avr",
                    "AVL": "avl",
                    "AVF": "avf",
                    "V1": "v1",
                    "V2": "v2",
                    "V3": "v3",
                    "V4": "v4",
                    "V5": "v5",
                    "V6": "v6",
                }
                for api_key, our_key in key_map.items():
                    if api_key in features:
                        nested_features[our_key] = features[api_key]
                    elif our_key in features:
                        nested_features[our_key] = features[our_key]
            else:
                LEAD_KEYS = [
                    "i",
                    "ii",
                    "iii",
                    "avr",
                    "avl",
                    "avf",
                    "v1",
                    "v2",
                    "v3",
                    "v4",
                    "v5",
                    "v6",
                ]
                for lead in LEAD_KEYS:
                    nested_features[
                        f"lead_{lead}" if lead in ["i", "ii", "iii"] else lead
                    ] = {
                        "heart_rate_bpm": features.get(f"heartrate_{lead}"),
                        "rr_ms": features.get(f"rr_{lead}"),
                        "rr_std_ms": features.get(f"rr_std_{lead}"),
                        "pr_ms": features.get(f"pr_{lead}"),
                        "qrs_ms": features.get(f"qs_{lead}"),
                        "qtc_ms": features.get(f"qtc_{lead}"),
                        "st_amplitude_mv": features.get(f"st_{lead}"),
                        "rs_ratio": features.get(f"rs_ratio_{lead}"),
                    }

            session_repo.update_analysis_results(
                recording_id=recording_id,
                classification=classification,
                confidence=confidence,
                features=nested_features,
                device_type="12LEADS",
                analyzed_by="AI_ENGINE",
            )
            logger.debug("[MLEngineService] Successfully completed _save_results.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in _save_results: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    async def _broadcast_result(self, device_id: str, result: Dict):
        logger.debug("[MLEngineService] Starting _broadcast_result...")
        try:
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
            logger.debug("[MLEngineService] Successfully completed _broadcast_result.")
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[MLEngineService] Unexpected error in _broadcast_result: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def is_model_loaded(self) -> bool:
        logger.debug("[MLEngineService] Starting is_model_loaded...")
        try:
            result = self.is_loaded
            logger.debug("[MLEngineService] Successfully completed is_model_loaded.")
            return result
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in is_model_loaded: {e}")
            return False

    def get_model_info(self) -> Dict:
        logger.debug("[MLEngineService] Starting get_model_info...")
        try:
            result = {
                "is_loaded": self.is_loaded,
                "model_type": "XGB+KMeans" if self.model_xgb else None,
                "scaler_type": "StandardScaler" if self.scaler else None,
                "executor_workers": self.executor._max_workers,
                "external_api_url": self.api_url,
            }
            logger.debug("[MLEngineService] Successfully completed get_model_info.")
            return result
        except Exception as e:
            logger.error(f"[MLEngineService] Unexpected error in get_model_info: {e}")
            return {}


ml_engine_12leads = MLEngineService()
