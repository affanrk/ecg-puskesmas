'use client';

import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import { Sparkles, AlertTriangle, CheckCircle2, Brain } from 'lucide-react';

export default function AIAnalysisCard() {
    // 1. Hooks & State
    const liveData = useStore((state) => state.liveData);

    // 2. Logic
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

    // 3. Render
    return (
        <div className={clsx(
            "h-full bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between transition-colors group ring-1 ring-blue-50/50",
            isWaiting ? "border-slate-200" :
            isAbnormal ? "border-slate-200 hover:border-rose-300" : "border-slate-200 hover:border-emerald-300"
        )}>
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Analysis</p>
                    <h3 className={clsx(
                        "text-xl font-black tracking-tight leading-tight",
                        isWaiting ? "text-slate-300" :
                        isAbnormal ? "text-rose-600" : "text-emerald-600"
                    )} title={prediction ? prediction.classification : ""}>
                        {prediction ? prediction.classification : "Waiting data..."}
                    </h3>
                </div>
                <div className={clsx(
                    "p-3 rounded-xl transition-all group-hover:text-white shrink-0",
                    isWaiting ? "bg-slate-50 text-slate-400" :
                    isAbnormal ? "bg-rose-50 text-rose-600 group-hover:bg-rose-600" :
                    "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600"
                )}>
                    {isWaiting ? <Sparkles size={20} /> : 
                     isAbnormal ? <AlertTriangle size={20} className={isAbnormal ? "animate-pulse" : ""} /> : 
                     <CheckCircle2 size={20} />}
                </div>
            </div>

            {!isWaiting && (
                <div className="mt-4">
                    <div className="flex justify-between items-end mb-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence</p>
                        <p className="text-xs font-bold text-slate-700">{confidencePct}%</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className={clsx(
                                "h-full rounded-full transition-all duration-1000 ease-out",
                                isAbnormal ? "bg-rose-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${confidencePct}%` }}
                        ></div>
                    </div>
                </div>
            )}
            
            {isWaiting && (
                <div className="mt-4 flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                    <Brain size={14} />
                    <span>Model Ready</span>
                </div>
            )}
        </div>
    );
}
