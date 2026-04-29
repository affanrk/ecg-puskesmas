'use client';

import { useState, useRef, useEffect } from 'react';

import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';

import { CalendarNode } from '@/types/models';

interface CalendarHeaderProps {
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onDateSelect: (date: Date) => void;
    currentDate: Date;
    view: 'month' | 'agenda';
    onViewChange: (view: 'month' | 'agenda') => void;
    monthNodes: CalendarNode[];
    yearNodes: CalendarNode[];
    filters: {
        highRisk: boolean;
        potential: boolean;
        abnormal: boolean;
    };
}

export default function CalendarHeader({ 
    onPrev, 
    onNext, 
    onToday, 
    onDateSelect,
    currentDate,
    view,
    onViewChange,
    monthNodes,
    yearNodes,
    filters
}: CalendarHeaderProps) {
    const [monthOpen, setMonthOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);
    const monthRef = useRef<HTMLDivElement>(null);
    const yearRef = useRef<HTMLDivElement>(null);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (monthRef.current && !monthRef.current.contains(event.target as Node)) setMonthOpen(false);
            if (yearRef.current && !yearRef.current.contains(event.target as Node)) setYearOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getStatusColor = (node?: CalendarNode) => {
        if (!node || !node.classifications) return null;
        const hasHigh = filters.highRisk && (node.classifications['Sangat Berpotensi Aritmia'] || 0) > 0;
        const hasPotential = filters.potential && (node.classifications['Berpotensi Aritmia'] || 0) > 0;
        const hasAbnormal = filters.abnormal && (node.classifications['Abnormal'] || 0) > 0;
        if (hasHigh) return 'bg-rose-500';
        if (hasPotential) return 'bg-orange-500';
        if (hasAbnormal) return 'bg-slate-500';
        return null;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between sm:h-14 2xl:h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md shrink-0 select-none z-30 sticky top-0">
            <div className="flex items-center justify-between w-full sm:w-56 2xl:w-80 gap-3 px-3 sm:px-5 2xl:px-8 border-r border-slate-100 h-full shrink-0">
                <div className="flex items-center gap-2 text-blue-600">
                    <CalendarIcon size={20} className="2xl:w-6 2xl:h-6" strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-3 sm:gap-4 2xl:gap-6 flex-1 sm:flex-none justify-center">
                    <button 
                        onClick={onToday}
                        className="px-3 py-1 2xl:px-5 2xl:py-2 bg-white border border-slate-200 rounded-md text-[9px] sm:text-[10px] 2xl:text-xs font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm uppercase tracking-widest cursor-pointer"
                    >
                        Today
                    </button>
                    <div className="flex items-center bg-slate-50 p-1 2xl:p-1.5 rounded-md border border-slate-100 sm:ml-1">
                        <button onClick={onPrev} className="p-1 sm:p-1 2xl:p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-500 transition-all active:scale-90 cursor-pointer">
                            <ChevronLeft size={14} className="2xl:w-5 2xl:h-5" strokeWidth={2.5} />
                        </button>
                        <button onClick={onNext} className="p-1 sm:p-1 2xl:p-1.5 rounded-md hover:bg-white hover:shadow-sm text-slate-500 transition-all active:scale-90 cursor-pointer">
                            <ChevronRight size={14} className="2xl:w-5 2xl:h-5" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-between px-3 sm:px-5 2xl:px-8 h-full min-w-0">
                <div className="flex items-center gap-1 2xl:gap-2">
                    <div className="relative" ref={monthRef}>
                        <button 
                            onClick={() => setMonthOpen(!monthOpen)}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 2xl:px-4 py-2 hover:bg-slate-50 rounded-md transition-all group border border-transparent hover:border-slate-100 cursor-pointer"
                        >
                            <span className="text-sm sm:text-lg 2xl:text-2xl font-black text-slate-800 tracking-tighter whitespace-nowrap">
                                {months[currentDate.getMonth()]}
                            </span>
                            <div className="hidden sm:flex w-5 h-5 2xl:w-7 2xl:h-7 rounded-full bg-slate-100 items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <ChevronDown size={12} strokeWidth={3} className={clsx("2xl:w-4 2xl:h-4 transition-transform duration-300", monthOpen && "rotate-180")} />
                            </div>
                        </button>
                        {monthOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 sm:w-56 2xl:w-64 bg-white border border-slate-100 rounded-md shadow-2xl shadow-slate-200/50 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
                                <div className="grid grid-cols-1 gap-0.5 px-2 max-h-[60vh] overflow-y-auto">
                                    <div className="px-3 py-1.5 mb-1">
                                        <span className="text-[9px] 2xl:text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Pilih Bulan</span>
                                    </div>
                                    {months.map((m, idx) => {
                                        const node = monthNodes.find(n => n.value === idx + 1);
                                        const statusColor = getStatusColor(node);
                                        const isSelected = currentDate.getMonth() === idx;
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    const newDate = new Date(currentDate);
                                                    newDate.setMonth(idx);
                                                    onDateSelect(newDate);
                                                    setMonthOpen(false);
                                                }}
                                                className={clsx(
                                                    "flex items-center justify-between px-3 py-2 2xl:px-4 2xl:py-3 rounded-md text-xs 2xl:text-sm transition-all cursor-pointer",
                                                    isSelected ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-50 font-bold"
                                                )}
                                            >
                                                <span>{m}</span>
                                                {statusColor && <div className={clsx("w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded-full ring-4 ring-white shadow-sm", statusColor)} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative" ref={yearRef}>
                        <button 
                            onClick={() => setYearOpen(!yearOpen)}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 2xl:px-4 py-2 hover:bg-slate-50 rounded-md transition-all group border border-transparent hover:border-slate-100 cursor-pointer"
                        >
                            <span className="text-sm sm:text-lg 2xl:text-2xl font-black text-slate-800 tracking-tighter">
                                {currentDate.getFullYear()}
                            </span>
                            <div className="hidden sm:flex w-5 h-5 2xl:w-7 2xl:h-7 rounded-full bg-slate-100 items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <ChevronDown size={12} strokeWidth={3} className={clsx("2xl:w-4 2xl:h-4 transition-transform duration-300", yearOpen && "rotate-180")} />
                            </div>
                        </button>
                        {yearOpen && (
                            <div className="absolute top-full left-0 mt-2 w-32 sm:w-40 2xl:w-48 bg-white border border-slate-100 rounded-md shadow-2xl shadow-slate-200/50 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
                                <div className="grid grid-cols-1 gap-0.5 px-2">
                                    <div className="px-3 py-1.5 mb-1">
                                        <span className="text-[9px] 2xl:text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Pilih Tahun</span>
                                    </div>
                                    {yearNodes.sort((a,b) => b.value - a.value).map((node) => {
                                        const statusColor = getStatusColor(node);
                                        const isSelected = currentDate.getFullYear() === node.value;
                                        return (
                                            <button
                                                key={node.value}
                                                onClick={() => {
                                                    const newDate = new Date(currentDate);
                                                    newDate.setFullYear(node.value);
                                                    onDateSelect(newDate);
                                                    setYearOpen(false);
                                                }}
                                                className={clsx(
                                                    "flex items-center justify-between px-4 py-2.5 2xl:px-5 2xl:py-3.5 rounded-md text-xs 2xl:text-sm transition-all cursor-pointer",
                                                    isSelected ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-100" : "text-slate-600 hover:bg-slate-50 font-bold"
                                                )}
                                            >
                                                <span>{node.value}</span>
                                                {statusColor && <div className={clsx("w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded-full ring-4 ring-white shadow-sm", statusColor)} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-center bg-slate-100/80 p-1 2xl:p-1.5 rounded-lg border border-slate-200/50 relative overflow-hidden">
                    <div 
                        className={clsx(
                            "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-sm border border-slate-100 transition-all duration-300 ease-out z-0",
                            view === 'month' ? "left-1" : "left-[calc(50%+1px)]"
                        )}
                    />
                    <button
                        onClick={() => onViewChange('month')}
                        className={clsx(
                            "relative z-10 px-4 sm:px-6 2xl:px-8 py-1.5 sm:py-2 2xl:py-3 text-[9px] sm:text-[10px] 2xl:text-xs font-black uppercase tracking-widest transition-colors duration-300 rounded-md cursor-pointer",
                            view === 'month' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Month
                    </button>
                    <button
                        onClick={() => onViewChange('agenda')}
                        className={clsx(
                            "relative z-10 px-4 sm:px-6 2xl:px-8 py-1.5 sm:py-2 2xl:py-3 text-[9px] sm:text-[10px] 2xl:text-xs font-black uppercase tracking-widest transition-colors duration-300 rounded-md cursor-pointer",
                            view === 'agenda' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        List
                    </button>
                </div>
            </div>
        </div>
    );
}
