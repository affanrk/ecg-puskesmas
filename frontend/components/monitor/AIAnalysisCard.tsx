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
            "h-full bg-white rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.04)] border px-6 py-4 flex flex-col justify-between transition-all duration-500 relative overflow-hidden group",
            isWaiting ? "border-slate-200" :
            isAbnormal ? "border-rose-100 ring-4 ring-rose-50/30" : "border-emerald-100 ring-4 ring-emerald-50/30"
        )}>
             <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900 pointer-events-none transition-transform duration-700">
                <Brain size={100} strokeWidth={1} />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-8 h-8 rounded-md flex items-center justify-center shadow-sm border transition-colors shrink-0",
                        isWaiting ? "bg-slate-50 text-slate-400 border-slate-100" :
                        isAbnormal ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                        {isWaiting ? <Brain size={16} strokeWidth={2.5} /> : isAbnormal ? <AlertCircle size={16} strokeWidth={2.5} /> : <ShieldCheck size={16} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">AI Insight</p>
                        <p className={clsx(
                            "text-[9px] font-bold uppercase tracking-widest mt-1 leading-none",
                            isWaiting ? "text-slate-400" : isAbnormal ? "text-rose-500" : "text-emerald-500"
                        )}>
                            {isWaiting ? "Analyzing..." : "Classification"}
                        </p>
                    </div>
                </div>
                
                <h3 className={clsx(
                    "text-xl font-black tracking-tight leading-tight transition-colors duration-500 truncate",
                    isWaiting ? "text-slate-300" : isAbnormal ? "text-rose-600" : "text-emerald-600"
                )}>
                    {prediction ? prediction.classification : "Awaiting Data"}
                </h3>

                <div className="relative">
                    {!isWaiting ? (
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">Confidence</p>
                                <span className={clsx("text-[10px] font-black leading-none", isAbnormal ? "text-rose-600" : "text-emerald-600")}>{confidencePct}%</span>
                            </div>
                            <div className="w-full bg-slate-50 rounded-sm h-2 p-0.5 border border-slate-100 overflow-hidden relative">
                                <div 
                                    className={clsx(
                                        "h-full rounded-sm transition-all duration-1000 ease-out relative",
                                        isAbnormal ? "bg-gradient-to-r from-rose-400 to-rose-600" : "bg-gradient-to-r from-emerald-400 to-emerald-600"
                                    )}
                                    style={{ width: `${confidencePct}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-medical-shimmer"></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] py-1">
                            <Sparkles size={12} className="animate-spin-slow" />
                            <span>Ready</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
