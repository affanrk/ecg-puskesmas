'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';
import { Device } from '@/types/models';

export function useDeviceListeners() {
    const { currentDeviceId, setDeviceId, isRecording, setRecording, setBpm, resetSession } = useStore();
    const { show: toast } = useToast();
    const isDisconnectingRef = useRef(false);
    const prevDeviceIdRef = useRef(currentDeviceId);

    useEffect(() => {
        if (prevDeviceIdRef.current !== currentDeviceId) {
            isDisconnectingRef.current = false;
            prevDeviceIdRef.current = currentDeviceId;
        }

        const handleDeviceDisconnect = (data: { device_id?: string; was_recording?: boolean } | string | undefined, silent: boolean = false) => {
            if (!data) return;
            const disconnectedId = typeof data === 'string' ? data : data.device_id;
            if (disconnectedId !== currentDeviceId) return;
            if (isDisconnectingRef.current) return;
            
            const isOffline = typeof window !== 'undefined' && !window.navigator.onLine;
            const wasRecording = isRecording || (typeof data !== 'string' && data.was_recording);
            
            isDisconnectingRef.current = true;
            setDeviceId(null); 
            setBpm('--');
            
            if (!silent) {
                if (isOffline) {
                    if (wasRecording) {
                        setRecording(false);
                        toast("Network Lost: Recording Auto-Paused", "error");
                    } else {
                        toast("Network Lost: Live stream paused. Waiting for connection...", "warning");
                    }
                } else {
                    if (wasRecording) {
                        setRecording(false); 
                        toast(`Recording PAUSED! Device ${disconnectedId} lost connection. Select another device to continue.`, "error");
                    } else {
                        toast(`Device ${disconnectedId} disconnected`, "warning");
                    }
                }
            }
        };

        const handleDeviceList = (list: Device[]) => {
            if (currentDeviceId) {
                const exists = list.some(d => d.id === currentDeviceId);
                if (!exists) {
                    handleDeviceDisconnect({ device_id: currentDeviceId, was_recording: isRecording }, true);
                }
            }
        };

        const handleReconnection = () => {
            if (currentDeviceId) {
                sendJson({ type: "subscribe_to_device", device_id: currentDeviceId });
            }
        };

        const handleWsDisconnect = () => {
            const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
            const { isSessionActive, setIsConnected } = useStore.getState();
            
            setIsConnected(false);

            setRecording(false);

            if (isRecording) {
                toast(isOffline ? "Network Lost: Recording Auto-Paused" : "Server Connection Lost: Recording Paused", "error");
            } else if (currentDeviceId) {
                toast(isOffline ? "Network Lost: Live stream paused. Waiting for connection..." : "Server Disconnected: Reconnecting...", "warning");
                
                if (!isSessionActive) {
                    resetSession();
                }
            }

            setBpm('--');
            setDeviceId(null);
            
            useStore.setState({ ecgBuffer5Leads: [], ecgBuffer12Leads: [] });
        };

        globalEventBus.on(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
        globalEventBus.on(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);
        globalEventBus.on(EVENTS.WS.CONNECTED, handleReconnection);
        globalEventBus.on(EVENTS.WS.DISCONNECTED, handleWsDisconnect);

        window.addEventListener('offline', handleWsDisconnect);

        return () => {
            globalEventBus.off(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
            globalEventBus.off(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);
            globalEventBus.off(EVENTS.WS.CONNECTED, handleReconnection);
            globalEventBus.off(EVENTS.WS.DISCONNECTED, handleWsDisconnect);
            window.removeEventListener('offline', handleWsDisconnect);
        };
    }, [currentDeviceId, isRecording, setDeviceId, setRecording, toast, setBpm, resetSession]);
}
