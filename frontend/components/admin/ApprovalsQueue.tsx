'use client';

import { User } from '@/store/useStore';
import { UserCheck, UserX, Clock, Calendar, Mail, Fingerprint } from 'lucide-react';
import { formatDate } from '@/utils/helpers';

interface ApprovalsQueueProps {
    users: User[];
    searchTerm: string;
    onApprove: (id: number, name: string) => void;
    onReject: (id: number, name: string) => void;
}

export default function ApprovalsQueue({ users, searchTerm, onApprove, onReject }: ApprovalsQueueProps) {
    const filteredUsers = users.filter(u => 
        (u.full_name || u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.nik || '').includes(searchTerm)
    );

    if (filteredUsers.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <UserX size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-800">No Pending Approvals</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Verification queue is currently empty</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredUsers.map((user) => (
                <div 
                    key={user.id} 
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-rose-300 transition-all duration-300"
                >
                    <div className="p-6 flex items-start gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-2xl font-black shrink-0 border border-slate-200 group-hover:from-rose-50 group-hover:to-rose-100 group-hover:text-rose-600 group-hover:border-rose-200 transition-all">
                            {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-black text-slate-800 truncate leading-none mb-1 group-hover:text-rose-700 transition-colors">
                                        {user.full_name || user.username}
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Mail size={10} /> {user.email}
                                    </span>
                                </div>
                                <div className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase tracking-tighter border border-amber-100 flex items-center gap-1">
                                    <Clock size={10} /> Pending
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID (NIK)</p>
                                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                        <Fingerprint size={12} className="text-slate-300" />
                                        {user.nik || '---'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</p>
                                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                        <Calendar size={12} className="text-slate-300" />
                                        {user.dob ? String(user.dob) : '---'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Created At</span>
                            <span className="text-[10px] font-bold text-slate-500">
                                {formatDate(user.created_dt as string)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => user.id && onReject(user.id, user.full_name || user.username)}
                                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-95"
                            >
                                Reject
                            </button>
                            <button 
                                onClick={() => user.id && onApprove(user.id, user.full_name || user.username)}
                                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                            >
                                <UserCheck size={14} /> Approve User
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
