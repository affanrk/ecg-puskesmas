import React from 'react';
import { HeartPulse } from 'lucide-react';
import clsx from 'clsx';

interface SidebarBrandProps {
    className?: string;
    isSidebarPinned: boolean;
    isHovered: boolean;
}

export function SidebarBrand({ className, isSidebarPinned, isHovered }: SidebarBrandProps) {
    const isDark = className?.includes('bg-slate-900');
    const isVisible = isSidebarPinned || isHovered;

    return (
        <div className={clsx(
            "h-[72px] flex items-center gap-3 px-6 border-b shrink-0 relative overflow-hidden group-hover:bg-slate-50/30 transition-colors",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100/50"
        )}>
            <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 to-transparent pointer-events-none" />
            <div className={clsx(
                "relative w-10 h-10 rounded-md flex items-center justify-center shadow-lg shadow-teal-500/20 ring-4 ring-teal-50 shrink-0",
                isDark ? "bg-rose-600 ring-slate-800" : "bg-gradient-to-br from-teal-500 to-emerald-500 ring-teal-50"
            )}>
                <HeartPulse className="text-white w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className={clsx("relative flex flex-col transition-opacity duration-200", !isVisible ? "opacity-0" : "opacity-100")}>
                <span className={clsx(
                    "font-black text-xl tracking-tight leading-none whitespace-nowrap",
                    isDark ? "text-white" : "text-slate-800"
                )}>ECG Live</span>
                <span className={clsx(
                    "text-[10px] font-bold uppercase tracking-widest leading-none mt-1 whitespace-nowrap",
                    isDark ? "text-rose-500" : "text-teal-600"
                )}>Medical Platform</span>
            </div>
        </div>
    );
}
