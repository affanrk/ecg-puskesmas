'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { OperatorDashboardData } from '@/types/models';
import OperatorSummaryCards from './parts/OperatorSummaryCards';
import OperatorRecentTable from './parts/OperatorRecentTable';
import OperatorDistributionChart from './parts/OperatorDistributionChart';
import OperatorNotifications from './parts/OperatorNotifications';

export default function OperatorDashboard() {
    const user = useStore(state => state.user);
    const [dashboardData, setDashboardData] = useState<OperatorDashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [highlight, setHighlight] = useState(false);
    const isFetching = useRef(false);

    const loadDashboardData = useCallback(async () => {
        if (!user?.id || isFetching.current) return;
        isFetching.current = true;
        setLoading(true);
        try {
            const data = await api.fetchOperatorDashboard();
            if (data) {
                setDashboardData({
                    operator_name: data.operator_name ?? null,
                    operator_role: data.operator_role ?? null,
                    work_location: data.work_location ?? null,
                    str_number: data.str_number ?? null,
                    total_recorded: data.total_recorded ?? 0,
                    arrhythmia_count: data.arrhythmia_count ?? 0,
                    last_sync: data.last_sync ?? null,
                    recent_sessions: Array.isArray(data.recent_sessions) ? data.recent_sessions : [],
                    notifications: Array.isArray(data.notifications) ? data.notifications : [],
                    classification_counts: Array.isArray(data.classification_counts) ? data.classification_counts : [],
                });
            }
            setHighlight(true);
            setTimeout(() => setHighlight(false), 1000);
        } catch (error) {
            console.error('Failed to load operator dashboard data:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [user?.id]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Build stats map excluding Normal for distribution chart
    const statsMap: Record<string, number> = {};
    if (dashboardData?.classification_counts) {
        dashboardData.classification_counts.forEach(item => {
            if (item.classification && item.classification.toLowerCase() !== 'normal') {
                statsMap[item.classification] = item.count;
            }
        });
    }

    const lastResult = dashboardData?.recent_sessions?.[0] ?? null;

    const formatDateTime = (isoString: string) => {
        if (!isoString) return { date: '-', time: '' };
        const dateObj = new Date(isoString);
        return {
            date: dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        };
    };

    const lastSyncTime = dashboardData?.last_sync ? formatDateTime(dashboardData.last_sync) : { date: '--', time: '--' };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 xl:h-full xl:min-h-0 overflow-y-auto xl:overflow-hidden no-scrollbar pb-4 xl:pb-0">
            {/* Left column: notifications + recent table */}
            <div className="xl:col-span-7 flex flex-col min-h-[500px] xl:min-h-0 h-full border-r border-slate-100">
                <OperatorRecentTable
                    loading={loading}
                    recentRecords={dashboardData?.recent_sessions ?? []}
                    loadDashboardData={loadDashboardData}
                    highlight={highlight}
                />
            </div>
            {/* Right column: summary + distribution + notifications */}
            <div className="xl:col-span-5 flex flex-col min-h-0 h-full overflow-hidden">
                <div className="flex-none min-h-0 flex flex-col overflow-hidden">
                    <OperatorSummaryCards
                        dashboardData={dashboardData}
                        lastSyncTime={lastSyncTime}
                        lastResult={lastResult}
                    />
                </div>
                <div className="flex-1 min-h-0 border-t border-slate-100 flex flex-col overflow-hidden">
                    <OperatorNotifications
                        notifications={dashboardData?.notifications ?? []}
                        loading={loading}
                    />
                </div>
                <div className="flex-none min-h-0 border-t border-slate-100 flex flex-col overflow-hidden">
                    <OperatorDistributionChart stats={statsMap} />
                </div>
            </div>
        </div>
    );
}
