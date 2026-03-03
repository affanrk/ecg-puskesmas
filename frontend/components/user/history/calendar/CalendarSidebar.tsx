'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { CalendarNode } from '@/types/models';

interface CalendarSidebarProps {
    currentDate: Date;
    onDateSelect: (date: Date) => void;
    onMiniDateChange?: (date: Date) => void;
    filters: {
        highRisk: boolean;
        potential: boolean;
        abnormal: boolean;
    };
    onFilterChange: (filters: { highRisk: boolean; potential: boolean; abnormal: boolean }) => void;
    nodes: CalendarNode[];
}

function FilterItem({ label, color, checked, onClick }: { label: string, color: string, checked: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center gap-3 p-2 2xl:p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-all group text-left border border-transparent hover:border-slate-100/50"
        >
            <div className={clsx(
                "w-4 h-4 2xl:w-6 2xl:h-6 rounded-sm border flex items-center justify-center transition-all shrink-0", 
                checked ? `${color} border-transparent shadow-sm` : "border-slate-200 bg-white"
            )}>
                {checked && <Check size={12} className="text-white 2xl:w-4 2xl:h-4" strokeWidth={4} />}
            </div>
            <span className={clsx("text-[11px] 2xl:text-base font-bold transition-colors", checked ? "text-slate-700" : "text-slate-400")}>{label}</span>
        </button>
    );
}

export default function CalendarSidebar({ 
    currentDate, 
    onDateSelect,
    onMiniDateChange,
    filters,
    onFilterChange,
    nodes
}: CalendarSidebarProps) {
    const currentYearVal = currentDate.getFullYear();
    const currentMonthVal = currentDate.getMonth();
    const [miniDate, setMiniDate] = useState(new Date(currentYearVal, currentMonthVal, 1));
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const maxYear = currentYear;

    useEffect(() => {
        setMiniDate(new Date(currentYearVal, currentMonthVal, 1));
    }, [currentYearVal, currentMonthVal]);

    useEffect(() => {
        if (onMiniDateChange) {
            onMiniDateChange(miniDate);
        }
    }, [miniDate, onMiniDateChange]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        const prev = new Date(miniDate.getFullYear(), miniDate.getMonth() - 1, 1);
        if (prev.getFullYear() >= minYear) {
            setMiniDate(prev);
        }
    };

    const handleNextMonth = () => {
        const next = new Date(miniDate.getFullYear(), miniDate.getMonth() + 1, 1);
        if (next.getFullYear() <= maxYear) {
            setMiniDate(next);
        }
    };

    const renderMiniCalendar = () => {
        const year = miniDate.getFullYear();
        const month = miniDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const startDay = getFirstDayOfMonth(year, month);
        const today = new Date();
        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-7 h-7 2xl:w-10 2xl:h-10" />);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const isSelected = currentDate.getDate() === i && currentDate.getMonth() === month && currentDate.getFullYear() === year;
            const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
            const dayNodes = nodes.filter(n => n.value === i);
            let indicatorColor = null;
            if (dayNodes.length > 0) {
                const dayNode = dayNodes[0];
                if (dayNode.classifications) {
                    const hasHigh = filters.highRisk && (dayNode.classifications['Sangat Berpotensi Aritmia'] || 0) > 0;
                    const hasPotential = filters.potential && (dayNode.classifications['Berpotensi Aritmia'] || 0) > 0;
                    const hasAbnormal = filters.abnormal && (dayNode.classifications['Abnormal'] || 0) > 0;
                    if (hasHigh) indicatorColor = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
                    else if (hasPotential) indicatorColor = 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]';
                    else if (hasAbnormal) indicatorColor = 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.4)]';
                }
            }
            days.push(
                <button
                    key={i}
                    onClick={() => onDateSelect(new Date(year, month, i))}
                    className={clsx(
                        "w-7 h-7 2xl:w-10 2xl:h-10 flex flex-col items-center justify-center text-[11px] 2xl:text-base rounded-md transition-all relative",
                        isSelected ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-200" : isToday ? "text-blue-600 font-bold bg-blue-50/80" : "hover:bg-slate-50 text-slate-600"
                    )}
                >
                    <span>{i}</span>
                    {indicatorColor && !isSelected && (
                        <div className={clsx("absolute bottom-1 2xl:bottom-1.5 w-1 h-1 2xl:w-1.5 2xl:h-1.5 rounded-full animate-pulse", indicatorColor)} />
                    )}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="w-56 2xl:w-80 shrink-0 flex flex-col gap-6 2xl:gap-8 p-4 2xl:p-8 border-r border-slate-100 bg-white h-full hidden lg:flex select-none overflow-y-auto 2xl:overflow-hidden min-h-0 custom-scrollbar">
            <div className="border-b border-slate-50 pb-4 2xl:pb-8 shrink-0">
                <div className="flex items-center justify-between mb-4 2xl:mb-6">
                    <span className="text-[10px] 2xl:text-sm font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                        {miniDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1 2xl:gap-2">
                        <button 
                            onClick={handlePrevMonth} 
                            disabled={miniDate.getFullYear() === minYear && miniDate.getMonth() === 0}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 transition-colors disabled:opacity-20"
                        >
                            <ChevronLeft size={16} className="2xl:w-5 2xl:h-5" />
                        </button>
                        <button 
                            onClick={handleNextMonth} 
                            disabled={miniDate.getFullYear() === maxYear && miniDate.getMonth() === 11}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 transition-colors disabled:opacity-20"
                        >
                            <ChevronRight size={16} className="2xl:w-5 2xl:h-5" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-y-1 2xl:gap-y-2 place-items-center">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                        <span key={i} className="text-[9px] 2xl:text-xs font-black text-slate-300 w-7 2xl:w-10 text-center uppercase tracking-tighter">{d}</span>
                    ))}
                    {renderMiniCalendar()}
                </div>
            </div>
            <div className="flex flex-col gap-2 2xl:gap-4">
                <span className="text-[9px] 2xl:text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Filter Klinis</span>
                <div className="space-y-1 2xl:space-y-2">
                    <FilterItem label="Sangat Berpotensi" color="bg-rose-500" checked={filters.highRisk} onClick={() => onFilterChange({...filters, highRisk: !filters.highRisk})} />
                    <FilterItem label="Berpotensi" color="bg-orange-500" checked={filters.potential} onClick={() => onFilterChange({...filters, potential: !filters.potential})} />
                    <FilterItem label="Abnormal" color="bg-slate-500" checked={filters.abnormal} onClick={() => onFilterChange({...filters, abnormal: !filters.abnormal})} />
                </div>
            </div>
            <div className="bg-blue-50/50 border border-blue-100/50 p-3 2xl:p-4 flex flex-col gap-1.5 2xl:gap-2 mt-auto">
                <div className="flex items-center gap-2 text-blue-600">
                    <ShieldAlert size={16} className="2xl:w-5 2xl:h-5" strokeWidth={2.5} />
                    <span className="text-[10px] 2xl:text-xs font-black uppercase tracking-wider">Arsip Rekaman</span>
                </div>
                <p className="text-[11px] 2xl:text-base text-slate-600 leading-relaxed font-medium">
                    Sistem hanya menyimpan riwayat medis untuk <span className="text-blue-700 font-bold">5 tahun terakhir</span>.
                </p>
            </div>
        </div>
    );
}
