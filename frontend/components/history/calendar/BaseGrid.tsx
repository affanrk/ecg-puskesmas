'use client';

import clsx from 'clsx';
import { CalendarNode } from '../CalendarDrillDown';
import { HeartPulse, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface GridProps {
    nodes: CalendarNode[];
    onNodeClick: (node: CalendarNode) => void;
    centered?: boolean;
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'high_potential': return <HeartPulse className="animate-pulse" />;
        case 'potential': return <AlertTriangle />;
        case 'abnormal': return <Activity />;
        case 'normal': return <CheckCircle />;
        default: return <CheckCircle className="opacity-50" />;
    }
};

const getColorClass = (status: string, count: number) => {
    if (count === 0) return "bg-slate-50 border-slate-100 text-slate-300 hover:bg-slate-100 hover:border-slate-200";

    switch (status) {
        case 'high_potential':
            return "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-105";
        case 'potential':
            return "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:scale-105";
        case 'abnormal':
            return "bg-slate-500 border-slate-600 text-white shadow-lg shadow-slate-500/30 hover:bg-slate-600 hover:scale-105";
        case 'normal':
        default:
            return "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105";
    }
};

export default function BaseGrid({ nodes, onNodeClick, centered = false }: GridProps) {
    return (
        <div className={clsx(
            "w-full",
            centered 
                ? "flex flex-wrap justify-center items-center content-center gap-3 sm:gap-6 mx-auto min-h-full" 
                : "grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3"
        )}>
            {nodes.map((node, idx) => (
                <button
                    key={`${node.level}-${node.value}-${idx}`}
                    onClick={() => onNodeClick(node)}
                    className={clsx(
                        "aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all duration-300 relative group border",
                        centered ? "w-20 xs:w-24 sm:w-28 md:w-32 lg:w-36" : "w-full",
                        getColorClass(node.status, node.count)
                    )}
                >
                    <span className={clsx("text-sm xs:text-base sm:text-lg lg:text-xl font-black tracking-tight truncate w-full px-1 text-center", node.count > 0 ? "text-white" : "text-slate-700 group-hover:text-current")}>
                        {node.label}
                    </span>
                    
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getStatusIcon(node.status)}
                    </div>

                    {node.count > 0 && (
                        <span className={clsx(
                            "text-[7px] xs:text-[8px] lg:text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                            "bg-white/20 text-white"
                        )}>
                            {node.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
