from typing import Optional, Tuple
import numpy as np
from utils import SAMPLING_RATE
from .dsp import apply_filters, detect_peaks, correct_peaks, calculate_bpm_fast


class SignalProcessor:
    def __init__(self, sampling_rate: int = SAMPLING_RATE):
        self.sampling_rate = sampling_rate

    def apply_filters(
        self, signal: np.ndarray, sampling_rate: Optional[int] = None
    ) -> np.ndarray:
        return apply_filters(signal, sampling_rate or self.sampling_rate)

    def detect_peaks(
        self, signal: np.ndarray, sampling_rate: Optional[int] = None
    ) -> Tuple[dict, dict]:
        return detect_peaks(signal, sampling_rate or self.sampling_rate)

    def correct_peaks(
        self, rpeaks: dict, waves: dict, signal: np.ndarray
    ) -> Tuple[dict, dict]:
        return correct_peaks(rpeaks, waves, signal)

    def calculate_bpm_fast(
        self, signal: np.ndarray, sampling_rate: Optional[int] = None
    ) -> Optional[float]:
        return calculate_bpm_fast(signal, sampling_rate or self.sampling_rate)


signal_processor = SignalProcessor()
