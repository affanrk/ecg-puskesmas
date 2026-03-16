import React from 'react';
import clsx from 'clsx';

interface SidebarSectionProps {
    title: string;
    isSidebarPinned: boolean;
    children: React.ReactNode;
    showDivider?: boolean;
}

export function SidebarSection({
    title,
    isSidebarPinned,
    children,
    showDivider = true
}: SidebarSectionProps) {
    return (
        <>
            <p className={clsx(
                "px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 transition-opacity", 
                !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100"
            )}>
                {title}
            </p>
            {children}
            {showDivider && <div className="my-6 border-t border-slate-100/80 mx-2" />}
        </>
    );
}
