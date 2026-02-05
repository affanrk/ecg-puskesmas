'use client';

import { AnalysisResult } from '@/store/useStore';
import { HeartPulse, Activity, AlertTriangle, ChevronRight, Clock, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';

interface AgendaViewProps {
    results: AnalysisResult[];
    onResultClick: (result: AnalysisResult) => void;
    startTime: string;
    endTime: string;
    onStartTimeChange: (val: string) => void;
    onEndTimeChange: (val: string) => void;
    loading?: boolean;
}

export default function AgendaView({ 
    results, 
    onResultClick,
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    loading
}: AgendaViewProps) {
    // Filter out normal ones
    const filteredResults = results.filter(r => {
        const cls = r.classification?.toLowerCase() || '';
        return !cls.includes('normal');
    });

    return (
        <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500 pb-10 relative">
            {/* Granular Time Range Selector */}
            <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-md flex flex-col lg:flex-row items-start lg:items-center gap-6 shrink-0">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Clock size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest block leading-none">Filter Presisi</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block leading-none">Skala Jam : Menit : Detik</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <TimePickerField 
                        label="Dari Waktu" 
                        value={startTime} 
                        onChange={onStartTimeChange} 
                    />
                    
                    <div className="hidden lg:block text-slate-300">
                        <Activity size={12} />
                    </div>

                    <TimePickerField 
                        label="Sampai Waktu" 
                        value={endTime} 
                        onChange={onEndTimeChange} 
                    />
                </div>
            </div>

            <div className="relative flex-1 min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-40 z-20 bg-white/50 backdrop-blur-[1px]">
                        <div className="animate-spin text-blue-500">
                            <Clock size={48} strokeWidth={2.5} />
                        </div>
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Syncing precision logs...</span>
                    </div>
                )}

                <div className="flex flex-col gap-8 h-full">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-md flex items-center justify-center font-black text-sm shadow-lg shadow-blue-100">
                                {filteredResults.length}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Rekaman Klinis</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Hasil ditemukan pada koordinat waktu terpilih</p>
                            </div>
                        </div>
                    </div>
                    
                    {filteredResults.length === 0 && !loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
                            <div className="w-20 h-20 bg-slate-50 rounded-md flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                                <Activity size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight text-center">Tidak ada data potensi atau abnormal di sini</h3>
                            <p className="text-[10px] text-slate-400 mt-2 max-w-xs text-center uppercase tracking-[0.2em] font-black leading-relaxed">Sesuaikan rentang waktu atau pilih tanggal lain</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredResults.map((result) => {
                                const time = new Date(result.changed_dt || result.timestamp);
                                const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                                
                                const cls = result.classification?.toLowerCase() || '';
                                const isHighRisk = cls.includes('sangat berpotensi') || cls.includes('high risk');
                                const isPotential = cls.includes('berpotensi') || cls.includes('potential');

                                return (
                                    <button
                                        key={result.recording_id}
                                        onClick={() => onResultClick(result)}
                                        className="group flex items-stretch bg-white border border-slate-100 rounded-md overflow-hidden hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300 text-left"
                                    >
                                        <div className="w-24 sm:w-32 flex flex-col items-center justify-center border-r border-slate-50 shrink-0 bg-slate-50/30 group-hover:bg-blue-50/30 transition-colors">
                                            <span className="text-lg sm:text-xl font-black text-slate-800 tracking-tighter">{timeStr}</span>
                                            <span className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest font-mono">Precision Log</span>
                                        </div>

                                        <div className="flex-1 p-4 sm:p-5 flex items-center gap-5 min-w-0">
                                            <div className={clsx(
                                                "w-12 h-12 rounded-md flex items-center justify-center shrink-0 border transition-all duration-500 group-hover:scale-110 shadow-sm",
                                                isHighRisk ? "bg-rose-500 border-rose-600 text-white shadow-rose-100" :
                                                isPotential ? "bg-orange-500 border-orange-600 text-white shadow-orange-100" :
                                                "bg-slate-700 border-slate-800 text-white shadow-slate-100"
                                            )}>
                                                {isHighRisk ? <HeartPulse size={24} strokeWidth={2.5} /> :
                                                 isPotential ? <AlertTriangle size={24} strokeWidth={2.5} /> :
                                                 <Activity size={24} strokeWidth={2.5} />
                                                }
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className={clsx(
                                                        "px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.15em] border shadow-sm",
                                                        isHighRisk ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                        isPotential ? "bg-orange-50 text-orange-600 border-orange-100" :
                                                        "bg-slate-50 text-slate-600 border-slate-100"
                                                    )}>
                                                        {isHighRisk ? 'Critical Alert' : isPotential ? 'Potential Risk' : 'Abnormal Wave'}
                                                    </div>
                                                </div>
                                                <h4 className="text-base font-black text-slate-800 truncate leading-tight tracking-tight">
                                                    {result.classification}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center">
                                                            <HeartPulse size={12} className="text-rose-500" />
                                                        </div>
                                                        <span className="text-sm font-black text-slate-700">
                                                            {result.bpm ? Math.round(Number(result.bpm)) : (result.avg_bpm ? Math.round(Number(result.avg_bpm)) : '--')} 
                                                        </span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">BPM Avg</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="shrink-0 p-2 rounded-md border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 transition-all">
                                                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-all" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TimePickerField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const [h, m, s] = value.split(':');

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const setPart = (idx: number, val: string) => {
        const parts = value.split(':');
        parts[idx] = val;
        onChange(parts.join(':'));
    };

    return (
        <div className="relative flex-1 sm:flex-none" ref={ref}>
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1 ml-1 text-center sm:text-left">{label}</div>
            <button 
                onClick={() => setOpen(!open)}
                className="w-full sm:w-44 bg-white border border-slate-200 rounded-md px-3 py-2 flex items-center justify-center sm:justify-between text-xs font-black text-slate-700 hover:border-blue-300 transition-all shadow-sm group"
            >
                <div className="flex items-center gap-1 font-mono text-sm tracking-tighter">
                    <span className="text-blue-600">{h}</span>
                    <span className="text-slate-300">:</span>
                    <span className="text-blue-600">{m}</span>
                    <span className="text-slate-300">:</span>
                    <span className="text-blue-600">{s}</span>
                </div>
                <ChevronDown size={14} className={clsx("ml-2 sm:ml-0 text-slate-400 transition-transform", open && "rotate-180")} />
            </button>
            
            {open && (
                <div className="absolute top-full left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 mt-1 w-64 bg-white border border-slate-100 rounded-md shadow-2xl z-50 flex h-64 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                    {/* Hours */}
                    <div className="flex-1 overflow-y-auto border-r border-slate-50 no-scrollbar hover:bg-slate-50/30 transition-colors">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[8px] font-black text-slate-300 text-center py-1 uppercase border-b border-slate-50">HH</div>
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                            <button key={v} onClick={() => setPart(0, v)} className={clsx("w-full py-2 text-[11px] font-bold transition-colors", h === v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50")}>{v}</button>
                        ))}
                    </div>
                    {/* Minutes */}
                    <div className="flex-1 overflow-y-auto border-r border-slate-50 no-scrollbar hover:bg-slate-50/30 transition-colors">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[8px] font-black text-slate-300 text-center py-1 uppercase border-b border-slate-50">MM</div>
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                            <button key={v} onClick={() => setPart(1, v)} className={clsx("w-full py-2 text-[11px] font-bold transition-colors", m === v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50")}>{v}</button>
                        ))}
                    </div>
                    {/* Seconds */}
                    <div className="flex-1 overflow-y-auto no-scrollbar hover:bg-slate-50/30 transition-colors">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[8px] font-black text-slate-300 text-center py-1 uppercase border-b border-slate-50">SS</div>
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                            <button key={v} onClick={() => setPart(2, v)} className={clsx("w-full py-2 text-[11px] font-bold transition-colors", s === v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50")}>{v}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}