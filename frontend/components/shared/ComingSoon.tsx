'use client';

import clsx from 'clsx';
import { LucideIcon, Rocket } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    color?: 'rose' | 'teal' | 'brand';
}

export default function ComingSoon({ title, description, icon: Icon = Rocket, color = 'rose' }: ComingSoonProps) {
    const colorClasses = {
        rose: "bg-rose-50 text-rose-500 border-rose-100 shadow-rose-100",
        teal: "bg-teal-50 text-teal-500 border-teal-100 shadow-teal-100",
        brand: "bg-brand-50 text-brand-500 border-brand-100 shadow-brand-100"
    };

    const iconColorClasses = {
        rose: "text-rose-600",
        teal: "text-teal-600",
        brand: "text-brand-600"
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full py-20 px-6 text-center animate-in fade-in duration-700">
            <div className={clsx(
                "w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-xl border rotate-3 hover:rotate-0 transition-transform duration-500",
                colorClasses[color]
            )}>
                <Icon size={40} className={iconColorClasses[color]} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">
                {title}
            </h2>
            <div className="max-w-md bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-slate-500 font-bold text-sm leading-relaxed tracking-wide">
                    {description}
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Module Under Development</span>
                </div>
            </div>
        </div>
    );
}
