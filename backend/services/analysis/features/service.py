import numpy as np
import pandas as pd
import math
from typing import Dict, Tuple, Optional

from ..signal import signal_processor
from utils import logger, SAMPLING_RATE


class FeatureExtractor:

    def __init__(self, sampling_rate: int = SAMPLING_RATE):
        self.sampling_rate = sampling_rate

    def extract_features(
        self,
        lead_i: np.ndarray,
        lead_ii: np.ndarray,
        lead_v1: np.ndarray,
        sampling_rate: Optional[int] = None,
    ) -> Dict[str, float]:

        s_rate = sampling_rate or self.sampling_rate

        features = {
            "rr_avg": 0.0,
            "pr_avg": 0.0,
            "qs_avg": 0.0,
            "qtc_avg": 0.0,
            "st_avg": 0.0,
            "rs_ratio": 0.0,
            "bpm": 0.0,
        }

        lead_ii_features = self._extract_lead_ii_features(lead_ii, s_rate)
        features.update(lead_ii_features)

        st_avg = self._extract_st_segment(lead_i, s_rate)
        features["st_avg"] = st_avg

        rs_ratio = self._extract_rs_ratio(lead_v1, s_rate)
        features["rs_ratio"] = rs_ratio

        return features

    def _extract_lead_ii_features(
        self, signal: np.ndarray, sampling_rate: int
    ) -> Dict[str, float]:

        features = {
            "rr_avg": 0.0,
            "pr_avg": 0.0,
            "qs_avg": 0.0,
            "qtc_avg": 0.0,
            "bpm": 0.0,
        }

        try:

            filtered = signal_processor.apply_filters(signal, sampling_rate)

            rpeaks, waves = signal_processor.detect_peaks(filtered, sampling_rate)

            rpeaks_corr, waves_corr = signal_processor.correct_peaks(
                rpeaks, waves, filtered
            )

            if len(rpeaks_corr.get("ECG_R_Peaks", [])) == 0:
                return features

            rr_avg, bpm = self._calculate_rr_and_bpm(rpeaks_corr, sampling_rate)
            features["rr_avg"] = rr_avg
            features["bpm"] = bpm

            features["pr_avg"] = self._calculate_pr_interval(waves_corr, sampling_rate)

            features["qs_avg"] = self._calculate_qs_interval(waves_corr, sampling_rate)

            qt_avg, qtc_avg = self._calculate_qt_intervals(
                waves_corr, rr_avg, sampling_rate
            )
            features["qtc_avg"] = qtc_avg

            return features

        except Exception as e:
            logger.error(f"[FeatureExtractor] Lead II extraction failed: {e}")
            return features

    def _calculate_rr_and_bpm(
        self, rpeaks: dict, sampling_rate: int
    ) -> Tuple[float, float]:

        r_peaks_arr = rpeaks.get("ECG_R_Peaks", [])

        if len(r_peaks_arr) < 2:
            return 0.0, 0.0

        rr_intervals = np.diff(r_peaks_arr) / sampling_rate * 1000.0
        rr_avg = float(np.mean(rr_intervals))

        bpm = 60000.0 / rr_avg if rr_avg > 0 else 0.0

        return rr_avg, bpm

    def _calculate_pr_interval(self, waves: dict, sampling_rate: int) -> float:

        p_onsets = waves.get("ECG_P_Onsets", [])
        r_onsets = waves.get("ECG_R_Onsets", [])
        q_peaks = waves.get("ECG_Q_Peaks", [])

        if len(p_onsets) == 0 or (len(r_onsets) == 0 and len(q_peaks) == 0):
            return 0.0

        min_len = min(len(p_onsets), len(r_onsets), len(q_peaks))
        pr_intervals = []
        for i in range(min_len - 1):
            if r_onsets[i] < p_onsets[i]:
                pr_samples = q_peaks[i] - p_onsets[i]
            else:
                pr_samples = r_onsets[i] - p_onsets[i]

            pr_ms = (pr_samples / sampling_rate) * 1000.0
            pr_intervals.append(pr_ms)

        return (
            float(np.mean([x for x in pr_intervals if not pd.isna(x)]))
            if pr_intervals
            else 0.0
        )

    def _calculate_qs_interval(self, waves: dict, sampling_rate: int) -> float:

        q_peaks = waves.get("ECG_Q_Peaks", [])
        s_peaks = waves.get("ECG_S_Peaks", [])

        if len(q_peaks) == 0 or len(s_peaks) == 0:
            return 0.0

        min_len = min(len(q_peaks), len(s_peaks))
        qs_intervals = []
        for i in range(min_len - 1):
            if s_peaks[i] < q_peaks[i] and (i + 1) < len(s_peaks):
                qs_samples = s_peaks[i + 1] - q_peaks[i]
            else:
                qs_samples = s_peaks[i] - q_peaks[i]

            qs_ms = (qs_samples / sampling_rate) * 1000.0
            qs_intervals.append(qs_ms)

        return (
            float(np.mean([x for x in qs_intervals if not pd.isna(x)]))
            if qs_intervals
            else 0.0
        )

    def _calculate_qt_intervals(
        self, waves: dict, rr_avg: float, sampling_rate: int
    ) -> Tuple[float, float]:

        r_onsets = waves.get("ECG_R_Onsets", [])
        t_offsets = waves.get("ECG_T_Offsets", [])

        if len(r_onsets) == 0 or len(t_offsets) == 0:
            return 0.0, 0.0

        min_len = min(len(r_onsets), len(t_offsets))
        qt_intervals = []
        for i in range(min_len - 1):
            if t_offsets[i] < r_onsets[i] and (i + 1) < len(t_offsets):
                qt_samples = t_offsets[i + 1] - r_onsets[i]
            else:
                qt_samples = t_offsets[i] - r_onsets[i]

            qt_ms = (qt_samples / sampling_rate) * 1000.0
            qt_intervals.append(qt_ms)

        if not qt_intervals:
            return 0.0, 0.0

        qt_avg = float(np.mean([x for x in qt_intervals if not pd.isna(x)]))
        qtc_avg = 0.0
        if rr_avg > 0:
            rr_seconds = rr_avg / 1000.0
            qtc_avg = qt_avg / math.sqrt(rr_seconds)

        return qt_avg, qtc_avg

    def _extract_st_segment(self, signal: np.ndarray, sampling_rate: int) -> float:

        try:
            filtered = signal_processor.apply_filters(signal, sampling_rate)
            rpeaks, waves = signal_processor.detect_peaks(filtered, sampling_rate)

            r_offsets = waves.get("ECG_R_Offsets", [])
            t_offsets = waves.get("ECG_T_Offsets", [])

            if len(r_offsets) == 0 or len(t_offsets) == 0:
                return 0.0

            min_len = min(len(r_offsets), len(t_offsets))
            st_intervals = []
            for i in range(min_len - 1):
                if t_offsets[i] < r_offsets[i] and (i + 1) < len(t_offsets):
                    st_samples = t_offsets[i + 1] - r_offsets[i]
                else:
                    st_samples = t_offsets[i] - r_offsets[i]

                st_ms = (st_samples / sampling_rate) * 1000.0
                st_intervals.append(st_ms)

            return (
                float(np.mean([x for x in st_intervals if not pd.isna(x)]))
                if st_intervals
                else 0.0
            )

        except Exception as e:
            logger.debug(f"[FeatureExtractor] ST segment extraction failed: {e}")
            return 0.0

    def _extract_rs_ratio(self, signal: np.ndarray, sampling_rate: int) -> float:

        try:
            filtered = signal_processor.apply_filters(signal, sampling_rate)
            rpeaks, waves = signal_processor.detect_peaks(filtered, sampling_rate)

            if (
                "ECG_S_Peaks" in waves.keys()
                and len(rpeaks.get("ECG_R_Peaks", [])) > 0
                and len(waves.get("ECG_S_Peaks", [])) > 0
            ):

                r_amplitudes = [
                    filtered[int(i)]
                    for i in rpeaks["ECG_R_Peaks"]
                    if int(i) < len(filtered)
                ]
                s_amplitudes = [
                    filtered[int(i)]
                    for i in waves["ECG_S_Peaks"]
                    if not pd.isna(i) and int(i) < len(filtered)
                ]

                if not r_amplitudes or not s_amplitudes:
                    return 0.0

                avg_r = np.mean(r_amplitudes)
                avg_s = np.mean(s_amplitudes)

                if abs(avg_s) > 1e-9:
                    return float(avg_r / abs(avg_s))

            return 0.0

        except Exception as e:
            logger.debug(f"[FeatureExtractor] R/S ratio extraction failed: {e}")
            return 0.0

    def features_to_array(self, features: Dict[str, float]) -> np.ndarray:

        return np.array(
            [
                features["rr_avg"],
                features["pr_avg"],
                features["qs_avg"],
                features["qtc_avg"],
                features["st_avg"],
                features["rs_ratio"],
                features["bpm"],
            ]
        ).reshape(1, -1)

    def validate_features(self, features: Dict[str, float]) -> bool:

        if not (30 <= features["bpm"] <= 200):
            return False

        if not (300 <= features["rr_avg"] <= 2000):
            return False

        if features["pr_avg"] > 0 and not (50 <= features["pr_avg"] <= 400):
            return False

        if features["qtc_avg"] > 0 and not (250 <= features["qtc_avg"] <= 700):
            return False

        return True


feature_extractor = FeatureExtractor()
