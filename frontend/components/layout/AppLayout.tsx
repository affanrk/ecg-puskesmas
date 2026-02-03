'use client';

import { useEffect, ReactNode, useRef } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '@/store/useStore';
import { connectWebSocket } from '@/services/socket';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import clsx from 'clsx';

export default function AppLayout({ children }: { children: ReactNode }) {
    const { isRecording, updateTimer, isSidebarPinned } = useStore();
    const isMounted = useRef(false);

    useDeviceManager();

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            connectWebSocket();
        }
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                updateTimer();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording, updateTimer]);

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
                <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-6 relative custom-scrollbar bg-white">
                    {children}
                </main>
            </div>
        </div>
    );
}