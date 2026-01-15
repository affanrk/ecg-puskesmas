'use client';

import React, { useEffect, useState } from 'react';
import DeviceDropdown from '../monitor/DeviceDropdown';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import { User } from 'lucide-react';

export default function Header() {
    const { isRecording, isConnected } = useStore();
    const [userName, setUserName] = useState('User');

    useEffect(() => {
        const userStr = localStorage.getItem('ecg_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.name) setUserName(user.name);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shrink-0 relative">
            <div className="flex items-center gap-4">
                <h1 className="font-bold text-slate-800 text-lg tracking-tight">ECG<span className="text-brand-600 font-extrabold">Live</span></h1>
                <div className="h-5 w-px bg-slate-200 mx-2"></div>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
                    <span className={clsx(
                        "flex w-2 h-2 rounded-full",
                        isConnected ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500"
                    )}></span>
                    <span className={clsx(
                        "text-[10px] font-bold transition-colors uppercase tracking-wider",
                        isConnected ? "text-emerald-700" : "text-rose-700"
                    )}>{isConnected ? "Online" : "Disconnected"}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className={clsx(
                    "items-center gap-2 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 transition-all",
                    isRecording ? "flex" : "hidden"
                )}>
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">RECORDING</span>
                </div>

                <DeviceDropdown />
            </div>
        </header>
    );
}
