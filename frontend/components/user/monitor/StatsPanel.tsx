'use client';

import { useStore } from '@/store/useStore';
import { formatDuration } from '@/utils/helpers';
import { Timer, Heart } from 'lucide-react';
import clsx from 'clsx';

interface StatsPanelProps {
    className?: string;
    variant?: 'default' | 'minimal';
}

export default function StatsPanel({ className }: StatsPanelProps) {
    const { recordingSeconds, bpm } = useStore();

    const cardBase = "bg-white p-4 h-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 border-none group";

    return (
        <div className={clsx("grid gap-px bg-slate-200 h-full", className || "grid-cols-2")}>
            <div className={cardBase}>
                <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-rose-900 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                    <Heart size={60} strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-6xl font-black text-rose-600 tracking-tighter tabular-nums leading-none drop-shadow-sm">{bpm}</span>
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mt-1.5">BPM</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4 px-2 py-0.5 bg-rose-50 rounded-full border border-rose-100/50">
                        <span className="w-1 h-1 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
                        <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Live</span>
                    </div>
                </div>
            </div>

            <div className={cardBase}>
                <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-teal-900 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                    <Timer size={60} strokeWidth={1} />
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-slate-800 tracking-tight tabular-nums font-mono leading-none drop-shadow-sm">
                        {formatDuration(recordingSeconds)}
                    </span>
                    <div className="flex items-center gap-1.5 mt-4 px-2 py-0.5 bg-teal-50 rounded-full border border-teal-100/50">
                        <Timer size={10} className="text-teal-600" />
                        <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">REC</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
