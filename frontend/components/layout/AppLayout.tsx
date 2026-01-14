'use client'

import React, { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { connectWebSocket } from '@/services/socket';
import { useStore } from '@/store/useStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isRecording, incrementTimer } = useStore();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Connect to WebSocket once on mount
    useEffect(() => {
        connectWebSocket();
        
        // Check if already open (if connectWebSocket returned early)
        // or just rely on the onopen handler.
    }, []);

    // Global Recording Timer
    useEffect(() => {
        if (isRecording) {
            if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                    incrementTimer();
                }, 1000);
            }
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isRecording, incrementTimer]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 selection:bg-brand-100 selection:text-brand-900 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <Header />
                <div className="flex-1 overflow-auto bg-slate-50/50 p-4 custom-scrollbar relative z-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
