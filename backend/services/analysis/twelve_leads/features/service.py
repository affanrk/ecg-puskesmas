import numpy as np
import math
import scipy.signal
import neurokit2 as nk
from typing import Dict, Optional

from ..signal.dsp.filters import (
    desaturate_edges,
    despike_hampel,
    apply_iec_diagnostic_filter,
    wavelet_denoise,
)
from core.exceptions.definitions import AppException
from utils import logger, SAMPLING_RATE

LEAD_KEYS_STRING = [
    "i",
    "ii",
    "iii",
    "avr",
    "avl",
    "avf",
    "v1",
    "v2",
    "v3",
    "v4",
    "v5",
    "v6",
]


class FeatureExtractor:

    def __init__(self, sampling_rate: int = SAMPLING_RATE):
        self.sampling_rate = sampling_rate

    def _qrs_ms_from_Ronset_Roffset(
        self, beat_index, anchor_sample, waves_dwt, rpeaks, Fs
    ):
        logger.debug("[FeatureExtractor] Starting _qrs_ms_from_Ronset_Roffset...")
        try:
            rpeaks_arr = np.array(
                [x for x in rpeaks["ECG_R_Peaks"] if not np.isnan(x)], dtype=int
            )
            r_onsets = np.array(
                [x for x in waves_dwt.get("ECG_R_Onsets", []) if not np.isnan(x)],
                dtype=int,
            )
            r_offsets = np.array(
                [x for x in waves_dwt.get("ECG_R_Offsets", []) if not np.isnan(x)],
                dtype=int,
            )
            if len(rpeaks_arr) == 0 or len(r_onsets) == 0 or len(r_offsets) == 0:
                return None
            j = (
                int(np.argmin(np.abs(rpeaks_arr - int(anchor_sample))))
                if anchor_sample is not None
                else min(max(0, beat_index), len(rpeaks_arr) - 1)
            )
            rp = rpeaks_arr[j]
            onset_candidates, offset_candidates = (
                r_onsets[r_onsets <= rp],
                r_offsets[r_offsets >= rp],
            )
            if len(onset_candidates) == 0 or len(offset_candidates) == 0:
                return None
            onset, offset = int(onset_candidates.max()), int(offset_candidates.min())
            if offset <= onset:
                return None
            result = ((offset - onset) / Fs) * 1000.0
            logger.debug(
                "[FeatureExtractor] Successfully completed _qrs_ms_from_Ronset_Roffset."
            )
            return result
        except Exception as e:
            logger.error(
                f"[FeatureExtractor] Unexpected error in _qrs_ms_from_Ronset_Roffset: {e}"
            )
            return None

    def _qt_last_resort_pairing(
        self, R_onsets, T_marks, Fs, rr_ms=None, min_abs_ms=160.0, max_abs_ms=600.0
    ):
        logger.debug("[FeatureExtractor] Starting _qt_last_resort_pairing...")
        try:
            R, T = np.asarray(R_onsets, dtype=float), np.asarray(T_marks, dtype=float)
            R, T = R[~np.isnan(R)], T[~np.isnan(T)]
            if len(R) == 0 or len(T) == 0:
                return [], np.nan
            lo, hi = (
                (max(min_abs_ms, 0.20 * rr_ms), min(max_abs_ms, 0.60 * rr_ms))
                if rr_ms is not None and np.isfinite(rr_ms)
                else (min_abs_ms, max_abs_ms)
            )
            qt_ms, j = [], 0
            for r in R:
                while j < len(T) and T[j] <= r:
                    j += 1
                if j >= len(T):
                    break
                dt_ms = (T[j] - r) * 1000.0 / Fs
                if lo <= dt_ms <= hi:
                    qt_ms.append(dt_ms)
                else:
                    jj = j + 1
                    while jj < len(T):
                        if lo <= ((T[jj] - r) * 1000.0 / Fs) <= hi:
                            qt_ms.append(((T[jj] - r) * 1000.0 / Fs))
                            j = jj
                            break
                        jj += 1
            result_list = qt_ms
            result_median = float(np.nanmedian(qt_ms)) if len(qt_ms) else np.nan
            logger.debug(
                "[FeatureExtractor] Successfully completed _qt_last_resort_pairing."
            )
            return result_list, result_median
        except Exception as e:
            logger.error(
                f"[FeatureExtractor] Unexpected error in _qt_last_resort_pairing: {e}"
            )
            return [], np.nan

    def extract_features(
        self,
        leads_data: Dict[str, np.ndarray],
        sampling_rate: Optional[int] = None,
    ) -> Dict[str, float]:
        logger.debug("[FeatureExtractor] Starting extract_features...")
        try:
            s_rate = sampling_rate or self.sampling_rate
            packed_data = {}

            VREF, GAIN, RESOLUTION = 2.42, 200, 24
            LSB_SIZE = VREF / (2**RESOLUTION - 1)

            def to_mV(adc):
                return adc * LSB_SIZE * 1000.0 / GAIN

            for lead in LEAD_KEYS_STRING:
                lead_lower = lead.lower()
                packed_data.update(
                    {
                        f"rr_{lead_lower}": 0.0,
                        f"rr_std_{lead_lower}": 0.0,
                        f"pr_{lead_lower}": 0.0,
                        f"qs_{lead_lower}": 0.0,
                        f"qtc_{lead_lower}": 0.0,
                        f"st_{lead_lower}": 0.0,
                        f"rs_ratio_{lead_lower}": 0.0,
                        f"heartrate_{lead_lower}": 0.0,
                    }
                )

            for lead_str in LEAD_KEYS_STRING:
                try:
                    ecg_adc = leads_data.get(lead_str)
                    if ecg_adc is None:
                        continue

                    ecg_adc = ecg_adc.astype(float)
                    ecg_adc, _ = desaturate_edges(ecg_adc)
                    ecg_adc, _ = despike_hampel(ecg_adc, k=7, nsigma=6.0)

                    ecgmv = to_mV(ecg_adc)
                    detr_ecg = scipy.signal.detrend(ecgmv, type="constant")
                    iec_filtered_signal = apply_iec_diagnostic_filter(detr_ecg, s_rate)
                    y_filt = wavelet_denoise(
                        iec_filtered_signal, s_rate, wavelet_name="sym6"
                    )

                    (
                        RR_avg,
                        RR_stdev,
                        PR_avg,
                        QS_avg,
                        QT_avg,
                        QTc_avg,
                        ST_avg,
                        RS_ratio,
                        bpm,
                    ) = (0.0,) * 9
                    RR_list = []

                    try:
                        _, rpeaks = nk.ecg_peaks(y_filt, sampling_rate=s_rate)
                        _, waves_dwt = nk.ecg_delineate(
                            y_filt, rpeaks, sampling_rate=s_rate, method="dwt"
                        )
                    except Exception as e:
                        logger.warning(
                            f"[FeatureExtractor] nk.ecg_peaks/delineate failed for {lead_str}: {e}"
                        )
                        continue

                    if len(rpeaks["ECG_R_Peaks"]) > 1:
                        RR_list = [
                            (
                                (
                                    rpeaks["ECG_R_Peaks"][i + 1]
                                    - rpeaks["ECG_R_Peaks"][i]
                                )
                                / s_rate
                            )
                            * 1000.0
                            for i in range(len(rpeaks["ECG_R_Peaks"]) - 1)
                        ]
                        if RR_list:
                            RR_avg, RR_stdev, bpm = (
                                np.mean(RR_list),
                                np.std(RR_list),
                                (
                                    60000 / np.mean(RR_list)
                                    if np.mean(RR_list) > 0
                                    else 0
                                ),
                            )
                    if (
                        "ECG_R_Onsets" in waves_dwt
                        and "ECG_P_Onsets" in waves_dwt
                        and len(waves_dwt["ECG_R_Onsets"]) > 1
                        and len(waves_dwt["ECG_P_Onsets"]) > 1
                    ):
                        pr_peak_list = [
                            (
                                (
                                    waves_dwt["ECG_R_Onsets"][i]
                                    - waves_dwt["ECG_P_Onsets"][i]
                                )
                                / s_rate
                            )
                            * 1000.0
                            for i in range(
                                min(
                                    len(waves_dwt["ECG_R_Onsets"]),
                                    len(waves_dwt["ECG_P_Onsets"]),
                                )
                            )
                        ]
                        if pr_peak_list:
                            PR_avg = np.mean([p for p in pr_peak_list if p > 0])
                    if (
                        "ECG_S_Peaks" in waves_dwt
                        and "ECG_Q_Peaks" in waves_dwt
                        and len(waves_dwt["ECG_S_Peaks"]) > 0
                        and len(waves_dwt["ECG_Q_Peaks"]) > 0
                    ):
                        qs_peak_list = []
                        for i in range(
                            min(
                                len(waves_dwt["ECG_S_Peaks"]),
                                len(waves_dwt["ECG_Q_Peaks"]),
                            )
                        ):
                            ms_dist = (
                                (
                                    waves_dwt["ECG_S_Peaks"][i]
                                    - waves_dwt["ECG_Q_Peaks"][i]
                                )
                                / s_rate
                            ) * 1000.0
                            if abs(ms_dist) < 1e-9:
                                q_i, s_i = (
                                    waves_dwt["ECG_Q_Peaks"][i],
                                    waves_dwt["ECG_S_Peaks"][i],
                                )
                                anchor = (
                                    float(
                                        np.nanmean(
                                            [v for v in [q_i, s_i] if not np.isnan(v)]
                                        )
                                    )
                                    if not (np.isnan(q_i) and np.isnan(s_i))
                                    else None
                                )
                                fallback_ms = self._qrs_ms_from_Ronset_Roffset(
                                    i, anchor, waves_dwt, rpeaks, s_rate
                                )
                                if fallback_ms:
                                    ms_dist = fallback_ms
                            qs_peak_list.append(ms_dist)
                        if qs_peak_list:
                            QS_avg = np.mean([q for q in qs_peak_list if q > 0])
                    if (
                        "ECG_T_Offsets" in waves_dwt
                        and "ECG_R_Onsets" in waves_dwt
                        and len(waves_dwt["ECG_T_Offsets"]) > 0
                        and len(waves_dwt["ECG_R_Onsets"]) > 0
                    ):
                        qt_peak_list = [
                            (
                                (
                                    waves_dwt["ECG_T_Offsets"][i]
                                    - waves_dwt["ECG_R_Onsets"][i]
                                )
                                / s_rate
                            )
                            * 1000.0
                            for i in range(
                                min(
                                    len(waves_dwt["ECG_T_Offsets"]),
                                    len(waves_dwt["ECG_R_Onsets"]),
                                )
                            )
                        ]
                        if qt_peak_list:
                            QT_avg = np.mean([q for q in qt_peak_list if q > 0])
                        if QT_avg > 0 and RR_avg > 0:
                            QTc_avg = QT_avg / math.sqrt(RR_avg / 1000.0)
                    if not (QTc_avg > 0):
                        rr_ms_mean = RR_avg if RR_avg > 0 else None
                        _, qt_avg_fb = self._qt_last_resort_pairing(
                            waves_dwt.get("ECG_R_Onsets", []),
                            waves_dwt.get("ECG_T_Offsets", []),
                            s_rate,
                            rr_ms=rr_ms_mean,
                        )
                        if not np.isfinite(qt_avg_fb):
                            _, qt_avg_fb = self._qt_last_resort_pairing(
                                waves_dwt.get("ECG_R_Onsets", []),
                                waves_dwt.get("ECG_T_Peaks", []),
                                s_rate,
                                rr_ms=rr_ms_mean,
                            )
                        if np.isfinite(qt_avg_fb):
                            QT_avg, QTc_avg = (
                                float(qt_avg_fb),
                                (
                                    float(qt_avg_fb) / math.sqrt(rr_ms_mean / 1000.0)
                                    if rr_ms_mean
                                    else 0
                                ),
                            )
                    if (
                        "ECG_T_Onsets" in waves_dwt
                        and "ECG_R_Offsets" in waves_dwt
                        and len(waves_dwt["ECG_T_Onsets"]) > 0
                        and len(waves_dwt["ECG_R_Offsets"]) > 0
                    ):
                        st_peak_list = [
                            (
                                (
                                    waves_dwt["ECG_T_Onsets"][i]
                                    - waves_dwt["ECG_R_Offsets"][i]
                                )
                                / s_rate
                            )
                            * 1000.0
                            for i in range(
                                min(
                                    len(waves_dwt["ECG_T_Onsets"]),
                                    len(waves_dwt["ECG_R_Offsets"]),
                                )
                            )
                        ]
                        if st_peak_list:
                            ST_avg = np.mean([s for s in st_peak_list if s > 0])
                    r_peaks_clean = np.array(
                        [p for p in rpeaks["ECG_R_Peaks"] if not np.isnan(p)], dtype=int
                    )
                    s_peaks_clean = np.array(
                        [
                            p
                            for p in waves_dwt.get("ECG_S_Peaks", [])
                            if not np.isnan(p)
                        ],
                        dtype=int,
                    )
                    if len(r_peaks_clean) > 0 and len(s_peaks_clean) > 0:
                        R_mean_amp = np.mean([y_filt[i] for i in r_peaks_clean])
                        S_mean_amp = np.mean([y_filt[i] for i in s_peaks_clean])
                        if abs(S_mean_amp) > 1e-9:
                            RS_ratio = R_mean_amp / abs(S_mean_amp)

                    lead_lower = lead_str.lower()
                    packed_data.update(
                        {
                            f"rr_{lead_lower}": float(RR_avg),
                            f"rr_std_{lead_lower}": float(RR_stdev),
                            f"pr_{lead_lower}": float(PR_avg),
                            f"qs_{lead_lower}": float(QS_avg),
                            f"qtc_{lead_lower}": float(QTc_avg),
                            f"st_{lead_lower}": float(ST_avg),
                            f"rs_ratio_{lead_lower}": float(RS_ratio),
                            f"heartrate_{lead_lower}": float(bpm),
                        }
                    )
                except Exception as e_lead:
                    logger.error(
                        f"[FeatureExtractor] Failed to process lead {lead_str}: {e_lead}"
                    )

            logger.debug("[FeatureExtractor] Successfully completed extract_features.")
            return packed_data
        except AppException as e:
            raise e
        except Exception as e:
            logger.error(
                f"[FeatureExtractor] Unexpected error in extract_features: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def features_to_array(self, features: Dict[str, float]) -> np.ndarray:
        logger.debug("[FeatureExtractor] Starting features_to_array...")
        try:
            FEATURE_FAMILIES = [
                "rr",
                "rr_std",
                "pr",
                "qs",
                "qtc",
                "st",
                "rs_ratio",
                "heartrate",
            ]
            EXPECTED_FEATURES = [
                f"{fam}_{lead_key.lower()}"
                for lead_key in LEAD_KEYS_STRING
                for fam in FEATURE_FAMILIES
            ]

            arr = []
            for key in EXPECTED_FEATURES:
                arr.append(features.get(key, 0.0))

            logger.debug("[FeatureExtractor] Successfully completed features_to_array.")
            return np.array(arr).reshape(1, -1)
        except Exception as e:
            logger.error(
                f"[FeatureExtractor] Unexpected error in features_to_array: {e}"
            )
            raise AppException(status_code=500, message="Internal Service Error")

    def validate_features(self, features: Dict[str, float]) -> bool:
        logger.debug("[FeatureExtractor] Starting validate_features...")
        try:
            bpm = features.get("heartrate_ii", 0.0)
            rr_avg = features.get("rr_ii", 0.0)

            if not (30 <= bpm <= 200) and bpm != 0.0:
                return False
            if not (300 <= rr_avg <= 2000) and rr_avg != 0.0:
                return False

            logger.debug("[FeatureExtractor] Successfully completed validate_features.")
            return True
        except Exception as e:
            logger.error(
                f"[FeatureExtractor] Unexpected error in validate_features: {e}"
            )
            return False


feature_extractor_12leads = FeatureExtractor()
