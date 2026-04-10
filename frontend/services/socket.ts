'use client';

import { globalEventBus } from './events';
import { EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import { Device } from '@/types/models';
import { useToast } from '@/hooks/useToast';
import { getActiveProfile } from '@/utils/helpers';

type SocketMessage =
    | { type: 'ping' | 'pong' }
    | { type: 'device_list_update'; devices: Device[] }
    | { type: 'live_5leads_batch'; device_id?: string; samples: Array<{ i: number; ii: number; iii: number; avf: number; v1: number }>; counter?: number; sampling_rate?: number }
    | { type: 'live_12leads_batch'; device_id?: string; samples: Array<{ i: number; ii: number; iii: number; avr: number; avl: number; avf: number; v1: number; v2: number; v3: number; v4: number; v5: number; v6: number }>; counter?: number; sampling_rate?: number }
    | { type: 'live_result'; device_id: string; classification: string; confidence?: number; recording_id?: string }
    | { type: 'state_update'; device_id?: string; is_recording: boolean }
    | { type: 'performance_update'; device_id?: string; latency_ms: number; jitter_ms: number; packet_loss_pct: number }
    | { type: 'calculate_live_bpm'; device_id?: string; data: { bpm: number } }
    | { type: 'device_disconnected'; device_id: string }
    | { type: 'subscription_success'; device_id: string }
    | { type: 'unsubscription_success'; device_id: string }
    | { type: 'error'; message: string };

class WebSocketService {
    private socket: WebSocket | null = null;
    private reconnectInterval = 2000;
    private maxReconnectInterval = 30000;
    private pingInterval: NodeJS.Timeout | null = null;
    private pingTimeout: NodeJS.Timeout | null = null;
    private isTerminated = false;

    private getWsUrl(): string {
        const env = (typeof window !== 'undefined' ? window.__ENV__ : null) || {};
        let url = env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

        console.log('[getWsUrl] Runtime Env:', env.NEXT_PUBLIC_WS_URL);
        console.log('[getWsUrl] Build-time Env:', process.env.NEXT_PUBLIC_WS_URL);

        url = url.replace(/\/$/, '');

        if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
            const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            url = `${protocol}${url}`;
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('ecg_token') : null;
        if (token) {
            url += (url.includes('?') ? '&' : '?') + `token=${token}`;
        }

        console.log('[getWsUrl] Final URL:', url);
        return url;
    }

    public connect() {
        if (this.isTerminated) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('ecg_token') : null;
        if (!token) {
            console.debug("[WS] Connection skipped: No authentication token found.");
            return;
        }

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }
        const url = this.getWsUrl();
        this.socket = new WebSocket(url);
        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = this.handleError.bind(this);
    }

    public disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }
        useStore.getState().setIsConnected(false);
    }

    public terminate() {
        this.isTerminated = true;
        this.disconnect();
    }

    public reconnect() {
        if (this.isTerminated) return;
        this.disconnect();
        setTimeout(() => this.connect(), 500);
    }

    private handleOpen() {
        if (this.isTerminated) {
            this.disconnect();
            return;
        }
        globalEventBus.emit(EVENTS.WS.CONNECTED);
        useStore.getState().setIsConnected(true);
        this.reconnectInterval = 2000;
        this.startHeartbeat();
    }

    private handleMessage(event: MessageEvent) {
        if (this.isTerminated) return;
        try {
            const msg = JSON.parse(event.data) as SocketMessage;
            this.processMessage(msg);
        } catch (e) {
            console.error("[WS] Parse Error:", e);
        }
    }

    private handleClose() {
        this.stopHeartbeat();
        globalEventBus.emit(EVENTS.WS.DISCONNECTED);
        useStore.getState().setIsConnected(false);
        this.socket = null;

        if (this.isTerminated) return;

        setTimeout(() => this.connect(), this.reconnectInterval);
        this.reconnectInterval = Math.min(this.reconnectInterval * 2, this.maxReconnectInterval);
    }

    private handleError(error: Event) {
        console.error("[WS] Error:", error);
        this.socket?.close();
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.pingInterval = setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                const { isRecording } = useStore.getState();
                if (!isRecording) {
                    this.sendJson({ type: 'ping' });
                    this.pingTimeout = setTimeout(() => {
                        console.warn("[WS] Ping timeout, reconnecting...");
                        this.socket?.close();
                    }, 5000);
                }
            }
        }, 30000);
    }

    private stopHeartbeat() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.pingTimeout) clearTimeout(this.pingTimeout);
    }

    private processMessage(msg: SocketMessage) {
        const store = useStore.getState();
        const { show: toast } = useToast.getState();
        if (msg.type === "pong") {
            if (this.pingTimeout) clearTimeout(this.pingTimeout);
            return;
        }
        if (msg.type === "ping") {
            this.sendJson({ type: "pong" });
            return;
        }
        if (msg.type === "device_list_update") {
            store.setDevices(msg.devices);
            globalEventBus.emit(EVENTS.DEVICE.LIST_UPDATED, msg.devices);

            if (store.currentDeviceId && !msg.devices.some(d => d.id === store.currentDeviceId)) {
                store.setDeviceId(null);
                store.setBpm('--');
                if (store.isRecording) store.setRecording(false);
                toast(`Device ${store.currentDeviceId} disconnected`, "warning");
            }
            return;
        }
        if ('device_id' in msg && msg.device_id) {
            const isDataMessage = ['live_data', 'live_5leads_batch', 'live_12leads_batch', 'live_result', 'calculate_live_bpm', 'performance_update'].includes(msg.type);
            if (isDataMessage) {
                if (!store.currentDeviceId || msg.device_id !== store.currentDeviceId) return;
            } else {
                if (store.currentDeviceId && msg.device_id !== store.currentDeviceId) return;
            }
        }
        switch (msg.type) {
            case "live_5leads_batch": {
                if (msg.samples?.length) {
                    const batchData = msg.samples.map(s => ({
                        i: s.i, ii: s.ii, iii: s.iii, avf: s.avf, v1: s.v1
                    }));
                    store.pushEcgData5Leads(batchData);
                    globalEventBus.emit(EVENTS.CHART.ECG_BATCH_5, { samples: batchData, counter: msg.counter, sampling_rate: msg.sampling_rate });
                }
                break;
            }
            case "live_12leads_batch": {
                if (msg.samples?.length) {
                    const batchData = msg.samples.map(s => ({
                        i: s.i, ii: s.ii, iii: s.iii,
                        avr: s.avr, avl: s.avl, avf: s.avf,
                        v1: s.v1, v2: s.v2, v3: s.v3, v4: s.v4, v5: s.v5, v6: s.v6
                    }));
                    store.pushEcgData12Leads(batchData);
                    globalEventBus.emit(EVENTS.CHART.ECG_BATCH_12, { samples: batchData, counter: msg.counter, sampling_rate: msg.sampling_rate });
                }
                break;
            }
            case "live_result": {
                store.addLiveResult({
                    timestamp: new Date().toISOString(),
                    device_id: msg.device_id,
                    subject_id: (getActiveProfile(store.user)?.nik || "") || store.user?.id || "-",
                    patient_name: (getActiveProfile(store.user)?.full_name || "") || store.user?.username || "-",
                    classification: msg.classification,
                    confidence: msg.confidence,
                    recording_id: msg.recording_id || `live_${Date.now()}`
                });
                break;
            }
            case "calculate_live_bpm": {
                if (msg.data && typeof msg.data.bpm === 'number') {
                    store.setBpm(Math.round(msg.data.bpm));
                }
                globalEventBus.emit(EVENTS.CHART.METRICS, msg.data);
                break;
            }
            case "state_update":
                store.setRecording(msg.is_recording);
                store.setWsPendingAction(null);
                break;
            case "performance_update":
                store.updatePerformance(msg.latency_ms, msg.jitter_ms, msg.packet_loss_pct);
                globalEventBus.emit(EVENTS.STATE.PERFORMANCE_UPDATED, {
                    latency_ms: msg.latency_ms, jitter_ms: msg.jitter_ms, loss_pct: msg.packet_loss_pct
                });
                break;
            case "device_disconnected":
                if (store.currentDeviceId === msg.device_id) {
                    const wasRec = store.isRecording;
                    store.setDeviceId(null);
                    store.setBpm('--');
                    if (wasRec) {
                        store.setRecording(false);
                        toast(`Recording PAUSED! Device ${msg.device_id} lost connection.`, "error");
                    } else {
                        toast(`Device ${msg.device_id} disconnected`, "warning");
                    }
                } else if (!store.currentDeviceId) {
                    store.setDeviceId(null);
                    store.setBpm('--');
                    if (store.isRecording) store.setRecording(false);
                }
                globalEventBus.emit(EVENTS.DEVICE.DISCONNECTED, { device_id: msg.device_id });
                break;
            case "subscription_success":
                store.setDeviceId(msg.device_id);
                store.setWsPendingAction(null);
                break;
            case "unsubscription_success":
                store.setDeviceId(null);
                store.setWsPendingAction(null);
                break;
            case "error":
                console.error("[WS] Server Error:", msg.message);
                if (msg.message.toLowerCase().includes("session expired")) {
                    const { isRecording, currentDeviceId } = store;
                    if (isRecording && currentDeviceId) {
                        try {
                            this.sendJson({ type: "stop_recording", device_id: currentDeviceId });
                        } catch { }
                    }

                    localStorage.removeItem('ecg_token');
                    localStorage.removeItem('ecg_user');
                    store.setUser(null);
                    this.terminate();

                    if (typeof window !== 'undefined') {
                        window.__is_logging_out = true;
                        window.location.replace('/login?reason=expired');
                    }
                } else {
                    toast(msg.message, "error");
                }
                break;
        }
    }

    public sendJson<T extends object>(data: T) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn("[WS] Cannot send, socket not open:", data);
        }
    }
}

const wsService = new WebSocketService();
export const connectWebSocket = () => wsService.connect();
export const disconnectWebSocket = () => wsService.disconnect();
export const terminateWebSocket = () => wsService.terminate();
export const reconnectWebSocket = () => wsService.reconnect();
export const sendJson = <T extends object>(data: T) => wsService.sendJson(data);
export default wsService;