'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import DashboardLayout from './DashboardLayout';
import { useStore } from '@/store/useStore';
import { connectWebSocket } from '@/services/socket';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useDeviceListeners } from '@/hooks/useDeviceListeners';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useToast } from '@/hooks/useToast';

export default function AppLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const user = useStore(state => state.user);
    const isRecording = useStore(state => state.isRecording);
    const updateTimer = useStore(state => state.updateTimer);
    const { show: toast } = useToast();
    const isMounted = useRef(false);

    useDeviceManager();
    useDeviceListeners();
    useSessionManager();

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            connectWebSocket();
        }
        if (user && (user.role === 'admin' || user.role === 'superadmin')) {
            toast("Access Restricted: Redirecting to Dashboard", "error");
            const target = user.role === 'superadmin' ? '/superadmin/dashboard' : '/admin/dashboard';
            router.replace(target);
        }
    }, [user, router, toast]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                updateTimer();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording, updateTimer]);

    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        return null;
    }

    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    );
}
