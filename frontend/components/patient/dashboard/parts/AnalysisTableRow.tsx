import React from 'react';
import clsx from 'clsx';
import { AnalysisResult } from '@/types/models';

interface AnalysisTableRowProps {
    row: AnalysisResult;
    idx: number;
    highlight: boolean;
    currentPage: number;
}

export function AnalysisTableRow({ row, idx, highlight, currentPage }: AnalysisTableRowProps) {
    const formatDateTime = (isoString: string) => {
        if (!isoString) return { date: '-', time: '' };
        const dateObj = new Date(isoString);
        return {
            date: dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        };
    };

    const dt = formatDateTime(row.changed_dt || row.timestamp);
    const cls = row.classification?.toLowerCase() || '';
    const isHighRisk = cls.includes('sangat') || cls.includes('high');
    const isPotential = cls.includes('berpotensi') || cls.includes('potential');
    const isAbnormal = cls.includes('abnormal');
    const isNormal = cls.includes('normal');

    return (
        <tr className={clsx(
            "hover:bg-slate-50/50 transition-colors group h-[48px] 2xl:h-[52px]",
            highlight && idx === 0 && currentPage === 1 && "bg-emerald-50/20"
        )}>
            <td className="px-8 py-2 whitespace-nowrap border-r border-transparent group-hover:border-slate-100 transition-colors">
                <div className="font-mono text-sm 2xl:text-base font-bold text-slate-700 leading-tight">
                    {dt.time}
                </div>
                <div className="text-[10px] 2xl:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {dt.date}
                </div>
            </td>
            <td className="px-4 py-2">
                <span className={clsx(
                    "inline-flex items-center gap-2.5 px-3 py-1.5 2xl:py-2 rounded-md text-[10px] 2xl:text-[11px] font-black uppercase tracking-[0.12em] transition-all border whitespace-nowrap max-w-full overflow-hidden",
                    isHighRisk && "bg-rose-50 text-rose-600 border-rose-100",
                    isPotential && !isHighRisk && "bg-orange-50 text-orange-600 border-orange-100",
                    isAbnormal && !isHighRisk && !isPotential && "bg-slate-50 text-slate-600 border-slate-100",
                    isNormal && "bg-emerald-50 text-emerald-600 border-emerald-100",
                    !isHighRisk && !isPotential && !isAbnormal && !isNormal && "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    <span className={clsx(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isHighRisk && "bg-rose-500",
                        isPotential && !isHighRisk && "bg-orange-500",
                        isAbnormal && !isHighRisk && !isPotential && "bg-slate-500",
                        isNormal && "bg-emerald-500",
                        !isHighRisk && !isPotential && !isAbnormal && !isNormal && "bg-slate-300"
                    )}></span>
                    <span className="truncate">{row.classification}</span>
                </span>
            </td>
            <td className="w-[130px] 2xl:w-[180px] pr-12 text-right whitespace-nowrap">
                <span className="font-mono text-[10px] 2xl:text-xs font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 shadow-inner inline-block">
                    {row.confidence ? (row.confidence * 100).toFixed(0) + '%' : '-'}
                </span>
            </td>
        </tr>
    );
}
