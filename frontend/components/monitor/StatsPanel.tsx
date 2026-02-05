'use client';

import { useStore } from '@/store/useStore';
import { formatDuration } from '@/utils/helpers';
import { Timer, Activity, Heart } from 'lucide-react';
import clsx from 'clsx';

interface StatsPanelProps {
    className?: string;
    variant?: 'default' | 'minimal';
}

export default function StatsPanel({ className, variant = 'default' }: StatsPanelProps) {
    const { recordingSeconds, bpm } = useStore();

    const cardBase = variant === 'minimal'
        ? "bg-slate-50/50 border border-slate-100/50 p-4 rounded-md"
        : "bg-white rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 px-6 py-4 h-full transition-all duration-500 flex flex-col justify-between relative overflow-hidden";

    return (
        <div className={clsx("grid gap-4 h-full", className || "grid-cols-2")}>
            {/* Heart Rate Card */}
            <div className={clsx(cardBase)}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-rose-900 pointer-events-none transition-transform duration-700">
                    <Heart size={100} strokeWidth={1} />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-md flex items-center justify-center shadow-sm border border-rose-100/50 shrink-0">
                            <Activity size={16} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">Heart Rate</p>
                            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-1 leading-none flex items-center gap-1">
                                <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></span>
                                Live Pulse
                            </p>
                        </div>
                    </div>

                    <h3 className="font-black text-slate-800 tracking-tight leading-none flex items-baseline gap-1.5">
                        <span className="text-3xl">{bpm}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BPM</span>
                    </h3>
                    
                    <div className="flex items-center gap-2 text-slate-300 py-1">
                        <span className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-rose-400 w-1/3 rounded-full animate-medical-shimmer"></div>
                        </span>
                    </div>
                </div>
            </div>

            {/* Session Duration Card */}
            <div className={clsx(cardBase)}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-teal-900 pointer-events-none transition-transform duration-700">
                    <Timer size={100} strokeWidth={1} />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center shadow-sm border border-teal-100/50 shrink-0">
                            <Timer size={16} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">Session</p>
                            <p className="text-[9px] font-bold text-teal-500 uppercase tracking-widest mt-1 leading-none">
                                Duration
                            </p>
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none font-mono">
                        {formatDuration(recordingSeconds)}
                    </h3>

                    <div className="flex items-center gap-2 text-slate-300 py-1">
                        <span className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-teal-400 w-1/3 rounded-full animate-medical-shimmer"></div>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
