'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS, CONFIG } from '@/config/constants';
import PerformanceChart from '@/components/performance/PerformanceChart';
import { Activity, Zap, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export default function PerformancePage() {
    const { performance, setPerformanceTrackingEnabled } = useStore();

    useEffect(() => {
        setPerformanceTrackingEnabled(true);
        return () => setPerformanceTrackingEnabled(false);
    }, [setPerformanceTrackingEnabled]);

    const StatCard = ({ label, value, unit, icon: Icon, colorClass, subText }: any) => (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 relative overflow-hidden group">
            <div className={clsx("absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity", colorClass)}>
                <Icon className="w-16 h-16" />
            </div>
            <div className="relative z-10">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h4>
                <div className="flex items-baseline gap-1">
                    <span className={clsx("text-3xl font-mono font-bold", colorClass)}>{value}</span>
                    <span className="text-xs font-medium text-slate-400">{unit}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">{subText}</p>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 max-w-[1600px] mx-auto">
            {/* Real-time Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latency</h4>
                    <div className="text-2xl font-mono font-bold text-brand-600">{performance.latency} ms</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jitter</h4>
                    <div className="text-2xl font-mono font-bold text-amber-600">{performance.jitter} ms</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Packet Loss</h4>
                    <div className="text-2xl font-mono font-bold text-rose-600">{performance.loss}%</div>
                </div>
            </div>

            {/* Charts */}
            <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Latency History</h4>
                    <div className="h-32 w-full">
                        <PerformanceChart 
                            data={performance.latencyHistory} 
                            color={CONFIG.COLORS.leadI} 
                            label="Latency"
                            suggestedMax={100}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Jitter History</h4>
                    <div className="h-32 w-full">
                        <PerformanceChart 
                            data={performance.jitterHistory} 
                            color={CONFIG.COLORS.v1} 
                            label="Jitter"
                            suggestedMax={50}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}