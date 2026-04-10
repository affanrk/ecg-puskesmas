import React from 'react';
import { Activity, Clock, UserCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { ApprovalLog } from '@/types/user';

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
                    <div className="relative p-2.5">
                        <div className="absolute left-[22px] top-2 bottom-0 w-px bg-slate-100" />
                        <div className="space-y-2">
                            {recentLogs.slice(0, 5).map((log) => (
                                <div key={log.id} className="pl-7 relative group">
                                    <div className={clsx(
                                        "absolute left-[19px] top-2 w-2 h-2 rounded-full border border-white shadow-sm z-10 transition-colors",
                                        log.status === 'APPROVED' ? "bg-emerald-500 group-hover:bg-emerald-400" :
                                            log.status === 'QUEUE' ? "bg-amber-500 group-hover:bg-amber-400" :
                                                "bg-rose-500 group-hover:bg-rose-400"
                                    )} />
                                    <div className="flex flex-col bg-slate-50/50 group-hover:bg-slate-50 p-1.5 rounded-lg border border-transparent group-hover:border-slate-100 transition-colors ml-1">
                                        <p className="text-[11px] text-slate-600 leading-tight flex items-center flex-wrap gap-1.5">
                                            <span className="font-bold text-slate-800 flex items-center gap-1">
                                                <UserCircle size={10} className="text-slate-400" /> {log.created_by || 'System'}
                                            </span>
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded border border-transparent shrink-0",
                                                log.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_8px_rgba(16,185,129,0.15)]" :
                                                    log.status === 'QUEUE' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        "bg-rose-50 text-rose-600 border-rose-100 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                            )}>
                                                {log.status === 'QUEUE' ? 'MOVED TO QUEUE' : log.status}
                                            </span>
                                            <span className="text-slate-500 mx-0.5">user:</span>
                                            <span className="font-bold text-slate-700 truncate max-w-[80px]">{log.full_name || log.username || 'Unknown'}</span>
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-[1px] rounded shrink-0",
                                                log.is_patient ? "bg-emerald-100/50 text-emerald-600" : log.is_operator ? "bg-indigo-100/50 text-indigo-600" : log.is_doctor ? "bg-cyan-100/50 text-cyan-600" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {log.is_patient ? 'Patient' : log.is_operator ? 'Operator' : log.is_doctor ? 'Doctor' : 'N/A'}
                                            </span>
                                        </p>

                                        {log.reason && log.status === 'REJECTED' && (
                                            <div className="mt-1 text-[9px] text-slate-600 bg-rose-50/80 px-2 py-1.5 rounded-md border border-rose-100 flex gap-1.5 w-full">
                                                <AlertCircle size={10} className="text-rose-500 shrink-0 mt-[1px]" />
                                                <span className="line-clamp-1 italic text-rose-700 font-medium">{log.reason}</span>
                                            </div>
                                        )}
                                        <p className="text-[9px] text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                                            <Clock size={9} className="text-slate-300" /> {new Date(log.created_dt).toLocaleString()}
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
