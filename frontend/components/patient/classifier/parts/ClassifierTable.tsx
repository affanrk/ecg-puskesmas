'use client';

import { useEffect, useRef } from 'react';

import clsx from 'clsx';
import { Clock, Database, HeartPulse } from 'lucide-react';

import { AnalysisResult } from '@/types/models';
import { formatDate } from '@/utils/helpers';

interface ClassifierTableProps {
    loading: boolean;
    data: AnalysisResult[];
    setRowsPerPage: (count: number) => void;
}

export default function ClassifierTable({
    loading,
    data,
    setRowsPerPage
}: ClassifierTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const headerHeight = 60; 
                const availableHeight = height - headerHeight;
                const idealRows = 10;
                const rowHeight = 48; 
                const calculatedRows = Math.max(1, Math.floor(availableHeight / rowHeight));
                if (calculatedRows >= idealRows) {
                    setRowsPerPage(idealRows);
                } else {
                    setRowsPerPage(calculatedRows);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [setRowsPerPage]);

    return (
        <div ref={containerRef} className="flex-1 overflow-hidden relative z-10 no-scrollbar">
            {loading ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-40">
                    <div className="animate-spin text-teal-500">
                        <Clock size={48} />
                    </div>
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 text-center">Loading Archives...</span>
                </div>
            ) : data.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-30">
                    <Database size={64} className="text-slate-300" />
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 text-center">No Records Found</span>
                </div>
            ) : (
                <div className="h-full w-full overflow-x-auto no-scrollbar overflow-y-hidden">
                    <table className="w-full h-full text-left border-collapse table-fixed lg:table-auto">
                        <thead className="bg-slate-50/50 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[60px]">
                            <tr>
                                <th className="px-3 sm:px-4 lg:px-6 font-black text-xs 2xl:text-sm uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap">Capture Date</th>
                                <th className="px-3 sm:px-4 lg:px-6 font-black text-xs 2xl:text-sm uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap">NIK</th>
                                <th className="px-3 sm:px-4 lg:px-6 font-black text-xs 2xl:text-sm uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap">Patient Name</th>
                                <th className="px-3 sm:px-4 lg:px-6 font-black text-xs 2xl:text-sm uppercase tracking-[0.15em] border-b border-slate-100 text-right whitespace-nowrap">Analysis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.map((rec, index) => {
                                const status = ((rec.classification || rec.classification_result) || '').toString();
                                const cls = status.toLowerCase();
                                const isHighRisk = cls.includes('sangat') || cls.includes('high');
                                const isPotential = cls.includes('berpotensi') || cls.includes('potential');
                                const isAbnormal = cls.includes('abnormal');
                                const isNormal = cls.includes('normal');
                                return (
                                    <tr key={rec.recording_id || `${rec.changed_dt}-${index}`}>
                                        <td className="px-3 sm:px-4 lg:px-6 py-2 whitespace-nowrap">
                                            <div className="font-mono text-sm 2xl:text-base font-bold text-slate-700">
                                                {formatDate(rec.changed_dt).split(',')[0]}
                                            </div>
                                            <div className="text-[10px] 2xl:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                {formatDate(rec.changed_dt).split(',')[1]}
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-4 lg:px-6 py-2 font-mono text-xs 2xl:text-sm font-bold text-slate-500 whitespace-nowrap">
                                            {rec.subject_id}
                                        </td>
                                        <td className="px-3 sm:px-4 lg:px-6 py-2 font-bold text-sm 2xl:text-base text-slate-700 whitespace-nowrap">
                                            {rec.patient_name}
                                        </td>
                                        <td className="px-3 sm:px-4 lg:px-6 py-2 text-right whitespace-nowrap">
                                            <span className={clsx(
                                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[9px] sm:text-[10px] 2xl:text-xs font-black uppercase tracking-[0.12em] transition-all border whitespace-nowrap max-w-full",
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
                                                {status}
                                                {isHighRisk && <HeartPulse size={12} className="animate-pulse" />}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
