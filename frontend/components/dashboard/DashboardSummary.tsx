'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore, AnalysisResult } from '@/store/useStore';
import { api } from '@/services/api';
import SummaryCards from './SummaryCards';
import RecentAnalysisTable from './RecentAnalysisTable';
import DistributionChart from './DistributionChart';

export default function DashboardSummary() {
    const { user } = useStore();
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
            const [historyData, statsData] = await Promise.all([
                api.fetchRecentHistory(user.id, 10), 
                api.fetchStats(user.id)
            ]);
            
            if (Array.isArray(historyData)) {
                setRecentRecords(historyData);
            }
            if (statsData) {
                const normalizedStats: Record<string, number> = {};
                
                if (statsData.classification_counts && Array.isArray(statsData.classification_counts)) {
                    statsData.classification_counts.forEach((item: { classification: string; count: number }) => {
                        if (item.classification && typeof item.count === 'number') {
                            normalizedStats[item.classification] = item.count;
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

    const formatDateTime = (isoString: string) => {
        if (!isoString) return { date: '-', time: '' };
        const dateObj = new Date(isoString);
        return {
            date: dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        };
    };

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
