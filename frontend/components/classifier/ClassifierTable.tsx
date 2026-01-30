'use client';

import { useEffect, useRef } from 'react';
import { Clock, Database, HeartPulse } from 'lucide-react';
import clsx from 'clsx';
import { AnalysisResult } from '@/store/useStore';
import { formatDate } from '@/utils/helpers';

interface ClassifierTableProps {
    loading: boolean;
    data: AnalysisResult[];
    selectedRecordId: string | null;
    setSelectedRecord: (record: AnalysisResult | null) => void;
    setRowsPerPage: (count: number) => void;
}

export default function ClassifierTable({
    loading,
    data,
    selectedRecordId,
    setSelectedRecord,
    setRowsPerPage
}: ClassifierTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Responsive Table Height Logic
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                // Header is exactly 50px (h-[50px]). Row is exactly 52px (h-[52px]).
                // We subtract header and a small buffer for borders/rounding
                const availableHeight = height - 50;
                const calculatedRows = Math.max(1, Math.floor(availableHeight / 52));
                setRowsPerPage(calculatedRows);
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
                <div className="h-full w-full overflow-x-auto no-scrollbar">
                    <table className="w-full h-full text-left border-collapse table-fixed lg:table-auto">
                        <thead className="bg-slate-50/50 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[50px]">
                            <tr>
                                <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Capture Date</th>
                                <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Device ID</th>
                                <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Subject NIK</th>
                                <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Patient Name</th>
                                <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100 text-right">Analysis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.map((rec, idx) => {
                                const isSelected = selectedRecordId === rec.recording_id;
                                const status = (rec.classification || '').toString();
                                const isAbnormal = ['Abnormal', 'Aritmia', 'Berpotensi'].some(x => status.includes(x));

                                return (
                                    <tr
                                        key={rec.recording_id || `${rec.changed_dt}-${idx}`}
                                        onClick={() => setSelectedRecord(isSelected ? null : rec)}
                                        className={clsx(
                                            "cursor-pointer transition-all group h-[52px]",
                                            isSelected
                                                ? "bg-teal-100 border-l-4 border-l-teal-500"
                                                : "hover:bg-slate-50/80"
                                        )}
                                    >
                                        <td className="px-6 sm:px-8 py-3">
                                            <div className="font-mono text-sm font-bold text-slate-700">
                                                {formatDate(rec.changed_dt).split(',')[0]}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                {formatDate(rec.changed_dt).split(',')[1]}
                                            </div>
                                        </td>
                                        <td className="px-6 sm:px-8 py-3">
                                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100/50 px-2 py-1 rounded-sm border border-slate-100">
                                                {rec.device_id}
                                            </span>
                                        </td>
                                        <td className="px-6 sm:px-8 py-3 font-mono text-xs font-bold text-slate-500">
                                            {rec.subject_id}
                                        </td>
                                        <td className="px-6 sm:px-8 py-3 font-bold text-sm text-slate-700">
                                            {rec.patient_name}
                                        </td>
                                        <td className="px-6 sm:px-8 py-3 text-right">
                                            <span className={clsx(
                                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.12em] transition-all border shadow-sm whitespace-nowrap",
                                                !isAbnormal
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    : "bg-rose-50 text-rose-700 border-rose-100"
                                            )}>
                                                <span className={clsx("w-1.5 h-1.5 rounded-full", !isAbnormal ? "bg-emerald-500" : "bg-rose-500")}></span>
                                                {status}
                                                {isAbnormal && <HeartPulse size={12} className="animate-pulse" />}
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
