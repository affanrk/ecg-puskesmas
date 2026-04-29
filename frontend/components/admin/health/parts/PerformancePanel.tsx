import clsx from 'clsx';
import { Activity, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';

import { HealthData } from '@/types/models';

interface PerformancePanelProps {
    performance: HealthData['performance'];
    components: HealthData['components'];
    buffers: HealthData['buffers'];
}

export function PerformancePanel({ performance, components, buffers }: PerformancePanelProps) {
    return (
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
    );
}
