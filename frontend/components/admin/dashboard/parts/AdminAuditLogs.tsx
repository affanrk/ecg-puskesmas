import React from 'react';
import { Activity } from 'lucide-react';
import clsx from 'clsx';
import { ApprovalLog } from '@/types/user';
import { formatDateShort } from '@/utils/helpers';

interface AdminAuditLogsProps {
    loading: boolean;
    recentLogs: ApprovalLog[];
}

export function AdminAuditLogs({ loading, recentLogs }: AdminAuditLogsProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-0">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Activity size={16} className="text-slate-400" />
                    Recent Audit Logs
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">Loading Logs...</div>
                ) : recentLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-widest">No recent activity</span>
                    </div>
                ) : (
                    <div className="relative p-4">
                        <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-100" />
                        <div className="space-y-6">
                            {recentLogs.map((log) => (
                                <div key={log.id} className="pl-8 relative group">
                                    <div className={clsx(
                                        "absolute left-[19px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 transition-colors",
                                        log.status === 'APPROVED' ? "bg-emerald-500 group-hover:bg-emerald-400" :
                                            log.status === 'QUEUE' ? "bg-amber-500 group-hover:bg-amber-400" :
                                                "bg-rose-500 group-hover:bg-rose-400"
                                    )} />
                                    <div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            <span className="font-bold text-slate-800">{log.created_by || 'System'}</span>
                                            {' '}
                                            <span className={clsx(
                                                "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mx-1 border",
                                                log.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    log.status === 'QUEUE' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>
                                                {log.status}
                                            </span>
                                            {' '}
                                            user <span className="font-bold text-slate-700">{log.username || 'Unknown'}</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                                            {formatDateShort(log.created_dt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
