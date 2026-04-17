'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { User, ApprovalLog } from '@/types/user';
import { api } from '@/services/api';
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
                const [dashboardData, health] = await Promise.all([
                    api.fetchAdminDashboard(),
                    api.fetchDetailedHealth().catch(() => ({ status: 'issues' }))
                ]);

                if (dashboardData) {
                    setRecentPending(dashboardData.recent_pending || []);
                    setPendingCount(dashboardData.pending_approvals || 0);
                    setUserCount(dashboardData.total_users || 0);
                    setRecentLogs(dashboardData.recent_logs || []);
                }
                setSystemStatus(health?.status === 'healthy' ? 'healthy' : 'issues');
            } catch (error) {
                console.error("Dashboard load failed", error);
                setSystemStatus('issues');
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
