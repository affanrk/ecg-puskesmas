import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Lock, LucideIcon } from 'lucide-react';

interface SidebarItemProps {
    name: string;
    href: string;
    icon: LucideIcon;
    pathname: string;
    isSidebarPinned: boolean;
    allowed?: boolean;
    isDark?: boolean;
    lockReason?: string;
    showBadge?: boolean;
}

export function SidebarItem({
    name,
    href,
    icon: Icon,
    pathname,
    isSidebarPinned,
    allowed = true,
    isDark = false,
    lockReason,
    showBadge = false
}: SidebarItemProps) {
    const isActive = pathname === href;
    const isVisible = clsx(
        "truncate transition-opacity duration-200",
        !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100"
    );

    if (!allowed) {
        return (
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-md text-slate-300 cursor-not-allowed relative w-full opacity-60 hover:opacity-80 transition-opacity">
                <Icon size={20} className="shrink-0" />
                <span className={clsx("truncate font-medium transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}>{name}</span>
                <Lock size={14} className={clsx("absolute right-4 text-slate-300 shrink-0 transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")} />
                <div className="hidden lg:group-hover:block absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                    {lockReason || "Access restricted"}
                    <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-800 transform -translate-y-1/2 rotate-45 border-l border-b border-slate-700"></div>
                </div>
            </div>
        );
    }

    const activeColors = isDark 
        ? "bg-rose-500/10 text-rose-500 shadow-sm ring-1 ring-rose-500/20" 
        : "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100";
    
    const activeBar = isDark ? "bg-rose-500" : "bg-teal-500";
    const hoverColors = isDark ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-50 hover:text-slate-900";
    const iconBaseColor = isDark ? "text-slate-500" : "text-slate-400";
    const iconActiveColor = isDark ? "text-rose-500" : "text-teal-600";

    return (
        <Link
            href={href}
            className={clsx(
                "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full group relative overflow-hidden",
                isActive ? activeColors : `text-slate-500 ${hoverColors}`
            )}
        >
            {isActive && <div className={clsx("absolute left-0 top-0 bottom-0 w-1 rounded-r-full", activeBar)} />}
            <Icon size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", isActive ? iconActiveColor : `${iconBaseColor} group-hover:text-slate-600`)} />
            <span className={isVisible}>{name}</span>
            {showBadge && (
                <span className={clsx("w-2.5 h-2.5 rounded-full ml-auto animate-pulse shrink-0 transition-opacity", isDark ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}></span>
            )}
        </Link>
    );
}
