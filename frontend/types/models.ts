export interface Device {
    id: string;
    is_locked: boolean;
    lead_mode?: 5 | 12;
}

export interface SessionParameter {
    lead_name: string;
    heart_rate_bpm?: number;
    rr_ms?: number;
    rr_std_ms?: number;
    pr_ms?: number;
    qrs_ms?: number;
    qtc_ms?: number;
    st_amplitude_mv?: number;
    st_deviation_mv?: number;
    rs_ratio?: number;
}

export interface AnalysisResult {
    recording_id: string;
    classification?: string;
    classification_result?: string;
    is_normal?: boolean;
    confidence?: number;
    confidence_score?: number;
    timestamp: string;
    changed_dt?: string;
    device_id: string;
    subject_id: string;
    patient_name: string;
    device_type?: string;
    parameters?: SessionParameter[];
}

export interface EcgSample5Leads {
    i: number;
    ii: number;
    iii: number;
    avf: number;
    v1: number;
}

export interface EcgSample12Leads {
    i: number;
    ii: number;
    iii: number;
    avf: number;
    v1: number;
    avr: number;
    avl: number;
    v2: number;
    v3: number;
    v4: number;
    v5: number;
    v6: number;
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
        ml_model_5leads: { status: string };
        ml_model_12leads: { status: string };
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
