'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';

export interface Device {
    id: string;
    is_locked: boolean;
}

export function useDeviceManager() {
    // 1. Store & Hooks
    const { currentDeviceId, setDeviceId, isRecording, setRecording, devices, setBpm } = useStore();
    const { show: toast } = useToast();

    // 2. Effects
    // Handle AUTOMATIC disconnection (network/power loss)
    useEffect(() => {
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

    // 3. Actions
    // Handle MANUAL selection (Switching devices)
    const selectDevice = (deviceId: string) => {
        if (deviceId === currentDeviceId) return;

        // If recording, stop current (UI should confirm this first)
        if (isRecording) {
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
            setRecording(false);
        }

        // Unsubscribe old
        if (currentDeviceId) {
            sendJson({ type: "unsubscribe" });
        }

        // Set new (Preserves session)
        setDeviceId(deviceId);

        if (deviceId) {
            sendJson({ type: "subscribe_to_device", device_id: deviceId });
        }
    };

    // Handle MANUAL Disconnect button
    const disconnectDevice = () => {
        if (!currentDeviceId) return;

        // If recording, stop (UI should confirm this first)
        if (isRecording) {
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
            setRecording(false);
        }
        
        // Send Unsubscribe
        sendJson({ type: "unsubscribe" });
        
        // Clear Local State
        setDeviceId(null); // Keeps session active
        setBpm('--');
        
        toast("Disconnected from device");
    };

    return {
        devices,
        currentDeviceId,
        selectDevice,
        disconnectDevice
    };
}