'use client';

import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import { Sparkles, Brain, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

export default function AIAnalysisCard() {
    const liveData = useStore((state) => state.liveData);
    
    let prediction: { classification: string; confidence: number } | null = null;
    if (liveData && liveData.length > 0) {
        const validResult = liveData.find(r => r.classification !== 'Recording...' && r.classification !== 'Pending');
        if (validResult) {
            prediction = {
                classification: validResult.classification,
                confidence: validResult.confidence || 0
            };
        }
    }

    const getStatusConfig = (classification: string) => {
        const lower = classification.toLowerCase();
        
        if (lower.includes('normal') && !lower.includes('abnormal')) {
            return {
                color: 'emerald',
                bg: 'bg-emerald-50/50',
                text: 'text-emerald-600',
                border: 'border-emerald-200',
                icon: CheckCircle2,
                bar: 'bg-emerald-500 shadow-emerald-500/30'
            };
        }
        
        if (lower.includes('sangat')) {
            return {
                color: 'rose',
                bg: 'bg-rose-50/50',
                text: 'text-rose-600',
                border: 'border-rose-200',
                icon: Activity,
                bar: 'bg-rose-500 shadow-rose-500/30'
            };
        }
        
        if (lower.includes('berpotensi') || lower.includes('arrhythmia')) {
            return {
                color: 'orange',
                bg: 'bg-orange-50/50',
                text: 'text-orange-600',
                border: 'border-orange-200',
                icon: AlertTriangle,
                bar: 'bg-orange-500 shadow-orange-500/30'
            };
        }

        if (lower.includes('abnormal')) {
            return {
                color: 'slate',
                bg: 'bg-slate-50/50',
                text: 'text-slate-600',
                border: 'border-slate-200',
                icon: AlertTriangle,
                bar: 'bg-slate-500 shadow-slate-500/30'
            };
        }

        return {
            color: 'slate',
            bg: 'bg-slate-50/50',
            text: 'text-slate-600',
            border: 'border-slate-200',
            icon: Brain,
            bar: 'bg-slate-400'
        };
    };

    const config = prediction ? getStatusConfig(prediction.classification) : getStatusConfig('');
    const confidencePct = prediction ? Math.round(prediction.confidence * 100) : 0;
    const isWaiting = !prediction;
    const StatusIcon = config.icon;

    return (
        <div className={clsx(
            "h-full px-3 py-4 flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden group border",
            !isWaiting ? [config.bg, config.border] : "bg-white border-slate-100"
        )}>
            <div className={clsx(
                "absolute top-0 right-0 p-3 opacity-[0.05] pointer-events-none transition-transform group-hover:scale-110 duration-700",
                !isWaiting ? config.text : "text-slate-900"
            )}>
                <StatusIcon size={60} strokeWidth={1} />
            </div>
            
            <div className="relative z-10 flex flex-col items-center justify-center text-center w-full">
                <h3 className={clsx(
                    "text-lg font-black tracking-tight leading-tight transition-colors duration-500 mb-4 w-full break-words px-1 uppercase",
                    !isWaiting ? config.text : "text-slate-300"
                )}>
                    {prediction ? prediction.classification : "Scanning..."}
                </h3>
                
                <div className="w-full px-4">
                    {!isWaiting ? (
                        <div className="flex flex-col items-center gap-2 w-full">
                            <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden border border-slate-200/20 backdrop-blur-sm">
                                <div 
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                        config.bar
                                    )}
                                    style={{ width: `${confidencePct}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={clsx("text-[9px] font-black tabular-nums", config.text)}>
                                    {confidencePct}% CONFIDENCE
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center justify-center gap-2 text-slate-300">
                                <Sparkles size={12} className="animate-pulse text-teal-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Waiting for Data</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
