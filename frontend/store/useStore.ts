'use client';

import { create } from 'zustand';
import { CONFIG } from '@/config/constants';
import { getActiveProfile } from '@/utils/helpers';
import { User } from '@/types/user';
import { Device, AnalysisResult, EcgSample, PerformanceMetrics, HealthData } from '@/types/models';

interface AppState {
    currentDeviceId: string | null;
    isRecording: boolean;
    isSessionActive: boolean;
    isConnected: boolean;
    recordingSeconds: number;
    recordingStartTime: number | null;
    accumulatedTime: number;
    bpm: number | string;
    performanceTrackingEnabled: boolean;
    isSidebarPinned: boolean;
    adminViewMode: 'queue' | 'logs';
    adminLoading: boolean;
    calendarSelection: {
        year: number | null;
        month: number | null;
        day: number | null;
        hour: number | null;
        minute: number | null;
    };
    selectedResult: {
        second: number | null;
        data: AnalysisResult | null;
    };
    user: User | null;
    devices: Device[];
    liveData: AnalysisResult[];
    archiveData: AnalysisResult[];
    ecgBuffer: EcgSample[];
    performance: PerformanceMetrics;
    visibleLeads: { leadI: boolean; leadII: boolean; leadIII: boolean; avF: boolean; v1: boolean };
    healthData: HealthData | null;
    setDeviceId: (id: string | null) => void;
    setDevices: (devices: Device[]) => void;
    setRecording: (isRecording: boolean) => void;
    setIsConnected: (connected: boolean) => void;
    updateTimer: () => void;
    setUser: (user: User | null) => void;
    setArchiveData: (data: AnalysisResult[]) => void;
    addLiveResult: (result: AnalysisResult) => void;
    pushEcgData: (data: EcgSample[]) => void;
    setBpm: (bpm: number | string) => void;
    updatePerformance: (l: number, j: number, p: number) => void;
    setPerformanceTrackingEnabled: (enabled: boolean) => void;
    setIsSidebarPinned: (pinned: boolean) => void;
    setAdminViewMode: (mode: 'queue' | 'logs') => void;
    setAdminLoading: (loading: boolean) => void;
    setCalendarSelection: (selection: Partial<AppState['calendarSelection']>) => void;
    setSelectedResult: (result: Partial<AppState['selectedResult']>) => void;
    setVisibleLeads: (leads: Partial<{ leadI: boolean; leadII: boolean; leadIII: boolean; avF: boolean; v1: boolean }>) => void;
    resetSession: () => void;
    setHealthData: (data: HealthData | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
    currentDeviceId: null,
    isRecording: false,
    isSessionActive: false,
    isConnected: false,
    recordingSeconds: 0,
    recordingStartTime: null,
    accumulatedTime: 0,
    bpm: '--',
    performanceTrackingEnabled: false,
    isSidebarPinned: true,
    adminViewMode: 'queue',
    adminLoading: false,
    calendarSelection: {
        year: null,
        month: null,
        day: null,
        hour: null,
        minute: null
    },
    selectedResult: {
        second: null,
        data: null
    },
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
        leadIII: true,
        avF: true,
        v1: true
    },
    healthData: null,
    setHealthData: (healthData) => set({ healthData }),
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
        ecgBuffer: []
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
            subject_id: (getActiveProfile(state.user)?.nik || "") || state.user?.id || "-",
            patient_name: (getActiveProfile(state.user)?.full_name || "") || state.user?.username || "-",
            classification: "Recording...",
            recording_id: 'placeholder-live'
        });
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
    setUser: (user) => set(() => {
        if (!user) {
            return {
                user: null,
                currentDeviceId: null,
                liveData: [],
                archiveData: [],
                ecgBuffer: [],
                recordingSeconds: 0,
                accumulatedTime: 0,
                recordingStartTime: null,
                isRecording: false,
                isSessionActive: false,
                bpm: '--'
            };
        }
        return { user };
    }),
    setArchiveData: (data) => set(() => ({ archiveData: data.filter(r => r.classification !== 'Recording...') })),
    addLiveResult: (result) => set((state) => {
        if (!result || !result.recording_id || result.classification === 'Recording...') return state;
        const clean = state.liveData.filter(r => r.recording_id !== 'placeholder-live');
        if (clean.some(item => item.recording_id === result.recording_id)) return state;
        const resultWithTime = {
            ...result,
            timestamp: result.changed_dt || result.timestamp || new Date().toISOString()
        };
        const newLive = [resultWithTime, ...clean].slice(0, 200);
        if (state.isRecording) {
            newLive.unshift({
                timestamp: new Date().toISOString(),
                device_id: state.currentDeviceId || 'unknown',
                subject_id: (getActiveProfile(state.user)?.nik || "") || state.user?.id || "-",
                patient_name: (getActiveProfile(state.user)?.full_name || "") || state.user?.username || "-",
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
    setBpm: (bpm) => set({ bpm }),
    updatePerformance: (latency, jitter, loss) => set((state) => ({
        performance: {
            latency, jitter, loss,
            latencyHistory: state.performanceTrackingEnabled ? [...state.performance.latencyHistory, latency].slice(-50) : state.performance.latencyHistory,
            jitterHistory: state.performanceTrackingEnabled ? [...state.performance.jitterHistory, jitter].slice(-50) : state.performance.jitterHistory
        }
    })),
    setPerformanceTrackingEnabled: (enabled) => set({ performanceTrackingEnabled: enabled }),
    setIsSidebarPinned: (pinned) => set({ isSidebarPinned: pinned }),
    setAdminViewMode: (adminViewMode) => set({ adminViewMode }),
    setAdminLoading: (adminLoading) => set({ adminLoading }),
    setCalendarSelection: (selection) => set((state) => ({
        calendarSelection: { ...state.calendarSelection, ...selection }
    })),
    setSelectedResult: (result) => set((state) => ({
        selectedResult: { ...state.selectedResult, ...result }
    })),
    setVisibleLeads: (leads) => set((state) => ({
        visibleLeads: { ...state.visibleLeads, ...leads }
    })),
    resetSession: () => set({
        liveData: [],
        archiveData: [],
        ecgBuffer: [],
        isRecording: false,
        isSessionActive: false,
        recordingSeconds: 0,
        recordingStartTime: null,
        accumulatedTime: 0,
        bpm: '--'
    }),
}));