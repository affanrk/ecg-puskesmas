import clsx from 'clsx';
import { Activity, Clock, UserCircle, AlertCircle, Mail} from 'lucide-react';

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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">Loading Logs...</div>
                ) : recentLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-widest">No recent activity</span>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {recentLogs.slice(0, 5).map((log) => (
                            <div key={log.id} className="p-2 flex items-center justify-between hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all group">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black group-hover:shadow-sm transition-all shrink-0",
                                        log.status === 'APPROVED' ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-50" :
                                            log.status === 'QUEUE' ? "bg-amber-100 text-amber-600 group-hover:bg-amber-50" :
                                                "bg-rose-100 text-rose-600 group-hover:bg-rose-50"
                                    )}>
                                        {(log.full_name || log.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-bold text-slate-800 truncate">{log.full_name || log.username || 'Unknown'}</p>
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded shrink-0",
                                                log.is_patient ? "bg-emerald-50 text-emerald-600" : log.is_operator ? "bg-indigo-50 text-indigo-600" : log.is_doctor ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {log.is_patient ? 'Patient' : log.is_operator ? 'Operator' : log.is_doctor ? 'Doctor' : 'N/A'}
                                            </span>
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded border shrink-0",
                                                log.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    log.status === 'QUEUE' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>
                                                {log.status === 'QUEUE' ? 'MOVED TO QUEUE' : log.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 w-full flex-wrap">
                                            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 truncate max-w-[110px]">
                                                <UserCircle size={10} className="text-slate-400 shrink-0" /> {log.created_by || 'System'}
                                            </span>
                                            {log.username && (
                                                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 truncate max-w-[110px]">
                                                    <Mail size={10} className="text-slate-400 shrink-0" /> {log.username}
                                                </span>
                                            )}
                                            {log.reason && log.status === 'REJECTED' && (
                                                <span className="text-[10px] font-medium text-rose-600 flex items-center gap-1.5 shrink-0 italic">
                                                    <AlertCircle size={10} className="text-rose-500" /> {log.reason}
                                                </span>
                                            )}
                                            <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1.5 ml-auto shrink-0">
                                                <Clock size={9} className="text-slate-400" /> {new Date(log.created_dt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
