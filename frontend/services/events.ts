import mitt from 'mitt';

// --- Types ---

export type EcgPoint = {
    leadI: number;
    leadII: number;
    v1: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Events = {
    'ws:connected': void;
    'ws:disconnected': void;
    'device:list_updated': any;
    'device:disconnected': any;
    'chart:ecg_data': EcgPoint;
    'chart:ecg_batch': EcgPoint[];
    'chart:metrics': any;
    'state:live_data_updated': any;
    'state:recording_changed': any;
    'state:patient_changed': any;
    'state:performance_updated': any;
};

// --- Bus Instance ---

export const globalEventBus = mitt<Events>();