'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '@/store/useStore';
import { connectWebSocket } from '@/services/socket';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useDeviceListeners } from '@/hooks/useDeviceListeners';
import clsx from 'clsx';

export default function AppLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, isRecording, updateTimer, isSidebarPinned } = useStore();
    const isMounted = useRef(false);

    useDeviceManager();
    useDeviceListeners();

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            connectWebSocket();
        }
        if (user && user.role === 'admin') {
            router.replace('/admin/approvals');
        }
    }, [user, router]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                updateTimer();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording, updateTimer]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isRecording) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRecording]);

    if (user && user.role === 'admin') {
        return null;
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600">
            <Sidebar />
            <div 
                className={clsx(
                    "flex-1 flex flex-col min-w-0 bg-white shadow-2xl relative z-10 overflow-hidden transition-all duration-300 ease-in-out",
                    isSidebarPinned ? "lg:pl-72" : "lg:pl-8"
                )}
            >
                <Header />
                <main className="flex-1 flex flex-col overflow-hidden relative custom-scrollbar bg-white">
                    {children}
                </main>
            </div>
        </div>
    );
}
