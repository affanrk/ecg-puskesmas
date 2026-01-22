"""
ML engine service - refactored from ml_service.py
Handles model loading, prediction, and analysis orchestration.
Now uses repositories and separated feature extraction.
"""
import os
import asyncio
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict
from sqlalchemy.orm import Session

from services.analysis.feature_extractor import feature_extractor
from services.device.state import device_state_manager
from repositories.session import SessionRepository, RawDataRepository
from core.database import SessionLocal
from core.config import settings
from core.exceptions import (
    InsufficientDataException,
    RecordingNotFoundException
)
from utils.constants import (
    MIN_SAMPLES_FOR_ANALYSIS,
    CLASS_INDEX_MAP,
    ECGClassification,
    WSMessageType,
    DEFAULT_MODEL_DIR,
    DEFAULT_SCALER_FILE,
    DEFAULT_MODEL_FILE
)
from utils.helpers import resolve_path
from utils.logger import logger


class MLEngineService:
    """
    Machine Learning engine for ECG classification.
    Handles model lifecycle and prediction orchestration.
    """
    
    def __init__(self, max_workers: int = 3):
        self.scaler = None
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.is_loaded = False
        
    # ========================================================================
    # MODEL LIFECYCLE
    # ========================================================================
    
    def load_model(self):
        """
        Load ML model and scaler from disk.
        Called during application startup.
        """
        try:
            # Lazy import to speed up initial app startup
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
                
            # Load scaler
            self.scaler = joblib.load(scaler_path)
            
            # Load Keras model
            self.model = tf.keras.models.load_model(model_path)
            
            self.is_loaded = True
            logger.info(
                f"[ML Engine] Model loaded successfully from {model_dir}"
            )
            
        except Exception as e:
            logger.error(f"[ML Engine] Failed to load model: {e}")
            self.is_loaded = False
            
    def shutdown(self):
        """
        Shutdown thread pool executor.
        Called during application shutdown.
        """
        logger.info("[ML Engine] Shutting down thread pool...")
        self.executor.shutdown(wait=False)
        logger.info("[ML Engine] Shutdown complete")
        
    # ========================================================================
    # ANALYSIS ORCHESTRATION
    # ========================================================================
    
    async def trigger_analysis(
        self,
        recording_id: str,
        subject_id: str,
        device_id: str
    ):
        """
        Trigger analysis for a completed recording segment.
        Runs in thread pool to avoid blocking event loop.
        
        Args:
            recording_id: Recording identifier
            subject_id: Patient identifier (NIK)
            device_id: Device identifier
        """
        try:
            logger.info(f"[ML Engine] Starting analysis for recording {recording_id} (Device: {device_id})")
            
            # Run analysis in thread pool
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._analyze_recording,
                recording_id,
                subject_id,
                device_id
            )
            
            # Broadcast result if successful
            if result:
                await self._broadcast_result(device_id, result)
        except Exception as e:
            logger.error(f"[ML Engine] trigger_analysis failed for {recording_id}: {e}")
            
    def _analyze_recording(
        self,
        recording_id: str,
        subject_id: str,
        device_id: str
    ) -> Optional[Dict]:
        """
        Synchronous analysis logic.
        Runs in thread pool executor.
        """
        db = SessionLocal()
        
        try:
            # 1. Fetch data
            raw_data = self._fetch_raw_data(db, recording_id)
            
            # 2. Extract features
            features = self._extract_features_from_data(raw_data)
            
            # 3. Make prediction
            classification, confidence = self._predict(features)
            
            # 4. Update database
            self._save_results(
                db,
                recording_id,
                classification,
                confidence,
                features
            )
            
            logger.info(
                f"[ML Engine] Analysis result for {recording_id}: {classification} "
                f"(BPM: {int(features['bpm'])}, Confidence: {confidence:.2%})"
            )
            
            return {
                "recording_id": recording_id,
                "device_id": device_id,
                "classification": classification,
                "confidence": confidence
            }
            
        except InsufficientDataException as e:
            logger.warning(f"[ML Engine] Insufficient data for {recording_id}: {e.message}")
            return None
        except Exception as e:
            logger.error(f"[ML Engine] Analysis failed for {recording_id}: {e}")
            return None
        finally:
            db.close()
            
    # ========================================================================
    # DATA FETCHING
    # ========================================================================
    
    def _fetch_raw_data(
        self,
        db: Session,
        recording_id: str
    ) -> pd.DataFrame:
        """
        Fetch and validate raw ECG data.
        
        Raises:
            RecordingNotFoundException: If recording not found
            InsufficientDataException: If not enough samples
        """
        raw_repo = RawDataRepository(db)
        
        rows = raw_repo.find_by_recording_id(recording_id)
        
        if not rows:
            raise RecordingNotFoundException(recording_id)
            
        if len(rows) < MIN_SAMPLES_FOR_ANALYSIS:
            raise InsufficientDataException(
                recording_id,
                samples=len(rows),
                required=MIN_SAMPLES_FOR_ANALYSIS
            )
            
        # Convert to DataFrame
        df = pd.DataFrame([{
            'lead_I': r.mv_lead_I,
            'lead_II': r.mv_lead_II,
            'v1': r.mv_v1
        } for r in rows])
        
        return df
        
    # ========================================================================
    # FEATURE EXTRACTION
    # ========================================================================
    
    def _extract_features_from_data(
        self,
        df: pd.DataFrame
    ) -> Dict[str, float]:
        """
        Extract ECG features from DataFrame.
        Uses FeatureExtractor service.
        """
        # Prepare signal arrays
        lead_i = df['lead_I'].fillna(0).values
        lead_ii = df['lead_II'].fillna(0).values
        lead_v1 = df['v1'].fillna(0).values
        
        # Extract features
        features = feature_extractor.extract_features(
            lead_i, lead_ii, lead_v1
        )
        
        return features
        
    # ========================================================================
    # PREDICTION
    # ========================================================================
    
    def _predict(
        self,
        features: Dict[str, float]
    ) -> tuple[str, float]:
        """
        Make classification prediction using ML model.
        
        Returns:
            Tuple of (classification, confidence)
        """
        if not self.is_loaded:
            logger.warning("[ML Engine] Model not loaded, returning Unknown")
            return ECGClassification.UNKNOWN.value, 0.0
            
        try:
            # Convert to array
            features_array = feature_extractor.features_to_array(features)
            
            # Handle NaN values
            features_array = np.nan_to_num(features_array)
            
            # Normalize using scaler
            normalized = self.scaler.transform(features_array)
            
            # Predict
            predictions = self.model.predict(normalized, verbose=0)
            
            # Get class and confidence
            class_idx = np.argmax(predictions.flatten()) + 1
            confidence = float(np.max(predictions))
            
            classification = CLASS_INDEX_MAP.get(
                class_idx,
                ECGClassification.UNKNOWN
            ).value
            
            return classification, confidence
            
        except Exception as e:
            logger.error(f"[ML Engine] Prediction failed: {e}")
            return ECGClassification.UNKNOWN.value, 0.0
            
    # ========================================================================
    # RESULT STORAGE
    # ========================================================================
    
    def _save_results(
        self,
        db: Session,
        recording_id: str,
        classification: str,
        confidence: float,
        features: Dict[str, float]
    ):
        """
        Save analysis results to database.
        """
        session_repo = SessionRepository(db)
        
        session_repo.update_analysis_results(
            recording_id=recording_id,
            classification=classification,
            confidence=confidence,
            features=features,
            analyzed_by="AI_ENGINE"
        )
        
    # ========================================================================
    # RESULT BROADCASTING
    # ========================================================================
    
    async def _broadcast_result(
        self,
        device_id: str,
        result: Dict
    ):
        """
        Broadcast analysis result to connected clients.
        """
        # Broadcast live result to device subscribers
        await device_state_manager.broadcast_to_device(
            device_id,
            WSMessageType.LIVE_RESULT.value,
            {
                "device_id": device_id,
                "recording_id": result["recording_id"],
                "classification": result["classification"],
                "confidence": result["confidence"],
                "changed_dt": datetime.now(timezone.utc).isoformat()
            }
        )
        
        # Broadcast history update to all clients
        await device_state_manager.broadcast_to_all({
            "type": WSMessageType.HISTORY_UPDATED.value
        })
        
    # ========================================================================
    # PUBLIC UTILITY METHODS
    # ========================================================================
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self.is_loaded
        
    def get_model_info(self) -> Dict:
        """Get model information for diagnostics"""
        return {
            "is_loaded": self.is_loaded,
            "model_type": "ANN" if self.model else None,
            "scaler_type": "StandardScaler" if self.scaler else None,
            "executor_workers": self.executor._max_workers
        }


# Global singleton instance
ml_engine_service = MLEngineService()