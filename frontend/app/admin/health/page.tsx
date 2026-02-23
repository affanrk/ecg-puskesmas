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
    CheckCircle2,
    Activity
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
        <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-all h-full">
            <div className="flex items-start justify-between mb-2">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", colors[color])}>
                    {icon}
                </div>
                <div className={clsx(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0",
                    isHealthy ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
                )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", isHealthy ? "bg-emerald-500" : "bg-rose-500")} />
                    {isHealthy ? 'Healthy' : 'Error'}
                </div>
            </div>
            <div className="mt-auto">
                <div className="flex flex-col gap-0.5 mb-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
                    <p className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0">{subtitle}</p>
                </div>
                <p className="text-2xl lg:text-3xl font-black text-slate-700 tracking-tighter leading-none">{value}</p>
            </div>
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
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-5 lg:p-6 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="shrink-0 h-[32%] min-h-[180px] flex flex-col">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                    <Server size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Core Infrastructure</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 flex-1">
                    <HealthCard
                        title="PostgreSQL"
                        subtitle="Database Engine"
                        icon={<Database size={20} />}
                        isHealthy={components.database.status === 'healthy'}
                        color="indigo"
                        value={`${components.database.latency_ms || 0}ms`}
                    />
                    <HealthCard
                        title="Mosquitto"
                        subtitle="MQTT Broker"
                        icon={<Wifi size={20} />}
                        isHealthy={components.mqtt.status === 'connected'}
                        color="amber"
                        value={components.mqtt.status.toUpperCase()}
                    />
                    <HealthCard
                        title="AI Engine"
                        subtitle="Neural Analysis"
                        icon={<Cpu size={20} />}
                        isHealthy={components.ml_model.status === 'loaded'}
                        color="rose"
                        value={components.ml_model.status === 'loaded' ? 'ACTIVE' : 'OFFLINE'}
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data Stream Performance</h3>
                </div>
                <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm p-6 lg:p-8 flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <Activity size={240} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10 pt-2">
                        <div className="space-y-1">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Global Latency</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter">{performance.avg_latency_ms?.toFixed(1) || 0}</span>
                                <span className="text-sm font-bold text-slate-400 uppercase">ms</span>
                            </div>
                            <div className="pt-2 flex items-center gap-2 text-emerald-500">
                                <CheckCircle2 size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Optimal Connection</span>
                            </div>
                        </div>

                        <div className="space-y-1 border-x border-slate-50 px-8">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Jitter Variance</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl lg:text-5xl font-black text-slate-800 tracking-tighter">{performance.avg_jitter_ms?.toFixed(1) || 0}</span>
                                <span className="text-sm font-bold text-slate-400 uppercase">ms</span>
                            </div>
                            <p className="pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">Standard Deviation</p>
                        </div>

                        <div className="space-y-1 pl-8">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Packet Loss</span>
                            <div className="flex items-baseline gap-2">
                                <span className={clsx("text-4xl lg:text-5xl font-black tracking-tighter", performance.avg_packet_loss_pct > 5 ? "text-rose-500" : "text-slate-800")}>
                                    {performance.avg_packet_loss_pct?.toFixed(1) || 0}
                                </span>
                                <span className="text-sm font-bold text-slate-400 uppercase">%</span>
                            </div>
                            <div className={clsx("pt-2 flex items-center gap-2", performance.avg_packet_loss_pct > 5 ? "text-rose-500" : "text-emerald-500")}>
                                {performance.avg_packet_loss_pct > 5 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                    {performance.avg_packet_loss_pct > 5 ? 'High Loss Detected' : 'Stable Delivery'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-6 items-center">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Nodes</span>
                            <span className="text-2xl font-black text-slate-700 leading-none">{components.devices.active}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Live Streams</span>
                            <span className="text-2xl font-black text-rose-600 leading-none">{components.devices.recording}</span>
                        </div>
                        <div className="sm:col-span-2 bg-slate-50/50 rounded-lg p-3 flex flex-col justify-center border border-slate-100/50">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <HardDrive size={12} /> Sync Queue
                                </span>
                                <span className="text-[10px] font-mono font-black text-slate-600">{buffers.recording_batch_size} pkts</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-teal-500 transition-all duration-1000 shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                                    style={{ width: `${Math.min(100, (buffers.recording_batch_size / 2000) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
