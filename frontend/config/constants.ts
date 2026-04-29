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
        ECG_BATCH_5: 'chart:ecg_batch_5',
        ECG_BATCH_12: 'chart:ecg_batch_12',
        METRICS: 'chart:metrics',
    },
    STATE: {
        LIVE_DATA_UPDATED: 'state:live_data_updated',
        PERFORMANCE_UPDATED: 'state:performance_updated',
    }
} as const;

export const LEAD_MODES = {
    FIVE: 5 as const,
    TWELVE: 12 as const
};

export const LEAD_CONFIGS = {
    [LEAD_MODES.FIVE]: [
        { id: 'leadI', label: 'Lead I', key: 'i' },
        { id: 'leadII', label: 'Lead II', key: 'ii' },
        { id: 'leadIII', label: 'Lead III', key: 'iii' },
        { id: 'avF', label: 'aVF', key: 'avf' },
        { id: 'v1', label: 'V1', key: 'v1' }
    ],
    [LEAD_MODES.TWELVE]: [
        { id: 'leadI', label: 'Lead I', key: 'i' },
        { id: 'leadII', label: 'Lead II', key: 'ii' },
        { id: 'leadIII', label: 'Lead III', key: 'iii' },
        { id: 'avr', label: 'aVR', key: 'avr' },
        { id: 'avl', label: 'aVL', key: 'avl' },
        { id: 'avF', label: 'aVF', key: 'avf' },
        { id: 'v1', label: 'V1', key: 'v1' },
        { id: 'v2', label: 'V2', key: 'v2' },
        { id: 'v3', label: 'V3', key: 'v3' },
        { id: 'v4', label: 'V4', key: 'v4' },
        { id: 'v5', label: 'V5', key: 'v5' },
        { id: 'v6', label: 'V6', key: 'v6' }
    ]
};

export const CONFIG = {
    SAMPLING_RATE: {
        [LEAD_MODES.FIVE]: 100,
        [LEAD_MODES.TWELVE]: 100,
    },
    MAX_DATA_POINTS: {
        [LEAD_MODES.FIVE]: 500,
        [LEAD_MODES.TWELVE]: 500,
    },
    ERASE_GAP: 20,
    COLORS: {
        leadI: '#3b82f6',
        leadII: '#10b981',
        v1: '#f59e0b',
        grid: '#e2e8f0',
        text: '#64748b'
    }
} as const;
