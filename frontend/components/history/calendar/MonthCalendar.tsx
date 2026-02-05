'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { CalendarNode } from '../CalendarDrillDown';

interface MonthCalendarProps {
    year: number;
    month: number;
    nodes: CalendarNode[];
    onDateClick: (date: Date) => void;
    filters: {
        highRisk: boolean;
        potential: boolean;
        abnormal: boolean;
    };
}

export default function MonthCalendar({ year, month, nodes, onDateClick, filters }: MonthCalendarProps) {
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
            <div className="flex-1 overflow-x-auto">
                <div className="min-w-[700px] lg:min-w-full h-full flex flex-col">
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
                        {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map(wd => (
                            <div key={wd} className="text-center py-3 text-[10px] font-black text-slate-400 tracking-[0.2em]">{wd}</div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-slate-100 divide-y divide-slate-100 border-b border-slate-100">
                        {calendarCells.map((cell, idx) => {
                            const isCurrentMonth = cell.type === 'current';
                            const isToday = cell.date.getDate() === today.getDate() && cell.date.getMonth() === today.getMonth() && cell.date.getFullYear() === today.getFullYear();

                            let totalActiveCount = 0;
                            let priorityEvent = null;

                            if (isCurrentMonth && cell.dayNodes) {
                                const dayNode = cell.dayNodes[0]; 
                                
                                if (dayNode && dayNode.classifications) {
                                    const totalDayCount = (dayNode.classifications['Sangat Berpotensi Aritmia'] || 0) + 
                                                       (dayNode.classifications['Berpotensi Aritmia'] || 0) + 
                                                       (dayNode.classifications['Abnormal'] || 0) + 
                                                       (dayNode.classifications['Normal'] || 0);
                                    
                                    const highCount = filters.highRisk ? (dayNode.classifications['Sangat Berpotensi Aritmia'] || 0) : 0;
                                    const potentialCount = filters.potential ? (dayNode.classifications['Berpotensi Aritmia'] || 0) : 0;
                                    const abnormalCount = filters.abnormal ? (dayNode.classifications['Abnormal'] || 0) : 0;

                                    totalActiveCount = totalDayCount;

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
                                <div key={idx} onClick={() => onDateClick(cell.date)} className={clsx("relative flex flex-col group cursor-pointer transition-all p-1.5 min-h-[100px]", isCurrentMonth ? "bg-white hover:bg-slate-50/50" : "bg-slate-50/20")}>
                                    <div className="flex justify-center sm:justify-start mb-1">
                                        <span className={clsx("text-xs font-bold w-7 h-7 flex items-center justify-center rounded-md transition-all", 
                                            isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : isCurrentMonth ? "text-slate-700 group-hover:bg-slate-100" : "text-slate-300")}>
                                            {cell.day}
                                        </span>
                                    </div>

                                    <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                                        {priorityEvent && (
                                            <div className={clsx("px-2 py-1 rounded-md text-[9px] font-black text-white truncate mx-0.5 shadow-md", priorityEvent.color)}>
                                                {priorityEvent.count} {priorityEvent.label}
                                            </div>
                                        )}
                                        
                                        {totalActiveCount > 0 && (
                                            <div className="px-2 py-1 rounded-md text-[8px] font-black text-slate-500 bg-white border border-slate-100 truncate mx-0.5 shadow-sm group-hover:border-slate-200 transition-colors">
                                                TOTAL: {totalActiveCount} REKAMAN
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
