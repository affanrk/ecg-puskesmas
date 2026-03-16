import React from 'react';
import { User } from '@/types/user';
import { Calendar } from 'lucide-react';
import { formatDateShort, getActiveProfile } from '@/utils/helpers';

interface QueueTableRowProps {
    user: User;
    onApprove: (id: string, name: string) => void;
    onReject: (id: string, name: string) => void;
    onViewDetails: (user: User) => void;
}

export function QueueTableRow({ user, onApprove, onReject, onViewDetails }: QueueTableRowProps) {
    const fullName = (getActiveProfile(user)?.full_name || "") || user.username;
    
    return (
        <tr
            className="hover:bg-rose-50/30 transition-colors group cursor-pointer h-[48px]"
            onClick={() => onViewDetails(user)}
        >
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-rose-600 transition-colors shadow-sm shrink-0">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-800 group-hover:text-rose-700 transition-colors truncate max-w-[180px]">
                            {fullName}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 truncate max-w-[180px]">
                            {(getActiveProfile(user)?.full_name || "") ? `@${user.username}` : user.email} {(getActiveProfile(user)?.full_name || "") ? `• ${user.email}` : ''}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 whitespace-nowrap text-[10px] font-mono font-black text-slate-500 group-hover:text-slate-700 transition-colors">
                {(getActiveProfile(user)?.nik || "") || '---'}
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-[9px] font-black">{(getActiveProfile(user)?.gender || "") || 'U'}</span>
                    <span className="truncate max-w-[120px]">{(getActiveProfile(user)?.pob || "") || '---'}</span>
                    <span className="text-slate-200">|</span>
                    <span className="flex items-center gap-1"><Calendar size={10} className="text-slate-300" /> {(getActiveProfile(user)?.dob || "") ? String((getActiveProfile(user)?.dob || "")) : '---'}</span>
                </div>
            </td>
            <td className="px-5 whitespace-nowrap text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                {formatDateShort((user.changed_dt || user.created_dt) as string)}
            </td>
            <td className="px-5 whitespace-nowrap text-right pr-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        onClick={() => onReject(user.id || "", fullName)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 border border-rose-100/50 cursor-pointer"
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => onApprove(user.id || "", fullName)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 cursor-pointer"
                    >
                        Approve
                    </button>
                </div>
            </td>
        </tr>
    );
}
