'use client';

import { History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import { formatDate } from '@/utils/helpers';

export interface ApprovalLog {
    id: string;
    user_id: number;
    username: string;
    full_name: string;
    status: 'QUEUE' | 'APPROVED' | 'REJECTED';
    reason?: string;
    created_dt: string;
    created_by: string;
}

interface ApprovalLogsProps {
    logs: ApprovalLog[];
    searchTerm: string;
}

export default function ApprovalLogs({ logs, searchTerm }: ApprovalLogsProps) {
    const filteredLogs = logs.filter(l => 
        (l.full_name || l.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.status || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Notes</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLogs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-20 text-center">
                                <div className="flex flex-col items-center">
                                    <History size={32} className="text-slate-200 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No logs found</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredLogs.map((log) => (
                            <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="text-[11px] font-bold text-slate-700">{formatDate(log.created_dt)}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-800">{log.full_name || log.username}</span>
                                        <span className="text-[9px] font-bold text-slate-400">@{log.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={clsx(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                                        log.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                        log.status === 'REJECTED' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                        "bg-amber-50 text-amber-600 border-amber-100"
                                    )}>
                                        {log.status === 'APPROVED' && <CheckCircle2 size={10} />}
                                        {log.status === 'REJECTED' && <XCircle size={10} />}
                                        {log.status === 'QUEUE' && <Clock size={10} />}
                                        {log.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-[11px] font-medium text-slate-600 max-w-xs truncate" title={log.reason}>
                                        {log.reason || '-'}
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{log.created_by}</span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
