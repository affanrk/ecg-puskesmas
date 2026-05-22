'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSidebarSectionProps {
    title: string;
    isSidebarPinned: boolean;
    children: React.ReactNode;
    showDivider?: boolean;
    defaultExpanded?: boolean;
    storageKey: string;
    isDark?: boolean;
}

export function CollapsibleSidebarSection({
    title,
    isSidebarPinned,
    children,
    showDivider = true,
    defaultExpanded = true,
    storageKey,
    isDark = false,
}: CollapsibleSidebarSectionProps) {
    const [isExpanded, setIsExpanded] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(storageKey);
            return stored !== null ? stored === 'true' : defaultExpanded;
        }
        return defaultExpanded;
    });

    const toggleExpanded = () => {
        const newState = !isExpanded;
        setIsExpanded(newState);
        localStorage.setItem(storageKey, String(newState));
    };

    return (
        <>
            <button
                onClick={toggleExpanded}
                className={clsx(
                    "w-full px-4 py-2 flex items-center gap-2.5 text-left group/collapse",
                    "transition-all duration-150 ease-out",
                    isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-100/80",
                    !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100"
                )}
            >
                <ChevronRight
                    size={10}
                    strokeWidth={3}
                    className={clsx(
                        "text-slate-500 transition-transform duration-200 ease-out shrink-0",
                        isExpanded && "rotate-90 text-slate-400"
                    )}
                />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {title}
                </span>
            </button>
            
            <div
                className={clsx(
                    "grid transition-all duration-200 ease-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="space-y-1">
                        {children}
                    </div>
                </div>
            </div>
            
            {showDivider && (
                <div className={clsx(
                    "my-6 border-t border-slate-100/80 mx-2 transition-opacity duration-200",
                    isExpanded ? "opacity-100" : "opacity-50"
                )} />
            )}
        </>
    );
}
