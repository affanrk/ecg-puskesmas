import clsx from 'clsx';
import { HeartPulse, Activity, AlertTriangle } from 'lucide-react';

import { AnalysisResult } from '@/types/models';

interface AgendaResultItemProps {
    result: AnalysisResult;
    onClick: (result: AnalysisResult) => void;
}

export function AgendaResultItem({ result, onClick }: AgendaResultItemProps) {
    const time = new Date(result.changed_dt || result.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const cls = (result.classification || result.classification_result)?.toLowerCase() || '';
    const isHighRisk = cls.includes('sangat berpotensi') || cls.includes('high risk');
    const isPotential = cls.includes('berpotensi') || cls.includes('potential');

    return (
        <button
            onClick={() => onClick(result)}
            className="group flex items-stretch bg-white border border-slate-100 overflow-hidden hover:border-blue-200 transition-all duration-300 text-left 2xl:mb-1 cursor-pointer"
        >
            <div className="w-24 sm:w-32 2xl:w-40 flex flex-col items-center justify-center border-r border-slate-50 shrink-0 bg-slate-50/30 group-hover:bg-blue-50/30 transition-colors">
                <span className="text-lg sm:text-xl 2xl:text-2xl font-black text-slate-800 tracking-tighter">{timeStr}</span>
                <span className="text-[9px] 2xl:text-[11px] font-black text-slate-400 mt-1 uppercase tracking-widest font-mono">Precision Log</span>
            </div>
            <div className="flex-1 p-4 sm:p-5 2xl:p-7 flex items-center gap-5 2xl:gap-8 min-w-0">
                <div className={clsx(
                    "w-12 h-12 2xl:w-16 2xl:h-16 rounded-md flex items-center justify-center shrink-0 border transition-all duration-500 group-hover:scale-110 shadow-sm",
                    isHighRisk ? "bg-rose-500 border-rose-600 text-white shadow-rose-100" :
                    isPotential ? "bg-orange-500 border-orange-600 text-white shadow-orange-100" :
                    "bg-slate-500 border-slate-600 text-white shadow-slate-100"
                )}>
                    {isHighRisk ? <HeartPulse size={24} className="2xl:w-8 2xl:h-8" strokeWidth={2.5} /> :
                     isPotential ? <AlertTriangle size={24} className="2xl:w-8 2xl:h-8" strokeWidth={2.5} /> :
                     <Activity size={24} className="2xl:w-8 2xl:h-8" strokeWidth={2.5} />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 2xl:mb-2">
                        <div className={clsx(
                            "px-2.5 py-0.5 2xl:px-3 2xl:py-1 rounded-md text-[9px] 2xl:text-[11px] font-black uppercase tracking-[0.15em] border shadow-sm",
                            isHighRisk ? "bg-rose-50 text-rose-600 border-rose-100" :
                            isPotential ? "bg-orange-50 text-orange-600 border-orange-100" :
                            "bg-slate-50 text-slate-600 border-slate-100"
                        )}>
                            {isHighRisk ? 'Critical Alert' : isPotential ? 'Potential Risk' : 'Abnormal Wave'}
                        </div>
                    </div>
                    <h4 className="text-base 2xl:text-xl font-black text-slate-800 truncate leading-tight tracking-tight">
                        {(result.classification || result.classification_result)}
                    </h4>
                    <div className="flex items-center gap-4 mt-2 2xl:mt-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 2xl:w-6 2xl:h-6 rounded-full bg-rose-50 flex items-center justify-center">
                                <HeartPulse size={12} className="text-rose-500 2xl:w-4 2xl:h-4" />
                            </div>
                            <span className="text-sm 2xl:text-lg font-black text-slate-700">
                                {result.parameters?.find(p => p.heart_rate_bpm)?.heart_rate_bpm ? Math.round(Number(result.parameters.find(p => p.heart_rate_bpm)?.heart_rate_bpm)) : '--'} 
                            </span>
                            <span className="text-[9px] 2xl:text-[11px] font-black text-slate-400 uppercase tracking-tighter">BPM Avg</span>
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex items-center h-full">
                    <span className="text-[10px] 2xl:text-xs font-black text-slate-300 group-hover:text-blue-500 uppercase tracking-widest transition-colors whitespace-nowrap px-4 2xl:px-8 border-l border-slate-50 group-hover:border-blue-100 h-10 2xl:h-14 flex items-center">
                        Details
                    </span>
                </div>
            </div>
        </button>
    );
}
