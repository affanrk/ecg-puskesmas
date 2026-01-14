export const EVENTS = {
    WS: {
        CONNECTED: 'ws:connected',
        DISCONNECTED: 'ws:disconnected',
    },
    DEVICE: {
        LIST_UPDATED: 'device:list_updated',
        DISCONNECTED: 'device:disconnected',
    },
    CHART: {
        ECG_DATA: 'chart:ecg_data',
        METRICS: 'chart:metrics',
    },
    STATE: {
        LIVE_DATA_UPDATED: 'state:live_data_updated',
        RECORDING_CHANGED: 'state:recording_changed',
        PATIENT_CHANGED: 'state:patient_changed',
        PERFORMANCE_UPDATED: 'state:performance_updated',
    }
};

export const CONFIG = {
    ROWS_PER_PAGE_LIVE: 5,
    ROWS_PER_PAGE_ARCHIVE: 10,
    MAX_DATA_POINTS: 100,
    ERASE_GAP: 20,
    COLORS: {
        leadI: '#3b82f6',  // Blue-500
        leadII: '#10b981', // Emerald-500
        v1: '#f59e0b',     // Amber-500
        grid: '#e2e8f0',   // Slate-200
        text: '#64748b'    // Slate-500
    }
};