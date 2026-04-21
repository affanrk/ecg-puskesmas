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
    const isAmber = !!className && (className.includes('bg-amber') || className.includes('theme-amber'));
    const isViolet = !!className && className.includes('theme-violet');
    const isVisible = isSidebarPinned || isHovered;

    return (
        <div className={clsx(
            "h-[72px] flex items-center gap-3 px-6 border-b shrink-0 relative overflow-hidden group-hover:bg-slate-50/30 transition-colors",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100/50"
        )}>
            <div className={clsx(
                "absolute inset-0 bg-gradient-to-r to-transparent pointer-events-none",
                isDark ? "from-slate-900" : (isAmber ? "from-amber-50/60" : "from-teal-50/50")
            )} />
            <div className={clsx(
                "relative w-10 h-10 rounded-md flex items-center justify-center shrink-0",
                isDark
                    ? (isViolet ? "bg-violet-600 ring-4 ring-slate-800 shadow-lg shadow-violet-500/20" : "bg-rose-600 ring-4 ring-slate-800 shadow-lg shadow-rose-500/20")
                    : isAmber
                        ? "bg-gradient-to-br from-amber-500 to-orange-500 ring-4 ring-amber-50 shadow-lg shadow-amber-500/20"
                        : "bg-gradient-to-br from-teal-500 to-emerald-500 ring-4 ring-teal-50 shadow-lg shadow-teal-500/20"
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
                    isDark ? (isViolet ? "text-violet-500" : "text-rose-500") : (isAmber ? "text-amber-600" : "text-teal-600")
                )}>Medical Platform</span>
            </div>
        </div>
    );
}
