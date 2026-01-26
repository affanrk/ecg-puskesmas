'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import PerformanceChart from '@/components/performance/PerformanceChart';
import { Activity, Wifi, AlertTriangle, Zap, Server } from 'lucide-react';
import clsx from 'clsx';

export default function PerformancePage() {
    // 1. Hooks & State
    const { performance, setPerformanceTrackingEnabled } = useStore();

    // 2. Effects
    useEffect(() => {
        setPerformanceTrackingEnabled(true);
        return () => setPerformanceTrackingEnabled(false);
    }, [setPerformanceTrackingEnabled]);

    // Common Card Styles
    const cardClass = "bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-5 flex flex-col justify-between group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden";

    // 3. Render
    return (
        <div className="flex flex-col gap-6 w-full h-full min-h-0 overflow-hidden">
            {/* Header / Title */}
            <div className="flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/10 border border-slate-100">
                    <Activity size={24} className="text-teal-500" strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">System Telemetry</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network & Signal Diagnostics</p>
                    </div>
                </div>
            </div>

            {/* Real-time Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 h-28">
                {/* Latency Card */}
                <div className={cardClass}>
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-teal-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Wifi size={80} strokeWidth={1} />
                    </div>
                    
                    <div className="relative z-10 flex items-center justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={clsx("w-2 h-2 rounded-full animate-pulse", performance.latency < 100 ? "bg-teal-500" : "bg-amber-500")}></span>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Latency</h4>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className={clsx(
                                    "text-4xl font-black tracking-tighter transition-colors duration-300",
                                    performance.latency < 100 ? "text-slate-800" : "text-amber-500"
                                )}>
                                    {performance.latency}
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ms</span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50 shadow-sm">
                            <Wifi size={22} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Jitter Card */}
                <div className={cardClass}>
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-blue-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Zap size={90} strokeWidth={1} />
                    </div>
                    
                    <div className="relative z-10 flex items-center justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Jitter</h4>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter">
                                    {performance.jitter}
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ms</span>
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50 shadow-sm">
                            <Activity size={22} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Packet Loss Card */}
                <div className={clsx(cardClass, performance.loss > 0 && "border-rose-100 bg-rose-50/10")}>
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-rose-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <AlertTriangle size={90} strokeWidth={1} />
                    </div>
                    
                    <div className="relative z-10 flex items-center justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={clsx("w-2 h-2 rounded-full animate-pulse", performance.loss > 0 ? "bg-rose-500" : "bg-emerald-500")}></span>
                                <h4 className={clsx("text-[10px] font-black uppercase tracking-[0.2em]", performance.loss > 0 ? "text-rose-500" : "text-slate-400")}>Packet Loss</h4>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className={clsx(
                                    "text-4xl font-black tracking-tighter transition-colors duration-300",
                                    performance.loss > 0 ? "text-rose-600" : "text-slate-800"
                                )}>
                                    {performance.loss}
                                </span>
                                <span className={clsx("text-xs font-bold uppercase tracking-widest", performance.loss > 0 ? "text-rose-400" : "text-slate-400")}>%</span>
                            </div>
                        </div>
                        <div className={clsx(
                            "w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm transition-colors",
                            performance.loss > 0 ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                            <AlertTriangle size={22} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Latency Chart */}
                <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-6 flex flex-col relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                                <Server size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 tracking-tight">Latency History</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Live Stream</span>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">50 PTS</span>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative z-10">
                        <PerformanceChart 
                            data={performance.latencyHistory} 
                            color="#14b8a6" 
                            label="Latency"
                            suggestedMax={100}
                        />
                    </div>
                </div>

                {/* Jitter Chart */}
                <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-6 flex flex-col relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <Zap size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 tracking-tight">Jitter Stability</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Live Stream</span>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">50 PTS</span>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative z-10">
                        <PerformanceChart 
                            data={performance.jitterHistory} 
                            color="#3b82f6" 
                            label="Jitter"
                            suggestedMax={50}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
