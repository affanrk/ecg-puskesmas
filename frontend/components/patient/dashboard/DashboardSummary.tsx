'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import DistributionChart from './parts/DistributionChart';
import RecentAnalysisTable from './parts/RecentAnalysisTable';
import SummaryCards from './parts/SummaryCards';
import { api } from '@/services';
import { useStore } from '@/store/useStore';
import { AnalysisResult } from '@/types/models';
import { formatDateTime } from '@/utils/helpers';

export default function DashboardSummary() {
    const user = useStore(state => state.user);
    const [recentRecords, setRecentRecords] = useState<AnalysisResult[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [highlight, setHighlight] = useState(false);
    const isFetching = useRef(false);

    const loadDashboardData = useCallback(async () => {
        if (!user?.id || isFetching.current) return; 
        isFetching.current = true;
        setLoading(true);
        try {
            const dashboardData = await api.fetchPatientDashboard();
            if (dashboardData) {
                if (Array.isArray(dashboardData.recent_records)) {
                    setRecentRecords(dashboardData.recent_records);
                }
                
                const statsData = dashboardData.stats;
                if (statsData) {
                    const normalizedStats: Record<string, number> = {};
                    if (statsData.classification_counts && Array.isArray(statsData.classification_counts)) {
                        statsData.classification_counts.forEach((item: { classification: string; classification_result?: string; count: number }) => {
                            if ((item.classification || item.classification_result) && typeof item.count === 'number') {
                                normalizedStats[(item.classification || item.classification_result) as string] = item.count;
                            }
                        });
                    } else {
                        Object.assign(normalizedStats, statsData);
                    }
                    ['recording...', 'Recording...', 'recording', 'Recording'].forEach(key => {
                        delete normalizedStats[key];
                    });
                    setStats(normalizedStats);
                }
            }
            setHighlight(true);
            setTimeout(() => setHighlight(false), 1000);
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [user?.id]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);


    const lastResult = recentRecords.length > 0 ? recentRecords[0] : null;
    const lastResultTime = lastResult ? formatDateTime(lastResult.changed_dt || lastResult.timestamp) : { date: '--', time: '--' };


    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 xl:h-full xl:min-h-0 overflow-y-auto xl:overflow-hidden no-scrollbar pb-4 xl:pb-0">
            <div className="xl:col-span-7 flex flex-col min-h-[500px] xl:min-h-0 h-full border-r border-slate-100">
                <RecentAnalysisTable 
                    loading={loading}
                    recentRecords={recentRecords}
                    loadDashboardData={loadDashboardData}
                    highlight={highlight}
                />
            </div>
            <div className="xl:col-span-5 flex flex-col min-h-0 h-full overflow-hidden">
                <div className="flex-none min-h-0 flex flex-col overflow-hidden">
                    <SummaryCards 
                        lastResult={lastResult}
                        lastResultTime={lastResultTime}
                        isVertical={true}
                    />
                </div>
                <div className="flex-1 min-h-0 border-t border-slate-100 flex flex-col overflow-hidden">
                    <DistributionChart stats={stats} isVertical={true} />
                </div>
            </div>
        </div>
    );
}
