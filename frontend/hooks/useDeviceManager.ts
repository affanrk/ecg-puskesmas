'use client';

import { useState, useEffect } from 'react';
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
    const { currentDeviceId, setDeviceId, isRecording, patient, setRecording, setPatient, devices, setDevices } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        const handleDeviceList = (list: Device[]) => {
            if (currentDeviceId) {
                const exists = list.some(d => d.id === currentDeviceId);
                if (!exists) {
                    handleDeviceDisconnect({ device_id: currentDeviceId, was_recording: isRecording });
                }
            }
        };

        const handleDeviceDisconnect = (data: any) => {
            const disconnectedId = data.device_id || data;
            if (disconnectedId !== currentDeviceId) return;

            const wasRecording = isRecording || data.was_recording;
            const hasPatient = !!patient;

            setDeviceId(null);

            if (wasRecording) {
                setRecording(false);
                alert(`Recording Stopped! Connection lost with device ${disconnectedId}.`);
            } else {
                toast(`Device ${disconnectedId} disconnected`, "warning");
            }

            if (!wasRecording && !hasPatient) {
                setPatient(null);
            }
        };

        globalEventBus.on(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
        globalEventBus.on(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);

        return () => {
            globalEventBus.off(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
            globalEventBus.off(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);
        };
    }, [currentDeviceId, isRecording, patient, setDeviceId, setRecording, setPatient, toast]);

    const selectDevice = (deviceId: string) => {
        if (deviceId === currentDeviceId) return;

        if (isRecording) {
            if (!confirm("Recording is in progress. Stop and switch?")) return;
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
        }

        if (currentDeviceId) {
            sendJson({ type: "unsubscribe" });
        }

        setDeviceId(deviceId);

        if (deviceId) {
            sendJson({ type: "subscribe_to_device", device_id: deviceId });
        }
    };

    const disconnectDevice = () => {
        if (!currentDeviceId) return;
        selectDevice(""); 
    };

    return {
        devices,
        currentDeviceId,
        selectDevice,
        disconnectDevice
    };
}
