import React from 'react';
import Link from 'next/link';
import { Users, UserCog, HeartPulse, Activity, ArrowRight } from 'lucide-react';

interface AdminDashboardStatsProps {
    loading: boolean;
    pendingCount: number;
    userCount: number;
    systemStatus: string;
    recentLogsCount: number;
}

export function AdminDashboardStats({ loading, pendingCount, userCount, systemStatus, recentLogsCount }: AdminDashboardStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 shrink-0">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-rose-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-rose-600 group-hover:scale-110 transition-transform duration-500">
                    <Users size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center mb-3">
                            <Users size={20} />
                        </div>
                        <Link href="/admin/approvals" className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 flex items-center gap-1">
                            Review <ArrowRight size={10} />
                        </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Queue</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : pendingCount}</h3>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-blue-600 group-hover:scale-110 transition-transform duration-500">
                    <UserCog size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                            <UserCog size={20} />
                        </div>
                        <Link href="/admin/users" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            Manage <ArrowRight size={10} />
                        </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Accounts</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : userCount}</h3>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-emerald-600 group-hover:scale-110 transition-transform duration-500">
                    <HeartPulse size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                            <HeartPulse size={20} />
                        </div>
                        <Link href="/admin/health" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            Details <ArrowRight size={10} />
                        </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Health</p>
                    <h3 className="text-xl font-black text-slate-800 mt-2 tracking-tight uppercase">{loading ? '...' : systemStatus}</h3>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-indigo-600 group-hover:scale-110 transition-transform duration-500">
                    <Activity size={80} />
                </div>
                <div className="relative z-10">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
                        <Activity size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : recentLogsCount}</h3>
                </div>
            </div>
        </div>
    );
}
