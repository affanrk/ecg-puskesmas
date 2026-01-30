'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';
import { Device } from './useDeviceManager';

export function useDeviceListeners() {
    // 1. Store & Hooks
    const { currentDeviceId, setDeviceId, isRecording, setRecording, setBpm } = useStore();
    const { show: toast } = useToast();
    
    // Ref to prevent double-firing of disconnect logic (race condition between LIST_UPDATED and DISCONNECTED)
    const isDisconnectingRef = useRef(false);
    const prevDeviceIdRef = useRef(currentDeviceId);

    // 2. Effects
    // Handle AUTOMATIC disconnection (network/power loss)
    useEffect(() => {
        // Only reset the disconnect lock if the device ID has actually changed
        if (prevDeviceIdRef.current !== currentDeviceId) {
            isDisconnectingRef.current = false;
            prevDeviceIdRef.current = currentDeviceId;
        }

        const handleDeviceList = (list: Device[]) => {
            if (currentDeviceId) {
                const exists = list.some(d => d.id === currentDeviceId);
                if (!exists) {
                    handleDeviceDisconnect({ device_id: currentDeviceId, was_recording: isRecording });
                }
            }
        };

        const handleDeviceDisconnect = (data: { device_id?: string; was_recording?: boolean } | string) => {
            const disconnectedId = typeof data === 'string' ? data : data.device_id;
            if (disconnectedId !== currentDeviceId) return;

            if (isDisconnectingRef.current) return;
            isDisconnectingRef.current = true;

            const wasRecording = isRecording || (typeof data !== 'string' && data.was_recording);

            // Clear Device ID (Keeps session active in store logic)
            setDeviceId(null); 
            setBpm('--');

            // If it was recording, stop it and notify
            if (wasRecording) {
                setRecording(false); 
                toast(`Recording PAUSED! Device ${disconnectedId} lost connection. Select another device to continue.`, "error");
            } else {
                toast(`Device ${disconnectedId} disconnected`);
            }
        };

        // Handle Reconnection: Re-subscribe if we had a device selected
        const handleReconnection = () => {
            if (currentDeviceId) {
                console.log("[DeviceManager] Socket reconnected, re-subscribing to:", currentDeviceId);
                sendJson({ type: "subscribe_to_device", device_id: currentDeviceId });
            }
        };

        globalEventBus.on(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
        globalEventBus.on(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);
        globalEventBus.on(EVENTS.WS.CONNECTED, handleReconnection);

        return () => {
            globalEventBus.off(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
            globalEventBus.off(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);
            globalEventBus.off(EVENTS.WS.CONNECTED, handleReconnection);
        };
    }, [currentDeviceId, isRecording, setDeviceId, setRecording, toast, setBpm]);
}
