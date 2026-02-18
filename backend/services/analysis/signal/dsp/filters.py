import scipy.signal
import numpy as np
from utils import logger


def apply_butterworth_filter(signal: np.ndarray, sampling_rate: int) -> np.ndarray:

    b, a = scipy.signal.butter(4, 0.6, "low")
    return scipy.signal.filtfilt(b, a, signal)


def apply_fir_kaiser_filter(signal: np.ndarray, sampling_rate: int) -> np.ndarray:

    fsf = max(sampling_rate, 8.0)
    nyq_rate = fsf / 2
    width = 5.0 / nyq_rate
    ripple_db = 60.0

    order, beta = scipy.signal.kaiserord(ripple_db, width)
    if order % 2 == 0:
        order += 1

    taps = scipy.signal.firwin(
        order, 4.0 / nyq_rate, window=("kaiser", beta), pass_zero=False
    )
    return scipy.signal.lfilter(taps, 1.0, signal)


def apply_filters(signal: np.ndarray, sampling_rate: int) -> np.ndarray:

    try:
        signal = np.nan_to_num(signal, nan=0.0, posinf=0.0, neginf=0.0)

        detrended = scipy.signal.detrend(
            signal, axis=-1, type="linear", bp=0, overwrite_data=False
        )
        butter_filtered = apply_butterworth_filter(detrended, sampling_rate)
        return apply_fir_kaiser_filter(butter_filtered, sampling_rate)
    except Exception as e:
        logger.error(f"[DSP] Filter application failed: {e}")
        return signal
