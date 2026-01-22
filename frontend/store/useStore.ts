'use client';

import { create } from 'zustand';
import { CONFIG } from '@/config/constants';

// --- Interfaces ---

export interface User {
    id?: number;
    username: string;
    email?: string;
    role: string;
    is_patient: boolean;
    full_name?: string;
    nik?: string;
    pob?: string;
    dob?: string;
    gender?: string;
    medical_history?: string;
    address?: string;
    contact_number?: string;
    [key: string]: unknown;
}

export interface Device {
    id: string;
    is_locked: boolean;
    [key: string]: unknown;
}

export interface AnalysisResult {
    recording_id: string;
    classification: string;
    confidence?: number;
    timestamp: string;
    changed_dt?: string;
    device_id: string;
    subject_id: string;
    patient_name: string;
    [key: string]: unknown;
}

export interface EcgSample {
    leadI: number;
    leadII: number;
    v1: number;
}

export interface PerformanceMetrics {
    latency: number;
    jitter: number;
    loss: number;
    latencyHistory: number[];
    jitterHistory: number[];
}

interface AppState {
    // --- State Variables ---
    // Primitives
    currentDeviceId: string | null;
    isRecording: boolean;
    isSessionActive: boolean;
    isConnected: boolean;
    recordingSeconds: number;
    recordingStartTime: number | null;
    accumulatedTime: number;
    livePage: number;
    bpm: number | string;
    performanceTrackingEnabled: boolean;

    // Objects / Arrays
    user: User | null;
    devices: Device[];
    liveData: AnalysisResult[];
    archiveData: AnalysisResult[];
    ecgBuffer: EcgSample[];
    performance: PerformanceMetrics;
    visibleLeads: { leadI: boolean; leadII: boolean; v1: boolean };

    // --- Actions ---
    setDeviceId: (id: string | null) => void;
    setDevices: (devices: Device[]) => void;
    setRecording: (isRecording: boolean) => void;
    setIsConnected: (connected: boolean) => void;
    updateTimer: () => void;
    setUser: (user: User | null) => void;
    setArchiveData: (data: AnalysisResult[]) => void;
    addLiveResult: (result: AnalysisResult) => void;
    pushEcgData: (data: EcgSample[]) => void;
    setLivePage: (page: number) => void;
    setBpm: (bpm: number | string) => void;
    updatePerformance: (l: number, j: number, p: number) => void;
    setPerformanceTrackingEnabled: (enabled: boolean) => void;
    setVisibleLeads: (leads: Partial<{ leadI: boolean; leadII: boolean; v1: boolean }>) => void;
    resetSession: () => void;
}

// --- Store Implementation ---

