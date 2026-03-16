import scipy.signal
import numpy as np
from functools import lru_cache
from utils import logger


@lru_cache(maxsize=10)
def get_butterworth_coeffs(sampling_rate: int):
    return scipy.signal.butter(4, 0.6, "low")


@lru_cache(maxsize=10)
def get_kaiser_taps(sampling_rate: int):
    fsf = max(sampling_rate, 8.0)
    nyq_rate = fsf / 2
    width = 5.0 / nyq_rate
    ripple_db = 60.0
    order, beta = scipy.signal.kaiserord(ripple_db, width)
    if order % 2 == 0:
        order += 1
    return scipy.signal.firwin(
        order, 4.0 / nyq_rate, window=("kaiser", beta), pass_zero=False
    )


def apply_butterworth_filter(signal: np.ndarray, sampling_rate: int) -> np.ndarray:
    b, a = get_butterworth_coeffs(sampling_rate)
    return scipy.signal.filtfilt(b, a, signal)


def apply_fir_kaiser_filter(signal: np.ndarray, sampling_rate: int) -> np.ndarray:
    taps = get_kaiser_taps(sampling_rate)
    return scipy.signal.lfilter(taps, 1.0, signal)


def apply_filters(signal: np.ndarray, sampling_rate: int) -> np.ndarray:
    logger.debug("[DSP-Filters] Starting apply_filters...")
    try:
        signal = np.nan_to_num(signal, nan=0.0, posinf=0.0, neginf=0.0)

        detrended = scipy.signal.detrend(
            signal, axis=-1, type="linear", bp=0, overwrite_data=False
        )
        butter_filtered = apply_butterworth_filter(detrended, sampling_rate)
        result = apply_fir_kaiser_filter(butter_filtered, sampling_rate)
        logger.debug("[DSP-Filters] Successfully completed apply_filters.")
        return result
    except Exception as e:
        logger.error(f"[DSP-Filters] Filter application failed: {e}")
        return signal
