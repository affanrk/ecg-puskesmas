'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { disconnectWebSocket, sendJson } from '@/services/socket';
import { useCallback } from 'react';

export function useAuth() {
    const router = useRouter();
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

        disconnectWebSocket();
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        setUser(null);

        router.push('/login');
    }, [isRecording, router, setUser]);

    return {
        user,
        logout,
        isAuthenticated: !!user
    };
}
