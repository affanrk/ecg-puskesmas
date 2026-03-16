from typing import Optional, Tuple
import numpy as np
from core.exceptions.definitions import AppException
from utils import logger, SAMPLING_RATE
from .dsp import apply_filters, detect_peaks, correct_peaks, calculate_bpm_fast


class SignalProcessor:

    def __init__(self, sampling_rate: int = SAMPLING_RATE):
        self.sampling_rate = sampling_rate

    def apply_filters(
        self, signal: np.ndarray, sampling_rate: Optional[int] = None
    ) -> np.ndarray:
        logger.debug("[SignalProcessor] Starting apply_filters...")
        try:
            result = apply_filters(signal, sampling_rate or self.sampling_rate)
            logger.debug("[SignalProcessor] Successfully completed apply_filters.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[SignalProcessor] Unexpected error in apply_filters: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def detect_peaks(
        self, signal: np.ndarray, sampling_rate: Optional[int] = None
    ) -> Tuple[dict, dict]:
        logger.debug("[SignalProcessor] Starting detect_peaks...")
        try:
            result = detect_peaks(signal, sampling_rate or self.sampling_rate)
            logger.debug("[SignalProcessor] Successfully completed detect_peaks.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[SignalProcessor] Unexpected error in detect_peaks: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def correct_peaks(
        self, rpeaks: dict, waves: dict, signal: np.ndarray
    ) -> Tuple[dict, dict]:
        logger.debug("[SignalProcessor] Starting correct_peaks...")
        try:
            result = correct_peaks(rpeaks, waves, signal)
            logger.debug("[SignalProcessor] Successfully completed correct_peaks.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"[SignalProcessor] Unexpected error in correct_peaks: {e}")
            raise AppException(status_code=500, message="Internal Service Error")

    def calculate_bpm_fast(
        self, signal: np.ndarray, sampling_rate: Optional[int] = None
    ) -> Optional[float]:
        logger.debug("[SignalProcessor] Starting calculate_bpm_fast...")
        try:
            result = calculate_bpm_fast(signal, sampling_rate or self.sampling_rate)
            logger.debug("[SignalProcessor] Successfully completed calculate_bpm_fast.")
            return result
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[SignalProcessor] Unexpected error in calculate_bpm_fast: {e}"
            )
            return None


signal_processor_5leads = SignalProcessor()
