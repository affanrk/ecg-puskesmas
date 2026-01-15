'use client';

import { create } from 'zustand';

export interface Patient {
    nik: string;
    name: string;
    age: number;
    gender: string;
    riwayat: string;
    dob: string;
    pob: string;
}

interface AppState {
    currentDeviceId: string | null;
    devices: any[];
    isRecording: boolean;
    isConnected: boolean;
    recordingSeconds: number;
    patient: Patient | null;
    liveData: any[];
    archiveData: any[];
    livePage: number;
    
    // Metrics
    bpm: number | string;
    performance: {
        latency: number;
        jitter: number;
        loss: number;
        latencyHistory: number[];
        jitterHistory: number[];
    };
    performanceTrackingEnabled: boolean;

    // Actions
    setDeviceId: (id: string | null) => void;
    setDevices: (devices: any[]) => void;
    setRecording: (isRecording: boolean) => void;
    setIsConnected: (connected: boolean) => void;
    incrementTimer: () => number;
    setPatient: (patient: Patient | null) => void;
    setArchiveData: (data: any[]) => void;
    addLiveResult: (result: any) => void;
    setLivePage: (page: number) => void;
    setBpm: (bpm: number | string) => void;
    updatePerformance: (l: number, j: number, p: number) => void;
    setPerformanceTrackingEnabled: (enabled: boolean) => void;
    resetSession: () => void;
}

export const useStore = create<AppState>((set, get) => ({
    currentDeviceId: null,
    devices: [],
    isRecording: false,
    isConnected: false,
    recordingSeconds: 0,
    patient: null,
    liveData: [],
    archiveData: [],
    livePage: 1,
    bpm: '--',
    performance: {
        latency: 0,
        jitter: 0,
        loss: 0,
        latencyHistory: [],
        jitterHistory: []
    },
    performanceTrackingEnabled: false,

    setDeviceId: (id) => set((state) => {
        return { 
            currentDeviceId: id,
            isRecording: false, 
            bpm: '--',
            performance: { 
                latency: 0, 
                jitter: 0, 
                loss: 0,
                latencyHistory: [],
                jitterHistory: []
            },
            liveData: state.liveData.filter(r => r.recording_id !== 'placeholder-live')
        };
    }),
    setDevices: (devices) => set({ devices }),
    setRecording: (isRecording) => set((state) => {
        const filteredData = state.liveData.filter(r => r.recording_id !== 'placeholder-live');
        let newLiveData = [...filteredData];
        
        if (isRecording) {
            newLiveData.unshift({
                timestamp: new Date().toISOString(),
                device_id: state.currentDeviceId,
                subject_id: state.patient?.nik || "-",
                patient_name: state.patient?.name || "-",
                classification: "Recording...",
                recording_id: 'placeholder-live'
            });
        }
        
        return { 
            isRecording, 
            liveData: newLiveData 
        };
    }),
    setIsConnected: (connected) => set({ isConnected: connected }),
    incrementTimer: () => {
        const state = get();
        if (state.isRecording) {
            const next = state.recordingSeconds + 1;
            set({ recordingSeconds: next });
            return next;
        }
        return state.recordingSeconds;
    },
    setPatient: (patient) => set((state) => {
        if (!patient) {
            return {
                patient: null,
                liveData: [],
                archiveData: [],
                recordingSeconds: 0,
                isRecording: false,
                bpm: '--'
            };
        }
        return { patient, recordingSeconds: 0 };
    }),
    setArchiveData: (data) => set((state) => {
        const cleanData = data.filter(r => r.recording_id !== 'placeholder-live' && r.classification !== 'Recording...');
        return { archiveData: cleanData };
    }),
    addLiveResult: (result) => set((state) => {
        if (!result || !result.recording_id || result.classification === 'Recording...') {
            return state;
        }

        const cleanLiveData = state.liveData.filter(r => r.recording_id !== 'placeholder-live');
        
        if (cleanLiveData.some(item => item.recording_id === result.recording_id)) {
            return state;
        }

        const isDuplicateInArchive = state.archiveData.some(item => item.recording_id === result.recording_id);
        const newArchiveData = isDuplicateInArchive 
            ? state.archiveData 
            : [result, ...state.archiveData];

        let newLiveData = [result, ...cleanLiveData];

        if (state.isRecording) {
            newLiveData.unshift({
                timestamp: new Date().toISOString(),
                device_id: state.currentDeviceId,
                subject_id: state.patient?.nik || "-",
                patient_name: state.patient?.name || "-",
                classification: "Recording...",
                recording_id: 'placeholder-live'
            });
        }

        if (newLiveData.length > 200) newLiveData = newLiveData.slice(0, 200);

        return { 
            liveData: newLiveData,
            archiveData: newArchiveData
        };
    }),
    setLivePage: (page) => set({ livePage: page }),
    setBpm: (bpm) => set({ bpm }),
    updatePerformance: (latency, jitter, loss) => set((state) => {
        if (!state.performanceTrackingEnabled) {
            return {
                performance: {
                    ...state.performance,
                    latency,
                    jitter,
                    loss
                }
            };
        }

        const newLatencyHistory = [...state.performance.latencyHistory, latency].slice(-50);
        const newJitterHistory = [...state.performance.jitterHistory, jitter].slice(-50);
        return {
            performance: {
                latency,
                jitter,
                loss,
                latencyHistory: newLatencyHistory,
                jitterHistory: newJitterHistory
            }
        };
    }),
    setPerformanceTrackingEnabled: (enabled) => set({ performanceTrackingEnabled: enabled }),
    resetSession: () => set({ 
        patient: null, 
        liveData: [], 
        archiveData: [],
        livePage: 1, 
        isRecording: false,
        recordingSeconds: 0,
        bpm: '--',
        performance: { 
            latency: 0, 
            jitter: 0, 
            loss: 0,
            latencyHistory: [],
            jitterHistory: []
        }
    }),
}));
