'use client';

import { useEffect, useCallback, useRef } from 'react';
import {
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
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useStore } from '@/store/useStore';

function HealthCard({ title, subtitle, icon, isHealthy, color, value }: { title: string, subtitle: string, icon: React.ReactNode, isHealthy: boolean, color: 'indigo' | 'amber' | 'rose', value: string }) {
    const colors: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100"
    };
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", colors[color])}>
                    {icon}
                </div>
                <div className={clsx(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                    isHealthy ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
                )}>
                    {isHealthy ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                    {isHealthy ? 'Healthy' : 'Error'}
                </div>
            </div>
            <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</h4>
                <p className="text-sm font-black text-slate-800 truncate mb-2">{subtitle}</p>
                <div className="h-px w-full bg-slate-50 mb-3" />
                <p className="text-xl font-black text-slate-700 tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function Metric({ badge, value, color }: { badge: string, value: number, color: 'slate' | 'rose' }) {
    return (
        <div className={clsx(
            "px-4 py-2 border rounded-lg text-center min-w-[100px]",
            color === 'slate' ? "bg-slate-50 border-slate-100" : "bg-rose-50 border-rose-100"
        )}>
            <span className={clsx("block text-[8px] font-black uppercase leading-none mb-1.5", color === 'slate' ? "text-slate-400" : "text-rose-400")}>{badge}</span>
            <span className={clsx("text-lg font-black leading-none", color === 'slate' ? "text-slate-700" : "text-rose-600")}>{value}</span>
        </div>
    );
}

function PerformanceBox({ label, value, isWarning = false }: { label: string, value: string, isWarning?: boolean }) {
    return (
        <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 group hover:bg-white hover:shadow-sm transition-all">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{label}</span>
            <p className={clsx("text-xl font-black tracking-tighter", isWarning ? "text-rose-500" : "text-slate-700")}>{value}</p>
        </div>
    );
}

export default function SystemHealthPage() {
    const { healthData, setHealthData, adminLoading, setAdminLoading } = useStore();
    const { show: toast } = useToast();
    const isFetching = useRef(false);

    const loadHealth = useCallback(async (silent = false) => {
        if (isFetching.current) return;
        isFetching.current = true;
        if (!silent) setAdminLoading(true);
        try {
            const data = await api.fetchDetailedHealth();
            setHealthData(data);
        } catch {
            toast("Failed to load system health", "error");
        } finally {
            if (!silent) setAdminLoading(false);
            isFetching.current = false;
        }
    }, [toast, setHealthData, setAdminLoading]);

    useEffect(() => {
        loadHealth();
        const interval = setInterval(() => loadHealth(true), 10000);
        return () => clearInterval(interval);
    }, [loadHealth]);

    if (adminLoading && !healthData) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-20">
                <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Diagnosing System...</p>
            </div>
        );
    }
    if (!healthData) return null;
    const { components, buffers, performance } = healthData;

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 bg-slate-50/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
                    <HealthCard
                        title="PostgreSQL"
                        subtitle="Database Latency"
                        icon={<Database size={20} />}
                        isHealthy={components.database.status === 'healthy'}
                        color="indigo"
                        value={`${components.database.latency_ms || 0}ms`}
                    />
                    <HealthCard
                        title="Mosquitto"
                        subtitle="MQTT Connection"
                        icon={<Wifi size={20} />}
                        isHealthy={components.mqtt.status === 'connected'}
                        color="amber"
                        value={components.mqtt.status.toUpperCase()}
                    />
                    <HealthCard
                        title="AI Engine"
                        subtitle="ECG Neural Model"
                        icon={<Cpu size={20} />}
                        isHealthy={components.ml_model.status === 'loaded'}
                        color="rose"
                        value={components.ml_model.status === 'loaded' ? 'ACTIVE' : 'OFFLINE'}
                    />
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                                <HardDrive size={20} />
                            </div>
                            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Stream Buffers</h3>
                        </div>
                        <div>
                            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                <span>Sync Queue</span>
                                <span>{buffers.recording_batch_size}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-teal-500 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (buffers.recording_batch_size / 2000) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sm:col-span-2 lg:col-span-3 xl:col-span-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                                    <Server size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">System Performance</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Node Metrics</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Metric badge="Connected" value={components.devices.active} color="slate" />
                                <Metric badge="Streaming" value={components.devices.recording} color="rose" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <PerformanceBox label="System Latency" value={`${performance.avg_latency_ms?.toFixed(1) || 0}ms`} />
                            <PerformanceBox label="Jitter Stability" value={`${performance.avg_jitter_ms?.toFixed(1) || 0}ms`} />
                            <PerformanceBox label="Packet Loss" value={`${performance.avg_packet_loss_pct?.toFixed(1) || 0}%`} isWarning={performance.avg_packet_loss_pct > 5} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
