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
        ? "bg-slate-50/50 border border-slate-100/50 p-4 rounded-xl"
        : "bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 px-8 py-5 h-full transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500";

    return (
        <div className={clsx("grid gap-6 h-full", className || "grid-cols-2")}>
            <div className={clsx("flex flex-col justify-between group relative overflow-hidden", cardBase)}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-rose-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Heart size={120} strokeWidth={1} />
                </div>

                <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-md flex items-center justify-center shadow-sm border border-rose-100/50">
                            <Activity size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Heart Rate</p>
                            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></span>
                                Live Pulse
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-baseline gap-2 mt-2 relative z-10">
                    <span className="text-5xl font-black text-slate-800 tracking-tighter leading-none animate-in slide-in-from-bottom-2 duration-500">{bpm}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">BPM</span>
                </div>
            </div>

            <div className={clsx("flex flex-col justify-between group relative overflow-hidden", cardBase)}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-teal-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Timer size={120} strokeWidth={1} />
                </div>

                <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center shadow-sm border border-teal-100/50">
                            <Timer size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Session</p>
                            <p className="text-[9px] font-bold text-teal-500 uppercase tracking-widest mt-0.5">Duration</p>
                        </div>
                    </div>
                </div>

                <div className="mt-2 relative z-10">
                    <span className="text-3xl font-black text-slate-800 tracking-tight leading-none font-mono">
                        {formatDuration(recordingSeconds)}
                    </span>
                </div>
            </div>
        </div>
    );
}
