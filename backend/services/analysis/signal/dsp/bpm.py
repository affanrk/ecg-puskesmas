import scipy.signal
import numpy as np
import neurokit2 as nk
from typing import Optional


def calculate_bpm_fast(signal: np.ndarray, sampling_rate: int) -> Optional[float]:

    try:
        if len(signal) < (sampling_rate * 2):
            return None

        detrended = scipy.signal.detrend(signal)
        std_val = np.std(detrended)
        if std_val < 0.001:
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
                return float(round(bpm))
        return 0.0
    except Exception:
        return 0.0
