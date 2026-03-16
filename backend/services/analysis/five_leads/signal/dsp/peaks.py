import numpy as np
import pandas as pd
import neurokit2 as nk
from typing import Tuple
from utils import logger


def detect_peaks(signal: np.ndarray, sampling_rate: int) -> Tuple[dict, dict]:
    logger.debug("[DSP] Starting detect_peaks...")
    rpeaks_info = {}
    waves_info = {}

    try:
        signal = np.nan_to_num(signal, nan=0.0, posinf=0.0, neginf=0.0)

        if np.ptp(signal) < 0.01:
            logger.debug("[DSP] Signal is flat or too weak. Skipping peak detection.")
            return {}, {}

        _, rpeaks_info = nk.ecg_peaks(signal, sampling_rate=sampling_rate)

        r_peaks = rpeaks_info.get("ECG_R_Peaks", [])
        if len(r_peaks) == 0:
            logger.debug("[DSP] No R-peaks detected.")
            return {}, {}

        r_peaks = _clean_array(r_peaks)
        r_peaks = np.array([x for x in r_peaks if 0 <= x < len(signal)])
        rpeaks_info["ECG_R_Peaks"] = r_peaks

        if len(r_peaks) < 3:
            logger.warning(
                f"[DSP] Too few R-peaks ({len(r_peaks)}) for reliable delineation."
            )
            return rpeaks_info, {}

        try:
            _, waves_info = nk.ecg_delineate(
                signal, rpeaks_info, sampling_rate=sampling_rate, method="dwt"
            )
        except Exception as e:
            logger.warning(
                f"[DSP] DWT delineation failed, retrying with 'peak' method: {e}"
            )
            try:
                _, waves_info = nk.ecg_delineate(
                    signal, rpeaks_info, sampling_rate=sampling_rate, method="peak"
                )
            except Exception as e2:
                logger.error(f"[DSP] Wave delineation failed (all methods): {e2}")
                return rpeaks_info, {}

        logger.debug("[DSP] Successfully completed detect_peaks.")
        return rpeaks_info, waves_info

    except Exception as e:
        logger.error(f"[DSP] Unexpected error in detect_peaks: {e}")
        return {}, {}


def correct_peaks(rpeaks: dict, waves: dict, signal: np.ndarray) -> Tuple[dict, dict]:
    logger.debug("[DSP] Starting correct_peaks...")
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
            logger.debug("[DSP] Successfully completed correct_peaks (No R-peaks).")
            return rpeaks_corr, waves_corr

        for key in wave_keys:
            if len(waves_corr[key]) == 0:
                logger.debug(
                    f"[DSP] Successfully completed correct_peaks (Empty {key})."
                )
                return rpeaks_corr, waves_corr

        rpeaks_corr, waves_corr = _correct_first_cycle(rpeaks_corr, waves_corr)

        if len(rpeaks_corr["ECG_R_Peaks"]) == 0:
            logger.debug(
                "[DSP] Successfully completed correct_peaks (No R-peaks after first cycle correction)."
            )
            return rpeaks_corr, waves_corr

        rpeaks_corr, waves_corr = _correct_last_cycle(rpeaks_corr, waves_corr)

        if len(rpeaks_corr["ECG_R_Peaks"]) > 1:
            rpeaks_corr, waves_corr = _remove_weak_peaks(
                rpeaks_corr, waves_corr, signal
            )

        logger.debug("[DSP] Successfully completed correct_peaks.")
        return rpeaks_corr, waves_corr

    except Exception as e:
        logger.error(f"[DSP] Unexpected error in correct_peaks: {e}")
        return rpeaks, waves


def _clean_array(arr) -> np.ndarray:
    logger.debug("[DSP] Starting _clean_array...")
    if arr is None:
        return np.array([], dtype=int)

    if isinstance(arr, (int, float, np.number)):
        arr = [arr]

    cleaned = []
    for x in arr:
        try:
            if pd.isna(x):
                continue

            val = float(x)
            if not np.isfinite(val):
                continue

            cleaned.append(int(val))
        except (ValueError, TypeError):
            continue

    result = np.array(cleaned, dtype=int)
    logger.debug("[DSP] Successfully completed _clean_array.")
    return result


def _correct_first_cycle(rpeaks: dict, waves: dict) -> Tuple[dict, dict]:
    logger.debug("[DSP] Starting _correct_first_cycle...")
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
    ]

    for key in wave_keys:
        if key not in waves:
            continue
        while len(waves[key]) > 0 and waves[key][0] < p_onset_first:
            waves[key] = np.delete(waves[key], 0)
            if len(waves[key]) == 0:
                break

    r_peak_first = rpeaks["ECG_R_Peaks"][0]
    extra_keys = [
        "ECG_R_Offsets",
        "ECG_T_Offsets",
        "ECG_T_Onsets",
        "ECG_S_Peaks",
        "ECG_T_Peaks",
    ]
    for key in extra_keys:
        if key in waves:
            while len(waves[key]) > 0 and waves[key][0] < r_peak_first:
                waves[key] = np.delete(waves[key], 0)
                if len(waves[key]) == 0:
                    break

    logger.debug("[DSP] Successfully completed _correct_first_cycle.")
    return rpeaks, waves


def _correct_last_cycle(rpeaks: dict, waves: dict) -> Tuple[dict, dict]:
    logger.debug("[DSP] Starting _correct_last_cycle...")
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
    ]

    for key in wave_keys:
        if key not in waves:
            continue
        while len(waves[key]) > 0 and waves[key][-1] > t_offset_last:
            waves[key] = np.delete(waves[key], -1)
            if len(waves[key]) == 0:
                break

    r_peak_last = rpeaks["ECG_R_Peaks"][-1]
    extra_keys = [
        "ECG_P_Peaks",
        "ECG_Q_Peaks",
        "ECG_P_Onsets",
        "ECG_P_Offsets",
        "ECG_R_Onsets",
    ]
    for key in extra_keys:
        if key in waves:
            while len(waves[key]) > 0 and waves[key][-1] > r_peak_last:
                waves[key] = np.delete(waves[key], -1)
                if len(waves[key]) == 0:
                    break

    logger.debug("[DSP] Successfully completed _correct_last_cycle.")
    return rpeaks, waves


def _remove_weak_peaks(
    rpeaks: dict, waves: dict, signal: np.ndarray
) -> Tuple[dict, dict]:
    logger.debug("[DSP] Starting _remove_weak_peaks...")
    if len(rpeaks["ECG_R_Peaks"]) < 2:
        return rpeaks, waves

    r_peaks_arr = rpeaks["ECG_R_Peaks"]
    first_amp = signal[r_peaks_arr[0]]
    second_amp = signal[r_peaks_arr[1]]

    if first_amp < second_amp / 2:
        rpeaks["ECG_R_Peaks"] = np.delete(rpeaks["ECG_R_Peaks"], 0)

        keys_to_trim = [
            "ECG_P_Peaks",
            "ECG_Q_Peaks",
            "ECG_S_Peaks",
            "ECG_T_Peaks",
            "ECG_R_Onsets",
            "ECG_R_Offsets",
            "ECG_P_Onsets",
            "ECG_P_Offsets",
            "ECG_T_Onsets",
            "ECG_T_Offsets",
        ]
        for key in keys_to_trim:
            if key in waves and len(waves[key]) > 0:
                waves[key] = np.delete(waves[key], 0)

    logger.debug("[DSP] Successfully completed _remove_weak_peaks.")
    return rpeaks, waves
