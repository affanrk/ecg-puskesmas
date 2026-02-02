import numpy as np
import pandas as pd
import neurokit2 as nk
from typing import Tuple
from utils import logger


def detect_peaks(signal: np.ndarray, sampling_rate: int) -> Tuple[dict, dict]:
    rpeaks_info = {}
    waves_info = {}

    # 1. Detect R-Peaks
    try:
        signals, rpeaks_info = nk.ecg_peaks(signal, sampling_rate=sampling_rate)

        if len(rpeaks_info.get("ECG_R_Peaks", [])) == 0:
            logger.warning("[DSP] No R-peaks detected.")
            return {}, {}

    except Exception as e:
        logger.error(f"[DSP] R-Peak detection failed: {e}")
        return {}, {}

    # 2. Delineate Waves (P, Q, S, T)
    try:
        # Try DWT first (standard, most accurate)
        signals, waves_info = nk.ecg_delineate(
            signal, rpeaks_info, sampling_rate=sampling_rate, method="dwt"
        )
    except Exception as e:
        logger.warning(
            f"[DSP] DWT delineation failed, retrying with 'peak' method: {e}"
        )
        try:
            # Fallback to 'peak' method (faster, uses local extrema)
            signals, waves_info = nk.ecg_delineate(
                signal, rpeaks_info, sampling_rate=sampling_rate, method="peak"
            )
        except Exception as e2:
            logger.error(f"[DSP] Wave delineation failed (all methods): {e2}")
            # Return at least R-peaks if waves fail, so BPM/RR can still be calculated
            return rpeaks_info, {}

    return rpeaks_info, waves_info


def correct_peaks(rpeaks: dict, waves: dict, signal: np.ndarray) -> Tuple[dict, dict]:
    """
    Correct detected peaks by removing artifacts.

    This complex logic handles:
    - Removing peaks before first P-onset
    - Removing peaks after last T-offset
    - Removing weak R-peaks (amplitude check)

    Args:
        rpeaks: R-peaks dictionary
        waves: Waves dictionary
        signal: Filtered signal for amplitude checking

    Returns:
        Tuple of (corrected_rpeaks, corrected_waves)
    """

    rpeaks_corr = rpeaks.copy()
    waves_corr = waves.copy()

    try:

        rpeaks_corr["ECG_R_Peaks"] = _clean_array(rpeaks_corr.get("ECG_R_Peaks", []))

        wave_keys = [
            "ECG_P_Peaks",
            "ECG_Q_Peaks",
            "ECG_S_Peaks",
            "ECG_T_Peaks",
            "ECG_P_Onsets",
            "ECG_P_Offsets",
            "ECG_R_Onsets",
            "ECG_R_Offsets",
            "ECG_T_Onsets",
            "ECG_T_Offsets",
        ]

        for key in wave_keys:
            waves_corr[key] = _clean_array(waves_corr.get(key, []))

        if len(rpeaks_corr["ECG_R_Peaks"]) == 0:
            return rpeaks_corr, waves_corr

        for key in wave_keys:
            if len(waves_corr[key]) == 0:
                return rpeaks_corr, waves_corr

        rpeaks_corr, waves_corr = _correct_first_cycle(rpeaks_corr, waves_corr)

        if len(rpeaks_corr["ECG_R_Peaks"]) == 0:
            return rpeaks_corr, waves_corr

        rpeaks_corr, waves_corr = _correct_last_cycle(rpeaks_corr, waves_corr)

        if len(rpeaks_corr["ECG_R_Peaks"]) > 1:
            rpeaks_corr, waves_corr = _remove_weak_peaks(
                rpeaks_corr, waves_corr, signal
            )

        return rpeaks_corr, waves_corr

    except Exception as e:
        logger.error(f"[SignalProcessor] Peak correction failed: {e}")
        return rpeaks, waves


def _clean_array(arr) -> np.ndarray:
    """Remove NaN/Inf values and convert to int array"""
    cleaned = []
    for x in arr:
        try:
            if pd.isna(x):
                continue
            if isinstance(x, (int, float, np.number)):
                if not np.isfinite(x):
                    continue
                cleaned.append(int(x))
        except Exception:
            continue

    return np.array(cleaned, dtype=int)


def _correct_first_cycle(rpeaks: dict, waves: dict) -> Tuple[dict, dict]:
    """Remove incomplete first cardiac cycle"""
    if len(waves["ECG_P_Onsets"]) == 0:
        return rpeaks, waves

    p_onset_first = waves["ECG_P_Onsets"][0]

    while len(rpeaks["ECG_R_Peaks"]) > 0 and rpeaks["ECG_R_Peaks"][0] < p_onset_first:
        rpeaks["ECG_R_Peaks"] = np.delete(rpeaks["ECG_R_Peaks"], 0)

    if len(rpeaks["ECG_R_Peaks"]) == 0:
        return rpeaks, waves

    wave_keys = [
        "ECG_P_Peaks",
        "ECG_Q_Peaks",
        "ECG_S_Peaks",
        "ECG_T_Peaks",
        "ECG_P_Offsets",
        "ECG_R_Offsets",
        "ECG_T_Offsets",
        "ECG_R_Onsets",
        "ECG_T_Onsets",
        "ECG_P_Onsets",
    ]

    for key in wave_keys:
        if key not in waves:
            continue
        while len(waves[key]) > 0 and waves[key][0] < p_onset_first:
            waves[key] = np.delete(waves[key], 0)
            if len(waves[key]) == 0:
                break

    return rpeaks, waves


def _correct_last_cycle(rpeaks: dict, waves: dict) -> Tuple[dict, dict]:
    """Remove incomplete last cardiac cycle"""
    if len(waves["ECG_T_Offsets"]) == 0:
        return rpeaks, waves

    t_offset_last = waves["ECG_T_Offsets"][-1]

    while len(rpeaks["ECG_R_Peaks"]) > 0 and rpeaks["ECG_R_Peaks"][-1] > t_offset_last:
        rpeaks["ECG_R_Peaks"] = np.delete(rpeaks["ECG_R_Peaks"], -1)

    if len(rpeaks["ECG_R_Peaks"]) == 0:
        return rpeaks, waves

    wave_keys = [
        "ECG_P_Peaks",
        "ECG_Q_Peaks",
        "ECG_S_Peaks",
        "ECG_T_Peaks",
        "ECG_P_Onsets",
        "ECG_T_Onsets",
        "ECG_R_Onsets",
        "ECG_P_Offsets",
        "ECG_R_Offsets",
        "ECG_T_Offsets",
    ]

    for key in wave_keys:
        if key not in waves:
            continue
        while len(waves[key]) > 0 and waves[key][-1] > t_offset_last:
            waves[key] = np.delete(waves[key], -1)
            if len(waves[key]) == 0:
                break

    return rpeaks, waves


def _remove_weak_peaks(
    rpeaks: dict, waves: dict, signal: np.ndarray
) -> Tuple[dict, dict]:
    """Remove R-peaks with insufficient amplitude"""
    if len(rpeaks["ECG_R_Peaks"]) < 2:
        return rpeaks, waves

    r_peaks_arr = rpeaks["ECG_R_Peaks"]
    first_amp = signal[r_peaks_arr[0]]
    second_amp = signal[r_peaks_arr[1]]

    if first_amp < second_amp / 2:
        rpeaks["ECG_R_Peaks"] = np.delete(r_peaks_arr, 0)

        for key in waves.keys():
            if len(waves[key]) > 0:
                waves[key] = np.delete(waves[key], 0)

    return rpeaks, waves
