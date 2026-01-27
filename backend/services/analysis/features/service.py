"""
Feature extraction service - extracted from ml_service.py
Handles ECG feature calculation for ML model input.
Separated from ML logic for better maintainability.
"""
import numpy as np
import pandas as pd
import math
from typing import Dict, Tuple

from ..signal import signal_processor
from utils import logger, SAMPLING_RATE


class FeatureExtractor:
    """
    Extracts ECG features from multi-lead recordings.
    Calculates intervals, amplitudes, and ratios for ML input.
    """
    
    def __init__(self, sampling_rate: int = SAMPLING_RATE):
        self.sampling_rate = sampling_rate
        
    # ========================================================================
    # MAIN FEATURE EXTRACTION
    # ========================================================================
    
    def extract_features(
        self,
        lead_i: np.ndarray,
        lead_ii: np.ndarray,
        lead_v1: np.ndarray
    ) -> Dict[str, float]:
        """
        Extract all features from 3-lead ECG data.
        
        Args:
            lead_i: Lead I signal
            lead_ii: Lead II signal
            lead_v1: Lead V1 signal
            
        Returns:
            Dictionary with feature names and values
        """
        features = {
            'rr_avg': 0.0,
            'pr_avg': 0.0,
            'qs_avg': 0.0,
            'qtc_avg': 0.0,
            'st_avg': 0.0,
            'rs_ratio': 0.0,
            'bpm': 0.0
        }
        
        # Extract Lead II features (primary lead for intervals)
        lead_ii_features = self._extract_lead_ii_features(lead_ii)
        features.update(lead_ii_features)
        
        # Extract Lead I features (ST segment)
        st_avg = self._extract_st_segment(lead_i)
        features['st_avg'] = st_avg
        
        # Extract Lead V1 features (R/S ratio)
        rs_ratio = self._extract_rs_ratio(lead_v1)
        features['rs_ratio'] = rs_ratio
        
        return features
        
    # ========================================================================
    # LEAD II FEATURES (Main intervals & BPM)
    # ========================================================================
    
    def _extract_lead_ii_features(
        self,
        signal: np.ndarray
    ) -> Dict[str, float]:
        """
        Extract comprehensive features from Lead II.
        Includes RR, PR, QS, QT, QTc, and BPM.
        """
        features = {
            'rr_avg': 0.0,
            'pr_avg': 0.0,
            'qs_avg': 0.0,
            'qtc_avg': 0.0,
            'bpm': 0.0
        }
        
        try:
            # Apply filters
            filtered = signal_processor.apply_filters(signal)
            
            # Detect peaks
            rpeaks, waves = signal_processor.detect_peaks(filtered)
            
            # Correct peaks
            rpeaks_corr, waves_corr = signal_processor.correct_peaks(
                rpeaks, waves, filtered
            )
            
            if len(rpeaks_corr.get('ECG_R_Peaks', [])) == 0:
                return features
                
            # Calculate RR interval and BPM
            rr_avg, bpm = self._calculate_rr_and_bpm(rpeaks_corr)
            features['rr_avg'] = rr_avg
            features['bpm'] = bpm
            
            # Calculate PR interval
            features['pr_avg'] = self._calculate_pr_interval(waves_corr)
            
            # Calculate QS interval
            features['qs_avg'] = self._calculate_qs_interval(waves_corr)
            
            # Calculate QT and QTc intervals
            qt_avg, qtc_avg = self._calculate_qt_intervals(
                waves_corr, rr_avg
            )
            features['qtc_avg'] = qtc_avg
            
            return features
            
        except Exception as e:
            logger.error(f"[FeatureExtractor] Lead II extraction failed: {e}")
            return features
            
    def _calculate_rr_and_bpm(
        self,
        rpeaks: dict
    ) -> Tuple[float, float]:
        """
        Calculate RR interval (ms) and heart rate (BPM).
        """
        r_peaks_arr = rpeaks.get('ECG_R_Peaks', [])
        
        if len(r_peaks_arr) < 2:
            return 0.0, 0.0
            
        # Calculate RR intervals in milliseconds
        rr_intervals = np.diff(r_peaks_arr) / self.sampling_rate * 1000.0
        rr_avg = float(np.mean(rr_intervals))
        
        # Calculate BPM
        bpm = 60000.0 / rr_avg if rr_avg > 0 else 0.0
        
        return rr_avg, bpm
        
    def _calculate_pr_interval(self, waves: dict) -> float:
        """
        Calculate PR interval (P-onset to R-onset).
        Represents atrial depolarization to ventricular activation.
        """
        p_onsets = waves.get('ECG_P_Onsets', [])
        r_onsets = waves.get('ECG_R_Onsets', [])
        
        if len(p_onsets) == 0 or len(r_onsets) == 0:
            return 0.0
            
        min_len = min(len(p_onsets), len(r_onsets))
        
        pr_intervals = []
        for i in range(min_len):
            if r_onsets[i] > p_onsets[i]:
                pr_ms = (r_onsets[i] - p_onsets[i]) / self.sampling_rate * 1000.0
                pr_intervals.append(pr_ms)
                
        return float(np.mean(pr_intervals)) if pr_intervals else 0.0
        
    def _calculate_qs_interval(self, waves: dict) -> float:
        """
        Calculate QS interval (Q-peak to S-peak).
        Represents ventricular depolarization duration.
        """
        q_peaks = waves.get('ECG_Q_Peaks', [])
        s_peaks = waves.get('ECG_S_Peaks', [])
        
        if len(q_peaks) == 0 or len(s_peaks) == 0:
            return 0.0
            
        min_len = min(len(q_peaks), len(s_peaks))
        
        qs_intervals = []
        for i in range(min_len):
            duration_samples = s_peaks[i] - q_peaks[i]
            
            # Sanity check: QS should be positive and < 200ms
            if 0 < duration_samples < (0.2 * self.sampling_rate):
                qs_ms = duration_samples / self.sampling_rate * 1000.0
                qs_intervals.append(qs_ms)
                
        return float(np.mean(qs_intervals)) if qs_intervals else 0.0
        
    def _calculate_qt_intervals(
        self,
        waves: dict,
        rr_avg: float
    ) -> Tuple[float, float]:
        """
        Calculate QT and QTc (corrected QT) intervals.
        QTc uses Bazett's formula: QTc = QT / sqrt(RR in seconds)
        """
        r_onsets = waves.get('ECG_R_Onsets', [])
        t_offsets = waves.get('ECG_T_Offsets', [])
        
        if len(r_onsets) == 0 or len(t_offsets) == 0:
            return 0.0, 0.0
            
        min_len = min(len(r_onsets), len(t_offsets))
        
        qt_intervals = []
        for i in range(min_len):
            if t_offsets[i] > r_onsets[i]:
                qt_ms = (t_offsets[i] - r_onsets[i]) / self.sampling_rate * 1000.0
                qt_intervals.append(qt_ms)
                
        if not qt_intervals:
            return 0.0, 0.0
            
        qt_avg = float(np.mean(qt_intervals))
        
        # Calculate QTc using Bazett's formula
        qtc_avg = 0.0
        if rr_avg > 0:
            rr_seconds = rr_avg / 1000.0
            qtc_avg = qt_avg / math.sqrt(rr_seconds)
            
        return qt_avg, qtc_avg
        
    # ========================================================================
    # LEAD I FEATURES (ST Segment)
    # ========================================================================
    
    def _extract_st_segment(self, signal: np.ndarray) -> float:
        """
        Extract ST segment duration from Lead I.
        Measured from R-offset to T-offset.
        """
        try:
            filtered = signal_processor.apply_filters(signal)
            rpeaks, waves = signal_processor.detect_peaks(filtered)
            
            r_offsets = waves.get('ECG_R_Offsets', [])
            t_offsets = waves.get('ECG_T_Offsets', [])
            
            if len(r_offsets) == 0 or len(t_offsets) == 0:
                return 0.0
                
            min_len = min(len(r_offsets), len(t_offsets))
            
            st_intervals = []
            for i in range(min_len):
                if t_offsets[i] > r_offsets[i]:
                    st_ms = (t_offsets[i] - r_offsets[i]) / self.sampling_rate * 1000.0
                    st_intervals.append(st_ms)
                    
            return float(np.mean(st_intervals)) if st_intervals else 0.0
            
        except Exception as e:
            logger.debug(f"[FeatureExtractor] ST segment extraction failed: {e}")
            return 0.0
            
    # ========================================================================
    # LEAD V1 FEATURES (R/S Ratio)
    # ========================================================================
    
    def _extract_rs_ratio(self, signal: np.ndarray) -> float:
        """
        Extract R/S amplitude ratio from Lead V1.
        Important for ventricular hypertrophy detection.
        """
        try:
            filtered = signal_processor.apply_filters(signal)
            rpeaks, waves = signal_processor.detect_peaks(filtered)
            
            r_peaks_arr = rpeaks.get('ECG_R_Peaks', [])
            s_peaks_arr = waves.get('ECG_S_Peaks', [])
            
            if len(r_peaks_arr) == 0 or len(s_peaks_arr) == 0:
                return 0.0
                
            # Get amplitudes
            r_amplitudes = [
                filtered[p] for p in r_peaks_arr 
                if p < len(filtered)
            ]
            
            s_amplitudes = [
                filtered[p] for p in s_peaks_arr 
                if not pd.isna(p) and int(p) < len(filtered)
            ]
            
            if not r_amplitudes or not s_amplitudes:
                return 0.0
                
            avg_r = np.mean(r_amplitudes)
            avg_s = abs(np.mean(s_amplitudes))
            
            # Avoid division by zero
            if avg_s < 1e-6:
                return 0.0
                
            return float(avg_r / avg_s)
            
        except Exception as e:
            logger.debug(f"[FeatureExtractor] R/S ratio extraction failed: {e}")
            return 0.0
            
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def features_to_array(self, features: Dict[str, float]) -> np.ndarray:
        """
        Convert feature dictionary to numpy array for ML model.
        Order matches model training: [RR, PR, QS, QTc, ST, RS_ratio, BPM]
        """
        return np.array([
            features['rr_avg'],
            features['pr_avg'],
            features['qs_avg'],
            features['qtc_avg'],
            features['st_avg'],
            features['rs_ratio'],
            features['bpm']
        ]).reshape(1, -1)
        
    def validate_features(self, features: Dict[str, float]) -> bool:
        """
        Validate that extracted features are within reasonable ranges.
        Returns True if features are valid.
        """
        # BPM range: 30-200
        if not (30 <= features['bpm'] <= 200):
            return False
            
        # RR interval: 300-2000 ms (corresponds to 30-200 BPM)
        if not (300 <= features['rr_avg'] <= 2000):
            return False
            
        # PR interval: 120-200 ms (normal range)
        # Allow 0 for missing data
        if features['pr_avg'] > 0 and not (50 <= features['pr_avg'] <= 400):
            return False
            
        # QTc interval: typically 350-450 ms
        # Allow 0 for missing data
        if features['qtc_avg'] > 0 and not (250 <= features['qtc_avg'] <= 700):
            return False
            
        return True


# Global singleton instance
feature_extractor = FeatureExtractor()
