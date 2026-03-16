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
        <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-all h-full">
            <div className="flex items-start justify-between mb-2">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", colors[color])}>
                    {icon}
                </div>
                <div className={clsx(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0",
                    isHealthy ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
                )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", isHealthy ? "bg-emerald-500" : "bg-rose-500")} />
                    {isHealthy ? 'Healthy' : 'Error'}
                </div>
            </div>
            <div className="mt-auto">
                <div className="flex flex-col gap-0.5 mb-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
                    <p className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0">{subtitle}</p>
                </div>
                <p className="text-2xl lg:text-3xl font-black text-slate-700 tracking-tighter leading-none">{value}</p>
            </div>
        </div>
    );
}
