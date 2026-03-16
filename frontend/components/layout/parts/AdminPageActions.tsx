import React from 'react';
import { RefreshCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { HealthData } from '@/types/models';

interface AdminPageActionsProps {
    isApprovalsPage: boolean;
    isHealthPage: boolean;
    isUsersPage: boolean;
    adminViewMode: 'queue' | 'logs';
    setAdminViewMode: (mode: 'queue' | 'logs') => void;
    handleRefresh: () => void;
    handleHealthRefresh: () => void;
    adminLoading: boolean;
    healthData: HealthData | null;
}

export function AdminPageActions({
    isApprovalsPage,
    isHealthPage,
    isUsersPage,
    adminViewMode,
    setAdminViewMode,
    handleRefresh,
    handleHealthRefresh,
    adminLoading,
    healthData
}: AdminPageActionsProps) {
    if (isApprovalsPage) {
        return (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-500">
                <div className="flex items-center bg-slate-800/40 p-1 rounded-full relative w-[170px] h-[32px] border border-slate-800/50 shadow-inner">
                    <div
                        className={clsx(
                            "absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-rose-600 rounded-full shadow-lg transition-all duration-300 ease-out z-0",
                            adminViewMode === 'queue' ? "left-0.5" : "left-[calc(50%+0.5px)]"
                        )}
                    />
                    <button
                        onClick={() => setAdminViewMode('queue')}
                        className={clsx(
                            "flex-1 relative z-10 h-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer",
                            adminViewMode === 'queue' ? "text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        Queue
                    </button>
                    <button
                        onClick={() => setAdminViewMode('logs')}
                        className={clsx(
                            "flex-1 relative z-10 h-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer",
                            adminViewMode === 'logs' ? "text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        Logs
                    </button>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={adminLoading}
                    className={clsx(
                        "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm cursor-pointer",
                        adminLoading && "opacity-50 cursor-wait"
                    )}
                    title="Sync Verification Data"
                >
                    <RefreshCcw size={12} className={clsx(adminLoading && "animate-spin")} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Refresh</span>
                </button>
            </div>
        );
    }

    if (isHealthPage && healthData) {
        return (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-500">
                <div className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all",
                    healthData.status === 'healthy'
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                )}>
                    {healthData.status === 'healthy' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    <span className="text-[9px] font-black uppercase tracking-widest">System {healthData.status}</span>
                </div>
                <div className="w-px h-4 bg-slate-800" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic hidden md:block">
                    Updated: {new Date(healthData.timestamp * 1000).toLocaleTimeString()}
                </span>
                <button
                    onClick={handleHealthRefresh}
                    disabled={adminLoading}
                    className={clsx(
                        "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm cursor-pointer",
                        adminLoading && "opacity-50 cursor-wait"
                    )}
                    title="Refresh System Health"
                >
                    <RefreshCcw size={12} className={clsx(adminLoading && "animate-spin")} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Refresh</span>
                </button>
            </div>
        );
    }

    if (isUsersPage) {
        return (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-500">
                <button
                    onClick={handleRefresh}
                    disabled={adminLoading}
                    className={clsx(
                        "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm cursor-pointer",
                        adminLoading && "opacity-50 cursor-wait"
                    )}
                    title="Refresh Users List"
                >
                    <RefreshCcw size={12} className={clsx(adminLoading && "animate-spin")} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Refresh</span>
                </button>
            </div>
        );
    }

    return null;
}
