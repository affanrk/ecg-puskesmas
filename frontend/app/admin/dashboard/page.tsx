'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore, User } from '@/store/useStore';
import { api } from '@/services/api';
import { ApprovalLog } from '@/components/admin/ApprovalLogs';
import {
    Users,
    ShieldAlert,
    Activity,
    Clock,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { formatDateShort } from '@/utils/helpers';

export default function AdminDashboard() {
    const { user } = useStore();
    const [pendingCount, setPendingCount] = useState(0);
    const [recentPending, setRecentPending] = useState<User[]>([]);
    const [recentLogs, setRecentLogs] = useState<ApprovalLog[]>([]);
    const [systemStatus, setSystemStatus] = useState<'healthy' | 'issues' | 'loading'>('loading');
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const loadData = async () => {
            setLoading(true);
            try {
                const pending = await api.fetchPendingApprovals({ limit: 5 });
                setRecentPending(pending || []);
                const allPending = await api.fetchPendingApprovals({ limit: 100 });
                setPendingCount(allPending?.length || 0);

                const logs = await api.fetchApprovalLogs({ limit: 5 });
                setRecentLogs(logs || []);

                try {
                    const health = await api.fetchDetailedHealth();
                    setSystemStatus(health.status === 'healthy' ? 'healthy' : 'issues');
                } catch {
                    setSystemStatus('issues');
                }

            } catch (error) {
                console.error("Dashboard load failed", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Welcome back, <span className="text-rose-600">{user?.username}</span>. Here is what&apos;s happening today.
                    </p>
                </div>                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "px-4 py-2 rounded-full border flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white shadow-sm",
                        systemStatus === 'healthy'
                            ? "bg-emerald-50/50 text-emerald-600 border-emerald-100"
                            : systemStatus === 'loading'
                                ? "bg-slate-50 text-slate-400 border-slate-100"
                                : "bg-rose-50/50 text-rose-600 border-rose-100"
                    )}>
                        <div className={clsx("w-2 h-2 rounded-full",
                            systemStatus === 'healthy' ? "bg-emerald-500" : systemStatus === 'loading' ? "bg-slate-300" : "bg-rose-500 animate-pulse"
                        )} />
                        System {systemStatus === 'loading' ? 'Checking...' : systemStatus}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 shrink-0">
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Verifications</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : pendingCount}</h3>
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
                        <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : recentLogs.length}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-amber-100 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-amber-600 group-hover:scale-110 transition-transform duration-500">
                        <ShieldAlert size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-3">
                            <ShieldAlert size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Status</p>
                        <h3 className="text-xl font-black text-slate-800 mt-2 tracking-tight">Active</h3>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                                <p className="text-xs font-bold text-slate-800">{item.full_name || item.username}</p>
                                                <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                                    <Clock size={10} /> {formatDateShort(item.created_dt as string)}
                                                </p>
                                            </div>
                                        </div>
                                        <Link href={`/admin/approvals?id=${item.id}`} className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-md hover:bg-rose-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-200">
                                            Review
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

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
                                                log.status === 'APPROVED' ? "bg-emerald-500 group-hover:bg-emerald-400" : "bg-rose-500 group-hover:bg-rose-400"
                                            )} />
                                            <div>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    <span className="font-bold text-slate-800">{log.created_by || 'System'}</span>
                                                    {' '}
                                                    <span className={clsx(
                                                        "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mx-1 border",
                                                        log.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
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
            </div>
        </div>
    );
}
