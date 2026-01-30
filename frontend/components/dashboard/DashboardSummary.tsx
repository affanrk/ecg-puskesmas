'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import SummaryCards from './SummaryCards';
import RecentAnalysisTable from './RecentAnalysisTable';
import DistributionChart from './DistributionChart';

export default function DashboardSummary() {
    // 1. Hooks & State
    const { user } = useStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [recentRecords, setRecentRecords] = useState<any[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [highlight, setHighlight] = useState(false);
    const isFetching = useRef(false);

    // 2. Data Fetching
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    statsData.classification_counts.forEach((item: any) => {
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

    // 3. Effects
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // 4. Helpers for Summary Cards
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

    // 6. Render
    return (
        <div className="flex flex-col gap-5 h-full min-h-0">
            
            {/* --- TOP ROW: 3 CARDS --- */}
            <SummaryCards 
                lastResult={lastResult}
                lastResultTime={lastResultTime}
            />

            {/* --- BOTTOM ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0 pb-10">
                
                {/* PANEL 4: RECENT HISTORY */}
                <RecentAnalysisTable 
                    loading={loading}
                    recentRecords={recentRecords}
                    loadDashboardData={loadDashboardData}
                    highlight={highlight}
                />

                {/* PANEL 5: DISTRIBUTION */}
                <DistributionChart stats={stats} />

            </div>
        </div>
    );
}