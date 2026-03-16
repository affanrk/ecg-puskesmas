import React from 'react';
import { CheckCircle2, XCircle, Clock, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import { formatDate, getActiveProfile } from '@/utils/helpers';
import { ApprovalLog } from '@/types/user';

interface LogTableRowProps {
    log: ApprovalLog;
}

export function LogTableRow({ log }: LogTableRowProps) {
    const [date, time] = formatDate(log.created_dt).split(',');
    
    return (
        <tr className="hover:bg-slate-50/50 transition-colors group h-[48px]">
            <td className="px-4 lg:px-6 whitespace-nowrap">
                <p className="text-[11px] font-bold text-slate-700">{date}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{time}</p>
            </td>
            <td className="px-4 lg:px-6 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                        <UserIcon size={14} />
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="text-[11px] font-black text-slate-800">{(getActiveProfile(log)?.full_name || "") || log.username}</span>
                        <span className="text-[9px] font-bold text-slate-400">@{log.username}</span>
                    </div>
                </div>
            </td>
            <td className="px-4 lg:px-6 whitespace-nowrap">
                <div className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
                    log.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        log.status === 'REJECTED' ? "bg-rose-50 text-rose-600 border-rose-100" :
                            "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                    {log.status === 'APPROVED' && <CheckCircle2 size={10} strokeWidth={3} />}
                    {log.status === 'REJECTED' && <XCircle size={10} strokeWidth={3} />}
                    {log.status === 'QUEUE' && <Clock size={10} strokeWidth={3} />}
                    {log.status}
                </div>
            </td>
            <td className="px-4 lg:px-6 whitespace-nowrap">
                <p className="text-[11px] font-medium text-slate-600 max-w-[200px] xl:max-w-xs truncate" title={log.reason}>
                    {log.reason || '-'}
                </p>
            </td>
            <td className="px-4 lg:px-6 whitespace-nowrap text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {log.created_by}
            </td>
        </tr>
    );
}
