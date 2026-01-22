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
        ECG_BATCH: 'chart:ecg_batch',   
        METRICS: 'chart:metrics',
    },
    STATE: {
        LIVE_DATA_UPDATED: 'state:live_data_updated',
        RECORDING_CHANGED: 'state:recording_changed',
        PATIENT_CHANGED: 'state:patient_changed',
        PERFORMANCE_UPDATED: 'state:performance_updated',
    }
} as const;

export const CONFIG = {
    ROWS_PER_PAGE_LIVE: 5,
    ROWS_PER_PAGE_ARCHIVE: 10,
    MAX_DATA_POINTS: 500,
    ERASE_GAP: 20,
    COLORS: {
        leadI: '#3b82f6',
        leadII: '#10b981',
        v1: '#f59e0b',
        grid: '#e2e8f0', 
        text: '#64748b'
    }
} as const;