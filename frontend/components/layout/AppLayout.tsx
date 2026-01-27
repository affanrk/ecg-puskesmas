'use client';

import { useEffect, ReactNode, useRef } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '@/store/useStore';
import { connectWebSocket } from '@/services/socket';
import clsx from 'clsx';

export default function AppLayout({ children }: { children: ReactNode }) {
    // 1. Hooks & State
    const { isRecording, updateTimer, isSidebarPinned } = useStore();
    const isMounted = useRef(false);

    // 2. Effects
    // Initialize WebSocket
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            connectWebSocket();
        }
    }, []);

    // Global Timer Interval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                updateTimer();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording, updateTimer]);

    // 3. Render
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
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
