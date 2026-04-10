import React from 'react';
import Link from 'next/link';
import { Users, CheckCircle2, Clock, Mail, CreditCard, Phone } from 'lucide-react';
import { User } from '@/types/user';
import { getActiveProfile } from '@/utils/helpers';
import clsx from 'clsx';

interface AdminPendingQueueProps {
    loading: boolean;
    recentPending: User[];
}

export function AdminPendingQueue({ loading, recentPending }: AdminPendingQueueProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-0">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Users size={16} className="text-slate-400" />
                    Awaiting Verification
                </h3>
                <Link href="/admin/approvals" className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors">
                    View All Queue
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">Loading Data...</div>
                ) : recentPending.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                        <CheckCircle2 size={32} className="text-slate-200" />
                        <span className="text-xs font-bold uppercase tracking-widest">All Caught Up</span>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {recentPending.slice(0, 5).map((item) => {
                            const profile = getActiveProfile(item);
                            return (
                                <div key={item.id} className="p-2 flex items-center justify-between hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all group">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                            {item.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-bold text-slate-800 truncate">{(profile?.full_name || "") || item.username}</p>
                                                <span className={clsx(
                                                    "text-[8px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded shrink-0",
                                                    item.is_patient ? "bg-emerald-50 text-emerald-600" : item.is_operator ? "bg-indigo-50 text-indigo-600" : item.is_doctor ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {item.is_patient ? 'Patient' : item.is_operator ? 'Operator' : item.is_doctor ? 'Doctor' : item.role}
                                                </span>
                                                {item.is_activated === 0 && (
                                                    <span className="text-[8px] font-black uppercase tracking-wider px-1 py-[1px] bg-amber-50 border border-amber-200 text-amber-600 rounded">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 w-full flex-wrap">
                                                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 truncate max-w-[110px]">
                                                    <Mail size={10} className="text-slate-400 shrink-0" /> {item.email || "No Email"}
                                                </span>
                                                {profile?.nik && (
                                                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 shrink-0">
                                                        <CreditCard size={10} className="text-slate-400" /> {profile.nik}
                                                    </span>
                                                )}
                                                {profile?.contact_number && (
                                                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 shrink-0">
                                                        <Phone size={10} className="text-slate-400" /> {profile.contact_number}
                                                    </span>
                                                )}
                                                <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1.5 ml-auto shrink-0">
                                                    <Clock size={9} className="text-slate-400" /> {new Date(item.created_dt as string).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Link href={`/admin/approvals?id=${item.id}`} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-md hover:bg-rose-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-200 cursor-pointer shrink-0 ml-4">
                                        Review
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
