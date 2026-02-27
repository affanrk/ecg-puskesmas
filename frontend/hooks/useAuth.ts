'use client';

import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { terminateWebSocket, sendJson } from '@/services/socket';
import { useCallback } from 'react';

export function useAuth() {
    const { user, setUser, isRecording } = useStore();

    const logout = useCallback(async () => {
        if (isRecording) {
            const { currentDeviceId } = useStore.getState();
            if (currentDeviceId) {
                try {
                    sendJson({ type: "stop_recording", device_id: currentDeviceId });
                } catch (e) {
                    console.error("[useAuth] Failed to send stop_recording:", e);
                }
            }
        }

        try {
            await api.logout();
        } catch (e) {
            console.error("[useAuth] Server-side logout error:", e);
        }

        terminateWebSocket();
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        setUser(null);

        if (typeof window !== 'undefined') {
            (window as { __is_logging_out?: boolean } & Window).__is_logging_out = true;
        }

        window.location.replace('/login');
    }, [isRecording, setUser]);

    return {
        user,
        logout,
        isAuthenticated: !!user
    };
}
