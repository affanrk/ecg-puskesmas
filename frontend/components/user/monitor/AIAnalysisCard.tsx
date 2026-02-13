'use client';

import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import { Sparkles, Brain } from 'lucide-react';

export default function AIAnalysisCard() {
    const liveData = useStore((state) => state.liveData);
    let prediction: { classification: string; confidence: number } | null = null;
    if (liveData && liveData.length > 0) {
        const latest = liveData[0];
        const result = (latest.classification === 'Recording...' && liveData[1]) ? liveData[1] : latest;
        if (result && result.classification !== 'Recording...') {
            prediction = {
                classification: result.classification,
                confidence: result.confidence || 0
            };
        }
    }
    const isAbnormal = prediction && ['Abnormal', 'Aritmia', 'Berpotensi'].some(x => prediction.classification.includes(x));
    const confidencePct = prediction ? Math.round(prediction.confidence * 100) : 0;
    const isWaiting = !prediction;

    return (
        <div className={clsx(
            "h-full bg-white px-3 py-4 flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden group",
            !isWaiting && (isAbnormal ? "bg-rose-50/20" : "bg-emerald-50/20")
        )}>
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-slate-900 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                <Brain size={60} strokeWidth={1} />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center text-center w-full">
                <h3 className={clsx(
                    "text-xl font-black tracking-tight leading-tight transition-colors duration-500 mb-4 w-full break-words px-2 uppercase",
                    isWaiting ? "text-slate-300" : isAbnormal ? "text-rose-600" : "text-emerald-600"
                )}>
                    {prediction ? prediction.classification : "Scanning"}
                </h3>
                <div className="w-full px-2">
                    {!isWaiting ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                                <div 
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                        isAbnormal ? "bg-rose-500 shadow-rose-500/30" : "bg-emerald-500 shadow-emerald-500/30"
                                    )}
                                    style={{ width: `${confidencePct}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={clsx("text-[9px] font-black tabular-nums", isAbnormal ? "text-rose-600" : "text-emerald-600")}>
                                    {confidencePct}% ACCURACY
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center justify-center gap-2 text-slate-300">
                                <Sparkles size={12} className="animate-pulse text-teal-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Syncing</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
