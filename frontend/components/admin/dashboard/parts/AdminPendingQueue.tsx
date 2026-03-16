import React from 'react';
import Link from 'next/link';
import { Users, CheckCircle2, Clock } from 'lucide-react';
import { User } from '@/types/user';
import { formatDateShort, getActiveProfile } from '@/utils/helpers';

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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">Loading Data...</div>
                ) : recentPending.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                        <CheckCircle2 size={32} className="text-slate-200" />
                        <span className="text-xs font-bold uppercase tracking-widest">All Caught Up</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentPending.slice(0, 10).map((item) => (
                            <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        {item.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">{(getActiveProfile(item)?.full_name || "") || item.username}</p>
                                        <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                            <Clock size={10} /> {formatDateShort(item.created_dt as string)}
                                        </p>
                                    </div>
                                </div>
                                <Link href={`/admin/approvals?id=${item.id}`} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-md hover:bg-rose-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-200 cursor-pointer">
                                    Review
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
