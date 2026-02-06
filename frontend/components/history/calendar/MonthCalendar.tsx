'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { CalendarNode } from '../CalendarDrillDown';

interface MonthCalendarProps {
    year: number;
    month: number;
    nodes: CalendarNode[];
    onDateClick: (date: Date) => void;
    onViewChange: (view: 'month' | 'agenda') => void; // Added onViewChange prop
    selectedDate: Date;
    filters: {
        highRisk: boolean;
        potential: boolean;
        abnormal: boolean;
    };
}

export default function MonthCalendar({ year, month, nodes, onDateClick, onViewChange, selectedDate, filters }: MonthCalendarProps) {
    const monthIndex = month - 1;
    
    const calendarCells = useMemo(() => {
        const firstDayOfMonth = new Date(year, monthIndex, 1);
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const startDay = firstDayOfMonth.getDay();
        
        const cells = [];
        const prevMonthLastDate = new Date(year, monthIndex, 0).getDate();
        
        for (let i = startDay - 1; i >= 0; i--) {
            cells.push({ day: prevMonthLastDate - i, type: 'prev' as const, date: new Date(year, monthIndex - 1, prevMonthLastDate - i) });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dayNodes = nodes.filter(n => n.value === i);
            cells.push({ day: i, type: 'current' as const, date: new Date(year, monthIndex, i), dayNodes });
        }
        const remaining = 42 - cells.length;
        for (let i = 1; i <= remaining; i++) {
            cells.push({ day: i, type: 'next' as const, date: new Date(year, monthIndex + 1, i) });
        }
        return cells;
    }, [year, monthIndex, nodes]);

    const today = new Date();

    return (
        <div className="flex flex-col h-full bg-white select-none overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="min-w-[700px] lg:min-w-full min-h-full flex flex-col">
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30 shrink-0">
                        {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map(wd => (
                            <div key={wd} className="text-center py-2 text-[10px] font-black text-slate-400 tracking-[0.2em]">{wd}</div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-slate-100 divide-y divide-slate-100 border-b border-slate-100">
                        {calendarCells.map((cell, idx) => {
                            const isCurrentMonth = cell.type === 'current';
                            const isToday = cell.date.getDate() === today.getDate() && cell.date.getMonth() === today.getMonth() && cell.date.getFullYear() === today.getFullYear();
                            const isSelected = cell.date.getDate() === selectedDate.getDate() && cell.date.getMonth() === selectedDate.getMonth() && cell.date.getFullYear() === selectedDate.getFullYear();

                            let totalActiveCount = 0;
                            let priorityEvent = null;

                            if (isCurrentMonth && cell.dayNodes) {
                                const dayNode = cell.dayNodes[0]; 
                                
                                if (dayNode && dayNode.classifications) {
                                    const highCount = filters.highRisk ? (dayNode.classifications['Sangat Berpotensi Aritmia'] || 0) : 0;
                                    const potentialCount = filters.potential ? (dayNode.classifications['Berpotensi Aritmia'] || 0) : 0;
                                    const abnormalCount = filters.abnormal ? (dayNode.classifications['Abnormal'] || 0) : 0;

                                    totalActiveCount = dayNode.count - (dayNode.classifications['Normal'] || 0);

                                    if (highCount > 0) {
                                        priorityEvent = { color: 'bg-rose-500 shadow-rose-100', label: 'Sangat Berpotensi', count: highCount };
                                    } else if (potentialCount > 0) {
                                        priorityEvent = { color: 'bg-orange-500 shadow-orange-100', label: 'Berpotensi', count: potentialCount };
                                    } else if (abnormalCount > 0) {
                                        priorityEvent = { color: 'bg-slate-500 shadow-slate-100', label: 'Abnormal', count: abnormalCount };
                                    }
                                }
                            }

                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        onDateClick(cell.date);
                                        onViewChange('agenda'); 
                                    }} 
                                    className={clsx(
                                        "relative flex flex-col group cursor-pointer transition-all p-2 sm:p-3 min-h-[110px] lg:min-h-[120px] 2xl:min-h-0 overflow-hidden", 
                                        isCurrentMonth ? "bg-white hover:bg-slate-50/50" : "bg-slate-50/20",
                                        isSelected && isCurrentMonth && "bg-blue-50/50 z-10"
                                    )}
                                >
                                    {isSelected && isCurrentMonth && (
                                        <>
                                            <div className="absolute inset-0 ring-1 ring-inset ring-blue-200/50 pointer-events-none" />
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[2px_0_8px_rgba(59,130,246,0.3)] z-20" />
                                        </>
                                    )}

                                    <div className="flex justify-center sm:justify-start mb-2 relative z-10">
                                        <span className={clsx("text-sm lg:text-base 2xl:text-lg font-bold w-7 h-7 sm:w-9 sm:h-9 2xl:w-10 2xl:h-10 flex items-center justify-center rounded-md transition-all", 
                                            isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : isCurrentMonth ? "text-slate-700 group-hover:bg-slate-100" : "text-slate-300")}>
                                            {cell.day}
                                        </span>
                                    </div>

                                    <div className="mt-auto flex flex-col gap-1.5 2xl:gap-2 overflow-hidden">
                                        {priorityEvent && (
                                            <div className={clsx(
                                                "px-2 py-1 lg:px-2.5 lg:py-1.5 rounded-md font-black text-white truncate mx-0.5 shadow-md transition-all",
                                                "text-[10px] lg:text-[11px] 2xl:text-[14px]",
                                                priorityEvent.color
                                            )}>
                                                {priorityEvent.count} <span className="hidden lg:inline">{priorityEvent.label}</span>
                                                <span className="lg:hidden">{priorityEvent.label.includes('Sangat') ? 'High' : 'Risk'}</span>
                                            </div>
                                        )}
                                        
                                        {totalActiveCount > 0 && (
                                            <div className={clsx(
                                                "px-2 py-1 lg:px-2.5 lg:py-1.5 rounded-md font-black text-slate-500 bg-white border border-slate-100 truncate mx-0.5 shadow-sm group-hover:border-slate-200 transition-all",
                                                "text-[9px] lg:text-[10px] 2xl:text-[12px]"
                                            )}>
                                                {totalActiveCount} <span className="hidden lg:inline">REKAMAN</span><span className="lg:hidden">REC</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
