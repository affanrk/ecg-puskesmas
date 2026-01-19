# app/services/analysis/signal_processor.py
"""
Signal processing service - refactored from signal_processing.py
Handles DSP operations and ECG signal cleaning.
Pure functions for better testability.
"""
import scipy.signal
import numpy as np
import pandas as pd
import neurokit2 as nk
from typing import Dict, Tuple, Optional

from utils.constants import (
    SAMPLING_RATE,
    BUTTER_ORDER,
    BUTTER_CUTOFF,
    FIR_FILTER_CUTOFF,
    FIR_RIPPLE_DB
)
from utils.logger import logger


class SignalProcessor:
    """
    ECG signal processing utilities.
    Provides DSP filters and signal cleaning methods.
    """
    
    def __init__(self, sampling_rate: int = SAMPLING_RATE):
        self.sampling_rate = sampling_rate
        
    # ========================================================================
    # DSP FILTERS
    # ========================================================================
    
    def apply_filters(self, signal: np.ndarray) -> np.ndarray:
        """
        Apply complete DSP filter chain to ECG signal.
        
        Pipeline:
        1. Detrend (remove baseline drift)
        2. Butterworth lowpass (baseline wander removal)
        3. FIR Kaiser filter (high-frequency noise)
        
        Args:
            signal: Raw ECG signal array
            
        Returns:
            Filtered signal array
        """
        try:
            # 1. Detrend
            detrended = scipy.signal.detrend(
                signal,
                axis=-1,
                type='linear',
                bp=0,
                overwrite_data=False
            )
            
            # 2. Butterworth lowpass filter
            butter_filtered = self._apply_butterworth_filter(detrended)
            
            # 3. FIR Kaiser filter
            fir_filtered = self._apply_fir_kaiser_filter(butter_filtered)
            
            return fir_filtered
            
        except Exception as e:
            logger.error(f"[SignalProcessor] Filter application failed: {e}")
            return signal  # Return original if filtering fails
            
    def _apply_butterworth_filter(self, signal: np.ndarray) -> np.ndarray:
        """
        Apply Butterworth lowpass filter.
        Removes baseline wander.
        """
        b, a = scipy.signal.butter(BUTTER_ORDER, BUTTER_CUTOFF, 'low')
        return scipy.signal.filtfilt(b, a, signal)
        
    def _apply_fir_kaiser_filter(self, signal: np.ndarray) -> np.ndarray:
        """
        Apply FIR Kaiser window filter.
        Removes high-frequency noise while preserving ECG features.
        """
        # Ensure sampling rate is sufficient
        fsf = max(self.sampling_rate, 2 * FIR_FILTER_CUTOFF)
        nyq_rate = fsf / 2
        width = 5.0 / nyq_rate
        
        # Calculate filter order
        order, beta = scipy.signal.kaiserord(FIR_RIPPLE_DB, width)
        
        # Ensure odd order
        if order % 2 == 0:
            order += 1
            
        # Design filter
        taps = scipy.signal.firwin(
            order,
            FIR_FILTER_CUTOFF / nyq_rate,
            window=('kaiser', beta),
            pass_zero=False
        )
        
        # Apply filter
        return scipy.signal.lfilter(taps, 1.0, signal)
        
    # ========================================================================
    # PEAK DETECTION & DELINEATION
    # ========================================================================
    
    def detect_peaks(
        self,
        signal: np.ndarray
    ) -> Tuple[dict, dict]:
        """
        Detect R-peaks and delineate ECG waves.
        
        Args:
            signal: Filtered ECG signal
            
        Returns:
            Tuple of (rpeaks_dict, waves_dict)
        """
        try:
            # Clean signal with NeuroKit2
            clean_signal = nk.ecg_clean(
                signal,
                sampling_rate=self.sampling_rate,
                method="neurokit"
            )
            
            # Detect R-peaks
            signals, rpeaks_info = nk.ecg_peaks(
                clean_signal,
                sampling_rate=self.sampling_rate
            )
            
            # Skip delineation if no peaks found
            if len(rpeaks_info.get("ECG_R_Peaks", [])) == 0:
                # logger.debug("[SignalProcessor] No R-peaks detected, skipping delineation")
                return rpeaks_info, {}
            
            # Delineate waves (P, Q, S, T)
            signals, waves_info = nk.ecg_delineate(
                clean_signal,
                rpeaks_info,
                sampling_rate=self.sampling_rate,
                method="dwt"
            )
            
            return rpeaks_info, waves_info
            
        except Exception as e:
            logger.error(f"[SignalProcessor] Peak detection failed: {e}")
            return {}, {}
            
    def correct_peaks(
        self,
        rpeaks: dict,
        waves: dict,
        signal: np.ndarray
    ) -> Tuple[dict, dict]:
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
        # Copy to avoid modifying originals
        rpeaks_corr = rpeaks.copy()
        waves_corr = waves.copy()
        
        try:
            # Convert all to numpy arrays and remove NaN
            rpeaks_corr['ECG_R_Peaks'] = self._clean_array(
                rpeaks_corr.get('ECG_R_Peaks', [])
            )
            
            wave_keys = [
                'ECG_P_Peaks', 'ECG_Q_Peaks', 'ECG_S_Peaks', 'ECG_T_Peaks',
                'ECG_P_Onsets', 'ECG_P_Offsets', 'ECG_R_Onsets', 
                'ECG_R_Offsets', 'ECG_T_Onsets', 'ECG_T_Offsets'
            ]
            
            for key in wave_keys:
                waves_corr[key] = self._clean_array(waves_corr.get(key, []))
                
            # Check if we have sufficient data
            if len(rpeaks_corr['ECG_R_Peaks']) == 0:
                return rpeaks_corr, waves_corr
                
            for key in wave_keys:
                if len(waves_corr[key]) == 0:
                    return rpeaks_corr, waves_corr
                    
            # Apply corrections
            rpeaks_corr, waves_corr = self._correct_first_cycle(
                rpeaks_corr, waves_corr
            )
            
            if len(rpeaks_corr['ECG_R_Peaks']) == 0:
                return rpeaks_corr, waves_corr
                
            rpeaks_corr, waves_corr = self._correct_last_cycle(
                rpeaks_corr, waves_corr
            )
            
            if len(rpeaks_corr['ECG_R_Peaks']) > 1:
                rpeaks_corr, waves_corr = self._remove_weak_peaks(
                    rpeaks_corr, waves_corr, signal
                )
                
            return rpeaks_corr, waves_corr
            
        except Exception as e:
            logger.error(f"[SignalProcessor] Peak correction failed: {e}")
            return rpeaks, waves
            
    def _clean_array(self, arr) -> np.ndarray:
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
        
    def _correct_first_cycle(
        self,
        rpeaks: dict,
        waves: dict
    ) -> Tuple[dict, dict]:
        """Remove incomplete first cardiac cycle"""
        if len(waves['ECG_P_Onsets']) == 0:
            return rpeaks, waves
            
        p_onset_first = waves['ECG_P_Onsets'][0]
        
        # Remove R-peaks before first P-onset
        while len(rpeaks['ECG_R_Peaks']) > 0 and \
              rpeaks['ECG_R_Peaks'][0] < p_onset_first:
            rpeaks['ECG_R_Peaks'] = np.delete(rpeaks['ECG_R_Peaks'], 0)
            
        if len(rpeaks['ECG_R_Peaks']) == 0:
            return rpeaks, waves
            
        # Remove wave features before first P-onset
        for key in ['ECG_P_Peaks', 'ECG_Q_Peaks', 'ECG_S_Peaks', 'ECG_T_Peaks',
                    'ECG_P_Offsets', 'ECG_R_Offsets', 'ECG_T_Offsets',
                    'ECG_R_Onsets', 'ECG_T_Onsets']:
            while len(waves[key]) > 0 and waves[key][0] < p_onset_first:
                waves[key] = np.delete(waves[key], 0)
                if len(waves[key]) == 0:
                    return rpeaks, waves
                    
        return rpeaks, waves
        
    def _correct_last_cycle(
        self,
        rpeaks: dict,
        waves: dict
    ) -> Tuple[dict, dict]:
        """Remove incomplete last cardiac cycle"""
        if len(waves['ECG_T_Offsets']) == 0:
            return rpeaks, waves
            
        t_offset_last = waves['ECG_T_Offsets'][-1]
        
        # Remove R-peaks after last T-offset
        while len(rpeaks['ECG_R_Peaks']) > 0 and \
              rpeaks['ECG_R_Peaks'][-1] > t_offset_last:
            rpeaks['ECG_R_Peaks'] = np.delete(rpeaks['ECG_R_Peaks'], -1)
            
        if len(rpeaks['ECG_R_Peaks']) == 0:
            return rpeaks, waves
            
        # Remove wave features after last T-offset
        for key in ['ECG_P_Peaks', 'ECG_Q_Peaks', 'ECG_S_Peaks', 'ECG_T_Peaks',
                    'ECG_P_Onsets', 'ECG_T_Onsets', 'ECG_R_Onsets']:
            while len(waves[key]) > 0 and waves[key][-1] > t_offset_last:
                waves[key] = np.delete(waves[key], -1)
                if len(waves[key]) == 0:
                    return rpeaks, waves
                    
        return rpeaks, waves
        
    def _remove_weak_peaks(
        self,
        rpeaks: dict,
        waves: dict,
        signal: np.ndarray
    ) -> Tuple[dict, dict]:
        """Remove R-peaks with insufficient amplitude"""
        if len(rpeaks['ECG_R_Peaks']) < 2:
            return rpeaks, waves
            
        r_peaks_arr = rpeaks['ECG_R_Peaks']
        first_amp = signal[r_peaks_arr[0]]
        second_amp = signal[r_peaks_arr[1]]
        
        # If first peak is less than half of second, remove it
        if first_amp < second_amp / 2:
            rpeaks['ECG_R_Peaks'] = np.delete(r_peaks_arr, 0)
            
            # Remove corresponding wave features
            for key in waves.keys():
                if len(waves[key]) > 0:
                    waves[key] = np.delete(waves[key], 0)
                    
        return rpeaks, waves
        
    # ========================================================================
    # LIVE BPM CALCULATION
    # ========================================================================
    
    def calculate_bpm_fast(
        self,
        signal: np.ndarray,
        min_length: int = 200
    ) -> Optional[float]:
        """
        Fast BPM calculation for live monitoring.
        Uses simplified peak detection.
        
        Args:
            signal: ECG signal buffer
            min_length: Minimum required signal length
            
        Returns:
            BPM value or None if insufficient data
        """
        try:
            if len(signal) < min_length:
                return None
                
            # Check for flatline
            if np.std(signal) < 0.05:
                return None
                
            # Clean and detect peaks
            clean_signal = nk.ecg_clean(
                signal,
                sampling_rate=self.sampling_rate,
                method="neurokit"
            )
            
            signals, info = nk.ecg_peaks(
                clean_signal,
                sampling_rate=self.sampling_rate
            )
            
            r_peaks = info["ECG_R_Peaks"]
            
            if len(r_peaks) > 1:
                # Calculate RR intervals in milliseconds
                rr_intervals = np.diff(r_peaks) / self.sampling_rate * 1000
                
                if rr_intervals.size > 0:
                    avg_rr = np.mean(rr_intervals)
                    
                    # Convert to BPM
                    bpm = 60000 / avg_rr
                    
                    # Sanity check (30-200 BPM)
                    if 30 <= bpm <= 200:
                        return round(bpm, 1)
            
            return None
            
        except Exception as e:
            logger.debug(f"[SignalProcessor] Fast BPM calculation failed: {e}")
            return None


# Global singleton instance
signal_processor = SignalProcessor()
