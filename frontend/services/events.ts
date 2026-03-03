import mitt from 'mitt';
import { Device } from '@/types/models';

export type EcgPoint = {
    leadI: number;
    leadII: number;
    leadIII: number;
    avF: number;
    v1: number;
};

type Events = {
    'ws:connected': void;
    'ws:disconnected': void;
    'device:list_updated': Device[];
    'device:disconnected': { device_id: string };
    'chart:ecg_batch': { samples: EcgPoint[]; counter?: number; sampling_rate?: number };
    'chart:metrics': { bpm: number };
    'state:live_data_updated': void;
    'state:performance_updated': {
        latency_ms: number;
        jitter_ms: number;
        loss_pct: number;
    };
};

export const globalEventBus = mitt<Events>();
