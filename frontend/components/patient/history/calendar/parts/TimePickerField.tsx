import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface TimePickerFieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    compact?: boolean;
}

export function TimePickerField({ value, onChange, compact = false }: TimePickerFieldProps) {
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
            <button 
                onClick={() => setOpen(!open)}
                className={clsx(
                    "bg-white border border-slate-200 rounded-md flex items-center font-black text-slate-700 hover:border-blue-300 transition-all shadow-sm group relative cursor-pointer",
                    compact ? "w-full sm:w-32 px-2 py-2 text-[10px]" : "w-full sm:w-44 px-3 py-2.5 text-xs"
                )}
            >
                <div className={clsx("flex items-center gap-1 font-mono tracking-tighter pl-1", compact ? "text-xs" : "text-sm")}>
                    <span className="text-blue-600">{h}</span>
                    <span className="text-slate-300">:</span>
                    <span className="text-blue-600">{m}</span>
                    <span className="text-slate-300">:</span>
                    <span className="text-blue-600">{s}</span>
                </div>
                <ChevronDown size={compact ? 12 : 14} className={clsx("absolute right-2 text-slate-400 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="absolute top-full left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 mt-1 w-64 bg-white border border-slate-100 rounded-md shadow-2xl z-50 flex h-64 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                    <div className="flex-1 overflow-y-auto border-r border-slate-50 no-scrollbar hover:bg-slate-50/30 transition-colors">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[8px] font-black text-slate-300 text-center py-1 uppercase border-b border-slate-50">HH</div>
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                            <button key={v} onClick={() => setPart(0, v)} className={clsx("w-full py-2 text-[11px] font-bold transition-colors cursor-pointer", h === v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50")}>{v}</button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto border-r border-slate-50 no-scrollbar hover:bg-slate-50/30 transition-colors">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[8px] font-black text-slate-300 text-center py-1 uppercase border-b border-slate-50">MM</div>
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                            <button key={v} onClick={() => setPart(1, v)} className={clsx("w-full py-2 text-[11px] font-bold transition-colors cursor-pointer", m === v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50")}>{v}</button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar hover:bg-slate-50/30 transition-colors">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[8px] font-black text-slate-300 text-center py-1 uppercase border-b border-slate-50">SS</div>
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(v => (
                            <button key={v} onClick={() => setPart(2, v)} className={clsx("w-full py-2 text-[11px] font-bold transition-colors cursor-pointer", s === v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50")}>{v}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}