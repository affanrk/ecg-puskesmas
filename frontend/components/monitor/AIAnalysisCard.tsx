'use client';

import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import { Sparkles, Brain, ShieldCheck, AlertCircle } from 'lucide-react';

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
            "h-full bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border px-8 py-5 flex flex-col justify-between transition-all duration-500 group relative overflow-hidden",
            isWaiting ? "border-slate-200" :
            isAbnormal ? "border-rose-100 ring-8 ring-rose-50/30" : "border-emerald-100 ring-8 ring-emerald-50/30"
        )}>
             <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Brain size={120} strokeWidth={1} />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className={clsx(
                        "w-10 h-10 rounded-md flex items-center justify-center shadow-sm border transition-colors",
                        isWaiting ? "bg-slate-50 text-slate-400 border-slate-100" :
                        isAbnormal ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                        {isWaiting ? <Brain size={18} strokeWidth={2.5} /> : isAbnormal ? <AlertCircle size={18} strokeWidth={2.5} /> : <ShieldCheck size={18} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">AI Insight</p>
                        <p className={clsx(
                            "text-[9px] font-bold uppercase tracking-widest mt-0.5",
                            isWaiting ? "text-slate-400" : isAbnormal ? "text-rose-500" : "text-emerald-500"
                        )}>
                            {isWaiting ? "Analyzing..." : "Classification"}
                        </p>
                    </div>
                </div>
                
                <h3 className={clsx(
                    "text-2xl font-black tracking-tight leading-tight transition-colors duration-500",
                    isWaiting ? "text-slate-300" : isAbnormal ? "text-rose-600" : "text-emerald-600"
                )}>
                    {prediction ? prediction.classification : "Awaiting Data"}
                </h3>
            </div>

            <div className="relative z-10 mt-4">
                {!isWaiting ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Confidence</p>
                            <span className={clsx("text-xs font-black", isAbnormal ? "text-rose-600" : "text-emerald-600")}>{confidencePct}%</span>
                        </div>
                        <div className="w-full bg-slate-50 rounded-md h-3 p-0.5 border border-slate-100 overflow-hidden">
                            <div 
                                className={clsx(
                                    "h-full rounded-md transition-all duration-1000 ease-out relative",
                                    isAbnormal ? "bg-gradient-to-r from-rose-400 to-rose-600" : "bg-gradient-to-r from-emerald-400 to-emerald-600"
                                )}
                                style={{ width: `${confidencePct}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] py-2">
                        <Sparkles size={12} className="animate-spin-slow" />
                        <span>Ready for Analysis</span>
                    </div>
                )}
            </div>
        </div>
    );
}
