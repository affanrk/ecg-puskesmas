import scipy.signal
import numpy as np
import neurokit2 as nk
from typing import Optional


from utils import logger


def calculate_bpm_fast(signal: np.ndarray, sampling_rate: int) -> Optional[float]:
    logger.debug("[DSP-BPM] Starting calculate_bpm_fast...")
    try:
        if len(signal) < (sampling_rate * 2):
            logger.debug("[DSP-BPM] Signal too short for BPM calculation.")
            return None

        detrended = scipy.signal.detrend(signal)
        std_val = np.std(detrended)
        if std_val < 0.001:
            logger.debug("[DSP-BPM] Signal standard deviation too low.")
            return 0.0

        signal_norm = (detrended - np.mean(detrended)) / std_val

        try:
            _, info = nk.ecg_peaks(
                signal_norm, sampling_rate=sampling_rate, method="pantompkins1985"
            )
            r_peaks = info["ECG_R_Peaks"]
        except Exception:
            r_peaks, _ = scipy.signal.find_peaks(
                signal_norm, height=1.0, distance=int(sampling_rate * 0.25)
            )

        if len(r_peaks) > 2:
            rr_intervals = np.diff(r_peaks) / sampling_rate
            avg_rr = np.median(rr_intervals)
            if avg_rr > 0:
                bpm = 60.0 / avg_rr
                logger.debug("[DSP-BPM] Successfully completed calculate_bpm_fast.")
                return float(round(bpm))

        logger.debug("[DSP-BPM] Not enough R-peaks found.")
        return 0.0
    except Exception as e:
        logger.error(f"[DSP-BPM] Unexpected error in calculate_bpm_fast: {e}")
        return 0.0
