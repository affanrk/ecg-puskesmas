import clsx from 'clsx';
import { Activity, ArrowLeft, User, Loader2, type LucideIcon } from 'lucide-react';

interface FloatingNavProps {
    title?: string;
    user?: { username: string } | null;
    backAction?: {
        label: string;
        onClick: () => void;
    };
    primaryAction?: {
        label: string;
        icon: LucideIcon;
        isDestructive?: boolean;
        isLoading?: boolean;
        onClick: () => void;
    };
}

export default function FloatingNav({ title = "ECG Platform", user, backAction, primaryAction }: FloatingNavProps) {
    return (
        <div className="w-full flex justify-center sticky top-0 md:top-4 z-50 px-4 transition-all duration-300">
            <header className="w-full max-w-7xl px-4 md:px-6 py-3 relative flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4 sm:gap-0 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-brand-900/5 rounded-2xl transition-all duration-300 hover:bg-white/80 hover:shadow-xl hover:shadow-brand-900/10">
                <div className="flex items-center gap-3 group cursor-pointer select-none">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tight transition-colors duration-300 group-hover:text-brand-700">{title}</span>
                </div>
                
                <div className="flex items-center gap-3">
                    {backAction && (
                        <button 
                            onClick={backAction.onClick} 
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-xl text-sm font-bold text-slate-500 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all group cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform shrink-0" />
                            <span className="hidden sm:inline">{backAction.label}</span>
                        </button>
                    )}
                    
                    {user && (
                        <div className="flex items-center gap-3 bg-slate-50/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:bg-white cursor-default select-none">
                            <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                                <User size={12} className="text-brand-600" />
                            </div>
                            <span className="text-xs md:text-sm font-bold text-slate-500 truncate max-w-[150px] md:max-w-none hover:text-slate-700 transition-colors">
                                Welcome, <span className="text-slate-800">{user.username}</span>
                            </span>
                        </div>
                    )}

                    {primaryAction && (() => {
                        const Icon = primaryAction.icon;
                        const destructiveClasses = "hover:text-white hover:bg-rose-500 hover:border-rose-500 hover:shadow-rose-500/20 text-slate-500";
                        const standardClasses = "hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 text-slate-500";
                        
                        return (
                            <button 
                                onClick={primaryAction.onClick} 
                                disabled={primaryAction.isLoading}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-xl text-sm font-bold transition-all group cursor-pointer hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed",
                                    primaryAction.isDestructive ? destructiveClasses : standardClasses
                                )}
                            >
                                {primaryAction.isLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Icon size={16} className={clsx("transition-transform shrink-0", primaryAction.isDestructive ? "group-hover:translate-x-0.5" : "group-hover:-translate-y-0.5")} />
                                )}
                                <span className={clsx("hidden sm:inline", !user && "inline")}>{primaryAction.isLoading ? 'Processing...' : primaryAction.label}</span>
                            </button>
                        );
                    })()}
                </div>
            </header>
        </div>
    );
}
