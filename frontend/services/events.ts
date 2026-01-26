import mitt from 'mitt';
import { Device } from '@/store/useStore';

// --- Types ---

export type EcgPoint = {
    leadI: number;
    leadII: number;
    v1: number;
};

 
type Events = {
    'ws:connected': void;
    'ws:disconnected': void;
    'device:list_updated': Device[];
    'device:disconnected': { device_id: string };
    'chart:ecg_data': EcgPoint;
    'chart:ecg_batch': EcgPoint[];
    'chart:metrics': { bpm: number };
    'state:live_data_updated': unknown;
    'state:recording_changed': boolean;
    'state:patient_changed': unknown;
    'state:performance_updated': {
        latency_ms: number;
        jitter_ms: number;
        loss_pct: number;
    };
};

// --- Bus Instance ---

export const globalEventBus = mitt<Events>();