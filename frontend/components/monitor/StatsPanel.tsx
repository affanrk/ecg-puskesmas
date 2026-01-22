'use client';

import { useStore } from '@/store/useStore';
import { formatDuration } from '@/utils/helpers';
import { Timer, Activity } from 'lucide-react';
import clsx from 'clsx';

interface StatsPanelProps {
    className?: string;
    variant?: 'default' | 'minimal';
}

export default function StatsPanel({ className, variant = 'default' }: StatsPanelProps) {
    // 1. Hooks & State
    const { recordingSeconds, bpm } = useStore();

    const cardClass = variant === 'minimal' 
        ? "bg-slate-50/50 border border-slate-100/50" 
        : "bg-white border-slate-200 shadow-sm";

    // 2. Render
    return (
        <div className={clsx("grid gap-4 h-full", className || "grid-cols-2")}>
            {/* Heart Rate */}
            <div className={clsx("flex flex-col justify-between rounded-xl p-5 h-full group hover:border-rose-300 transition-colors border", cardClass)}>
                <div className="flex items-start justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Heart Rate</p>
                    <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm shrink-0">
                        <div className="relative">
                            <Activity size={20} />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping opacity-75"></span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{bpm}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">BPM</span>
                </div>
            </div>

            {/* Duration */}
            <div className={clsx("flex flex-col justify-between rounded-xl p-5 h-full group hover:border-slate-300 transition-colors border", cardClass)}>
                <div className="flex items-start justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Session Duration</p>
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-all shadow-sm shrink-0">
                        <Timer size={20} />
                    </div>
                </div>

                <div className="mt-2">
                    <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                        {formatDuration(recordingSeconds)}
                    </span>
                </div>
            </div>
        </div>
    );
}
