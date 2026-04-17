import React from 'react';
import clsx from 'clsx';

interface HealthCardProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    isHealthy: boolean;
    color: 'indigo' | 'amber' | 'rose' | 'emerald';
    value: string;
}

export function HealthCard({ title, subtitle, icon, isHealthy, color, value }: HealthCardProps) {
    const colors: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };
    
    return (
        <div className={clsx(
            "p-4 lg:p-5 rounded-xl border shadow-sm flex flex-col justify-between group transition-all duration-300 h-full relative overflow-hidden",
            isHealthy 
                ? "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md" 
                : "bg-rose-50/50 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.15)] ring-1 ring-rose-400"
        )}>
            {!isHealthy && <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />}
            
            <div className="flex items-start justify-between mb-2 relative z-10">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors", 
                    isHealthy ? colors[color] : "bg-rose-100 text-rose-700 border-rose-200 animate-bounce"
                )}>
                    {icon}
                </div>
                <div className={clsx(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 transition-colors",
                    isHealthy ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse"
                )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", isHealthy ? "bg-emerald-500" : "bg-white")} />
                    {isHealthy ? 'Healthy' : 'Critical'}
                </div>
            </div>
            <div className="mt-auto relative z-10">
                <div className="flex flex-col gap-0.5 mb-1">
                    <h4 className={clsx("text-[10px] font-black uppercase tracking-widest", isHealthy ? "text-slate-400" : "text-rose-500")}>{title}</h4>
                    <p className={clsx("text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0", isHealthy ? "text-slate-300" : "text-rose-400")}>{subtitle}</p>
                </div>
                <p className={clsx("text-2xl lg:text-3xl font-black tracking-tighter leading-none transition-colors", isHealthy ? "text-slate-700" : "text-rose-700")}>{value}</p>
            </div>
        </div>
    );
}
