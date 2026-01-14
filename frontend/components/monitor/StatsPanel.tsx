'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { formatDuration } from '@/utils/helpers';

export default function StatsPanel() {
    const { recordingSeconds, bpm } = useStore();

    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            {/* Heart Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between relative overflow-hidden h-full">
                <div className="flex justify-between items-start z-10">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Heart Rate</h3>
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                </div>
                <div className="flex items-baseline gap-1 mt-1 z-10">
                    <span className="text-4xl font-mono font-bold text-slate-800">{bpm}</span>
                    <span className="text-xs font-medium text-slate-400">BPM</span>
                </div>
                {/* Decoration SVG */}
                <svg className="absolute -bottom-2 -right-2 w-16 h-16 text-rose-50 opacity-50 z-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between h-full">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</h3>
                <div className="flex items-center flex-1">
                    <span className="text-3xl font-mono font-bold text-slate-700">
                        {formatDuration(recordingSeconds)}
                    </span>
                </div>
            </div>
        </div>
    );
}
