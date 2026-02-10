'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { 
    Activity, 
    Database, 
    Cpu, 
    Wifi, 
    RefreshCcw,
    Server,
    HardDrive,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';

interface HealthData {
    status: string;
    timestamp: number;
    components: {
        database: { status: string; latency_ms?: number; error?: string };
        mqtt: { status: string };
        ml_model: { status: string };
        devices: { active: number; recording: number };
    };
    buffers: {
        recording_batch_size: number;
        mobile_batch_size: number;
    };
    performance: {
        avg_latency_ms: number;
        avg_jitter_ms: number;
        avg_packet_loss_pct: number;
    };
}

export default function SystemHealthPage() {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const { show: toast } = useToast();
    const isFetching = useRef(false);

    const loadHealth = useCallback(async (silent = false) => {
        if (isFetching.current) return;
        isFetching.current = true;
        if (!silent) setLoading(true);
        try {
            const data = await api.fetchDetailedHealth();
            setHealthData(data);
        } catch {
            toast("Failed to load system health", "error");
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [toast]);

    useEffect(() => {
        loadHealth();
        const interval = setInterval(() => loadHealth(true), 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, [loadHealth]);

    if (loading && !healthData) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-20">
                <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Diagnosing System...</p>
            </div>
        );
    }

    if (!healthData) return null;

    const { status, components, buffers, performance } = healthData;

    const StatusBadge = ({ isHealthy, label }: { isHealthy: boolean, label: string }) => (
        <div className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
            isHealthy 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
        )}>
            {isHealthy ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {label}
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
            <div className="h-[72px] shrink-0 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 shadow-sm border border-rose-100/50">
                        <Activity size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">System Health</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Backend Infrastructure Monitoring</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
                        <div className={clsx(
                            "text-xs font-black uppercase tracking-tighter flex items-center gap-1.5",
                            status === 'healthy' ? "text-emerald-500" : "text-rose-500"
                        )}>
                            <span className={clsx("w-2 h-2 rounded-full", status === 'healthy' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse")}></span>
                            {status}
                        </div>
                    </div>
                    <button 
                        onClick={() => loadHealth()}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-md hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
                    >
                        <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Database Health */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Database size={24} />
                            </div>
                            <StatusBadge isHealthy={components.database.status === 'healthy'} label="PostgreSQL" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Database Connectivity</h3>
                            <p className="text-2xl font-black text-slate-700 tracking-tighter tabular-nums">
                                {components.database.latency_ms || 0}<span className="text-xs text-slate-400 font-bold ml-1 uppercase">ms Latency</span>
                            </p>
                        </div>
                    </div>

                    {/* MQTT Health */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Wifi size={24} />
                            </div>
                            <StatusBadge isHealthy={components.mqtt.status === 'connected'} label="Mosquitto" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Message Broker</h3>
                            <p className="text-2xl font-black text-slate-700 tracking-tighter tabular-nums">
                                {components.mqtt.status.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    {/* ML Model Health */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                                <Cpu size={24} />
                            </div>
                            <StatusBadge isHealthy={components.ml_model.status === 'loaded'} label="AI Engine" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">ECG Neural Model</h3>
                            <p className="text-2xl font-black text-slate-700 tracking-tighter tabular-nums">
                                {components.ml_model.status === 'loaded' ? 'OPERATIONAL' : 'OFFLINE'}
                            </p>
                        </div>
                    </div>

                    {/* Active Devices */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                                    <Server size={20} />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Hardware Nodes</h3>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-center">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Connected</span>
                                    <span className="text-sm font-black text-slate-700 leading-none">{components.devices.active}</span>
                                </div>
                                <div className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-center">
                                    <span className="block text-[8px] font-black text-rose-400 uppercase leading-none mb-1">Streaming</span>
                                    <span className="text-sm font-black text-rose-600 leading-none">{components.devices.recording}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Avg System Latency</span>
                                <p className="text-xl font-black text-slate-700 tracking-tighter">{performance.avg_latency_ms?.toFixed(1) || 0}<span className="text-[10px] ml-1">ms</span></p>
                            </div>
                            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Jitter Stability</span>
                                <p className="text-xl font-black text-slate-700 tracking-tighter">{performance.avg_jitter_ms?.toFixed(1) || 0}<span className="text-[10px] ml-1">ms</span></p>
                            </div>
                            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Global Packet Loss</span>
                                <p className={clsx("text-xl font-black tracking-tighter", performance.avg_packet_loss_pct > 5 ? "text-rose-500" : "text-emerald-500")}>
                                    {performance.avg_packet_loss_pct?.toFixed(1) || 0}<span className="text-[10px] ml-1">%</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Buffer Management */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                                <HardDrive size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Stream Buffers</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    <span>Sync Pipeline</span>
                                    <span>{buffers.recording_batch_size} Objects</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-teal-500 transition-all duration-1000" 
                                        style={{ width: `${Math.min(100, (buffers.recording_batch_size / 2000) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                    Buffers are auto-flushed to PostgreSQL every 1.0s or when chunk size (2000) is reached.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