export const useStore = create<AppState>((set, get) => ({
    // Initial State
    currentDeviceId: null,
    isRecording: false,
    isSessionActive: false,
    isConnected: false,
    recordingSeconds: 0,
    recordingStartTime: null,
    accumulatedTime: 0,
    livePage: 1,
    bpm: '--',
    performanceTrackingEnabled: false,

    user: null,
    devices: [],
    liveData: [],
    archiveData: [],
    ecgBuffer: [],
    performance: {
        latency: 0,
        jitter: 0,
        loss: 0,
        latencyHistory: [],
        jitterHistory: []
    },
    visibleLeads: {
        leadI: true,
        leadII: true,
        v1: true
    },

    // Actions
    setDeviceId: (id) => set((state) => ({ 
        currentDeviceId: id, 
        isRecording: false, 
        bpm: '--', 
        performance: { latency: 0, jitter: 0, loss: 0, latencyHistory: [], jitterHistory: [] },
        isSessionActive: state.isSessionActive,
        liveData: state.liveData,
        archiveData: state.archiveData,
        recordingSeconds: state.recordingSeconds,
        recordingStartTime: state.recordingStartTime,
        accumulatedTime: state.accumulatedTime,
        ecgBuffer: [] // Always clear buffer on device change/disconnect
    })),

    setDevices: (devices) => set({ devices }),
    
    setRecording: (isRecording) => set((state) => {
        if (!isRecording) {
            const cleanLiveData = state.liveData.filter(r => r.recording_id !== 'placeholder-live');
            const segmentDuration = state.recordingStartTime ? (Date.now() - state.recordingStartTime) / 1000 : 0;
            const finalAccumulated = state.accumulatedTime + segmentDuration;
            
            return { 
                isRecording, 
                liveData: cleanLiveData, 
                recordingStartTime: null,
                accumulatedTime: finalAccumulated,
                recordingSeconds: Math.floor(finalAccumulated)
            };
        }
        
        const newLiveData = [...state.liveData.filter(r => r.recording_id !== 'placeholder-live')];
        newLiveData.unshift({
            timestamp: new Date().toISOString(),
            device_id: state.currentDeviceId || 'unknown',
            subject_id: state.user?.nik || (state.user?.id ? String(state.user.id) : "-"),
            patient_name: state.user?.full_name || state.user?.username || "-",
            classification: "Recording...",
            recording_id: 'placeholder-live'
        });
        
        // Only set start time if not already recording to prevent timer reset on segment updates
        const startTime = state.isRecording ? state.recordingStartTime : Date.now();
        
        return { 
            isRecording, 
            isSessionActive: true, 
            liveData: newLiveData,
            recordingStartTime: startTime
        };
    }),
    
    setIsConnected: (connected) => set({ isConnected: connected }),
    
    updateTimer: () => {
        const state = get();
        if (!state.isRecording || !state.recordingStartTime) return;
        
        const currentSegment = (Date.now() - state.recordingStartTime) / 1000;
        const total = state.accumulatedTime + currentSegment;
        const totalRounded = Math.floor(total);
        
        if (totalRounded !== state.recordingSeconds) {
            set({ recordingSeconds: totalRounded });
        }
    },
    
    setUser: (user) => set(() => user ? { user, recordingSeconds: 0, accumulatedTime: 0 } : { user: null, liveData: [], archiveData: [], recordingSeconds: 0, isRecording: false, bpm: '--' }),
    
    setArchiveData: (data) => set(() => ({ archiveData: data.filter(r => r.classification !== 'Recording...') })),
    
    addLiveResult: (result) => set((state) => {
        if (!result || !result.recording_id || result.classification === 'Recording...') return state;
        const clean = state.liveData.filter(r => r.recording_id !== 'placeholder-live');
        if (clean.some(item => item.recording_id === result.recording_id)) return state;
        
        // Ensure result has a timestamp or changed_dt
        const resultWithTime = {
            ...result,
            timestamp: result.changed_dt || result.timestamp || new Date().toISOString()
        };

        const newLive = [resultWithTime, ...clean].slice(0, 200);
        
        if (state.isRecording) {
            newLive.unshift({ 
                timestamp: new Date().toISOString(), 
                device_id: state.currentDeviceId || 'unknown', 
                subject_id: state.user?.nik || (state.user?.id ? String(state.user.id) : "-"), 
                patient_name: state.user?.full_name || state.user?.username || "-", 
                classification: "Recording...", 
                recording_id: 'placeholder-live' 
            });
        }
        return { liveData: newLive, archiveData: [resultWithTime, ...state.archiveData] };
    }),
    
    pushEcgData: (data) => set((state) => {
        const limit = CONFIG.MAX_DATA_POINTS * 2; 
        const newBuffer = [...state.ecgBuffer, ...data].slice(-limit);
        return { ecgBuffer: newBuffer };
    }),
    
    setLivePage: (page) => set({ livePage: page }),
    
    setBpm: (bpm) => set({ bpm }),
    
    updatePerformance: (latency, jitter, loss) => set((state) => ({
        performance: {
            latency, jitter, loss,
            latencyHistory: state.performanceTrackingEnabled ? [...state.performance.latencyHistory, latency].slice(-50) : state.performance.latencyHistory,
            jitterHistory: state.performanceTrackingEnabled ? [...state.performance.jitterHistory, jitter].slice(-50) : state.performance.jitterHistory
        }
    })),
    
    setPerformanceTrackingEnabled: (enabled) => set({ performanceTrackingEnabled: enabled }),
    
    setVisibleLeads: (leads) => set((state) => ({ 
        visibleLeads: { ...state.visibleLeads, ...leads } 
    })),

    resetSession: () => set({  
        liveData: [], 
        archiveData: [], 
        ecgBuffer: [], 
        livePage: 1, 
        isRecording: false, 
        isSessionActive: false, 
        recordingSeconds: 0,
        recordingStartTime: null,
        accumulatedTime: 0,
        bpm: '--' 
    }),
}));
