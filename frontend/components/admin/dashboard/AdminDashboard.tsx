'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { User, ApprovalLog } from '@/types/user';
import { api } from '@/services/api';
import clsx from 'clsx';
import { AdminDashboardStats } from './parts/AdminDashboardStats';
import { AdminPendingQueue } from './parts/AdminPendingQueue';
import { AdminAuditLogs } from './parts/AdminAuditLogs';

export default function AdminDashboard() {
    const user = useStore(state => state.user);
    const [pendingCount, setPendingCount] = useState(0);
    const [userCount, setUserCount] = useState(0);
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
                const [pending, allPending, users, logs, health] = await Promise.all([
                    api.fetchPendingApprovals({ limit: 5 }),
                    api.fetchPendingApprovals({ limit: 100 }),
                    api.fetchUsers({ limit: 100 }),
                    api.fetchApprovalLogs({ limit: 5 }),
                    api.fetchDetailedHealth().catch(() => ({ status: 'issues' }))
                ]);

                setRecentPending(pending || []);
                setPendingCount(allPending?.length || 0);
                setUserCount(users?.length || 0);
                setRecentLogs(logs || []);
                setSystemStatus(health.status === 'healthy' ? 'healthy' : 'issues');

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
                </div>
                <div className="flex items-center gap-3">
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

            <AdminDashboardStats 
                loading={loading}
                pendingCount={pendingCount}
                userCount={userCount}
                systemStatus={systemStatus}
                recentLogsCount={recentLogs.length}
            />

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AdminPendingQueue loading={loading} recentPending={recentPending} />
                <AdminAuditLogs loading={loading} recentLogs={recentLogs} />
            </div>
        </div>
    );
}
