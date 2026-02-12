import scipy.signal
import numpy as np
from utils import logger, BUTTER_ORDER, FIR_FILTER_CUTOFF, FIR_RIPPLE_DB


def apply_butterworth_filter(signal: np.ndarray, sampling_rate: int) -> np.ndarray:

    absolute_cutoff = 30.0
    fs = max(sampling_rate, absolute_cutoff * 2 + 2)
    b, a = scipy.signal.butter(BUTTER_ORDER, absolute_cutoff, "low", fs=fs)
    return scipy.signal.filtfilt(b, a, signal)


def apply_fir_kaiser_filter(signal: np.ndarray, sampling_rate: int) -> np.ndarray:

    fsf = max(sampling_rate, 2 * FIR_FILTER_CUTOFF + 2)
    nyq_rate = fsf / 2
    width = 5.0 / nyq_rate

    order, beta = scipy.signal.kaiserord(FIR_RIPPLE_DB, width)
    if order % 2 == 0:
        order += 1

    taps = scipy.signal.firwin(
        order, FIR_FILTER_CUTOFF / nyq_rate, window=("kaiser", beta), pass_zero=False
    )
    return scipy.signal.lfilter(taps, 1.0, signal)


def apply_filters(signal: np.ndarray, sampling_rate: int) -> np.ndarray:

    try:
        detrended = scipy.signal.detrend(
            signal, axis=-1, type="linear", bp=0, overwrite_data=False
        )
        butter_filtered = apply_butterworth_filter(detrended, sampling_rate)
        return apply_fir_kaiser_filter(butter_filtered, sampling_rate)
    except Exception as e:
        logger.error(f"[DSP] Filter application failed: {e}")
        return signal
