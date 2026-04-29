import mitt from 'mitt';
import { Device, EcgSample5Leads, EcgSample12Leads } from '@/types/models';

type Events = {
    'ws:connected': void;
    'ws:disconnected': void;
    'device:list_updated': Device[];
    'device:disconnected': { device_id: string };
    'chart:ecg_batch_5': { samples: EcgSample5Leads[]; counter?: number; sampling_rate?: number };
    'chart:ecg_batch_12': { samples: EcgSample12Leads[]; counter?: number; sampling_rate?: number };
    'chart:metrics': { bpm: number };
    'state:live_data_updated': void;
    'state:performance_updated': {
        latency_ms: number;
        jitter_ms: number;
        loss_pct: number;
    };
};

export const globalEventBus = mitt<Events>();
