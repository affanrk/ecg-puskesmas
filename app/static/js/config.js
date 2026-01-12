export const CONFIG = {
    // Host dinamis (Localhost / Public IP)
    WS_URL: `ws://${window.location.host}/ws`,
    API_BASE_URL: `http://${window.location.host}/api`,

    // Warna Chart (Visualisasi)
    COLORS: {
        leadI: '#3b82f6',  // Blue-500
        leadII: '#10b981', // Emerald-500
        v1: '#f59e0b',     // Amber-500
        grid: '#e2e8f0',   // Slate-200
        text: '#64748b'    // Slate-500
    },

    // Konstanta Logika
    MAX_DATA_POINTS: 100, // 10 detik @ 100Hz
    ERASE_GAP: 20,
    TOAST_DURATION: 3000,
    ROWS_PER_PAGE_LIVE: 5,
    ROWS_PER_PAGE_ARCHIVE: 10
};

// Peta Event Global untuk meminimalisir typo string
export const EVENTS = {
    WS: {
        CONNECTED: 'ws:connected',
        DISCONNECTED: 'ws:disconnected',
        MESSAGE: 'ws:message'
    },
    DEVICE: {
        LIST_UPDATED: 'device:list-updated',
        SELECTED: 'device:selected',
        DISCONNECTED: 'device:disconnected'
    },
    STATE: {
        PATIENT_CHANGED: 'state:patient-changed',
        RECORDING_CHANGED: 'state:recording-changed',
        LIVE_DATA_UPDATED: 'state:live-data-updated',
        ARCHIVE_DATA_UPDATED: 'state:archive-data-updated',
        PERFORMANCE_UPDATED: 'state:perf-updated'
    },
    CHART: {
        ECG_DATA: 'chart:ecg-data',
        METRICS: 'chart:metrics'
    }
};