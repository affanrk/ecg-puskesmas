export interface Device {
    id: string;
    is_locked: boolean;
}

export interface AnalysisResult {
    recording_id: string;
    classification: string;
    confidence?: number;
    timestamp: string;
    changed_dt?: string;
    device_id: string;
    subject_id: string;
    patient_name: string;
    bpm?: number | string;
    avg_bpm?: number | string;
}

export interface EcgSample {
    leadI: number;
    leadII: number;
    leadIII: number;
    avF: number;
    v1: number;
}

export interface PerformanceMetrics {
    latency: number;
    jitter: number;
    loss: number;
    latencyHistory: number[];
    jitterHistory: number[];
}

export interface HealthData {
    status: string;
    timestamp: number;
    components: {
        database: { status: string; latency_ms?: number; error?: string };
        mqtt: { status: string };
        ml_model: { status: string };
        devices: { active: number; recording: number };
    };
    buffers: {
        recording_batch_size: number;
        mobile_batch_size: number;
    };
    performance: {
        avg_latency_ms: number;
        avg_jitter_ms: number;
        avg_packet_loss_pct: number;
    };
}

export interface CalendarNode {
    label: string;
    value: number;
    level: string;
    status: 'normal' | 'abnormal' | 'potential' | 'high_potential' | 'empty' | 'has_data' | string;
    count: number;
    classifications?: Record<string, number>;
}

export interface HistoryFilters {
    [key: string]: string | number | boolean | undefined;
}

export type ToastType = 'success' | 'error' | 'warning';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}
