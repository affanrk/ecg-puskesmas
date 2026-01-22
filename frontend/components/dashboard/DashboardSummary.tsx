'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { User, Activity, FileHeart, Clock, AlertCircle, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import clsx from 'clsx';
import { calculateAge } from '@/utils/helpers';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardSummary() {
    // 1. Hooks & State
    const { user } = useStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [recentRecords, setRecentRecords] = useState<any[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [highlight, setHighlight] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    // 2. Data Fetching
    const loadDashboardData = useCallback(async () => {
        if (!user?.id) return; 

        setLoading(true);
        try {
            const [historyData, statsData] = await Promise.all([
                api.fetchRecentHistory(user.id, 10),
                api.fetchStats(user.id)
            ]);
            
            if (Array.isArray(historyData)) {
                setRecentRecords(historyData);
                setCurrentPage(1); 
            }
            if (statsData) {
                const normalizedStats: Record<string, number> = {};
                
                // Handle new backend response format
                if (statsData.classification_counts && Array.isArray(statsData.classification_counts)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    statsData.classification_counts.forEach((item: any) => {
                        if (item.classification && typeof item.count === 'number') {
                            normalizedStats[item.classification] = item.count;
                        }
                    });
                } else {
                    // Fallback for legacy simple dict format if any
                    Object.assign(normalizedStats, statsData);
                }

                // Filter out recording states
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
        }
    }, [user?.id]);

    // 3. Effects
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // 4. Computed Values
    const totalProcessed = useMemo(() => {
        return Object.values(stats).reduce((a, b) => a + b, 0);
    }, [stats]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return recentRecords.slice(startIndex, startIndex + rowsPerPage);
    }, [recentRecords, currentPage]);

    const totalPages = Math.ceil(recentRecords.length / rowsPerPage);

    const chartData = {
        labels: Object.keys(stats),
        datasets: [
            {
                data: Object.values(stats),
                backgroundColor: [
                    '#3b82f6', // blue-500
                    '#f43f5e', // rose-500
                    '#fbbf24', // amber-400
                    '#10b981', // emerald-500
                    '#8b5cf6', // violet-500
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 6
            },
        ],
    };

    const chartOptions = {
        cutout: '50%', 
        layout: { padding: 10 },
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 15,
                    font: { size: 10, family: 'var(--font-geist-mono)', weight: 600 },
                    color: '#475569' // Slate-600
                }
            }
        },
        maintainAspectRatio: false
    };

    // 5. Helpers
    const formatDateTime = (isoString: string) => {
        if (!isoString) return { date: '-', time: '' };
        const dateObj = new Date(isoString);
        return {
            date: dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: dateObj.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        };
    };

    const formatTimeForTable = (isoString: string) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString('en-GB', { 
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false
        });
    };

    const lastResult = recentRecords.length > 0 ? recentRecords[0] : null;
    const lastResultTime = lastResult ? formatDateTime(lastResult.changed_dt || lastResult.timestamp) : { date: '--', time: '--' };

    // 6. Render
    return (
        <div className="flex flex-col gap-6 h-full max-h-[calc(100vh-120px)] overflow-hidden">
            
            {/* --- TOP ROW: 3 CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                
                {/* CARD 1: ACTIVE USER */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start justify-between relative overflow-hidden group hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Active User</p>
                        {user ? (
                            <>
                                <h3 className="text-2xl font-black text-slate-900 truncate tracking-tight" title={user.full_name || user.username}>
                                    {user.full_name || user.username}
                                </h3>
                                <div className="flex items-center gap-2 mt-3 text-xs font-semibold text-slate-500">
                                    <span className={clsx(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                        (user.gender === 'L' || user.gender === 'Male') 
                                            ? "bg-blue-50 text-blue-600 border border-blue-100" 
                                            : "bg-pink-50 text-pink-600 border border-pink-100"
                                    )}>
                                        {user.gender === 'L' ? 'Male' : (user.gender ? 'Female' : 'N/A')}
                                    </span>
                                    <span>•</span>
                                    <span>{user.dob ? calculateAge(user.dob) + ' Years Old' : '-'}</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-slate-400 text-sm italic py-2">Loading user...</div>
                        )}
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <User size={28} />
                    </div>
                </div>

                {/* CARD 2: LAST RECEIVED DATA */}
                <div className={clsx(
                    "bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-emerald-300 hover:shadow-md transition-all duration-500",
                    highlight && "bg-emerald-50 border-emerald-200 ring-4 ring-emerald-100/50"
                )}>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Last Received</p>
                        <h3 className="text-2xl font-black text-slate-900 truncate tracking-tight">
                            {lastResultTime.date}
                        </h3>
                        <p className="text-sm font-mono text-emerald-600 mt-2 font-black">
                            {lastResultTime.time}
                        </p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                        <Clock size={28} />
                    </div>
                </div>

                {/* CARD 3: LAST KNOWN RESULT */}
                <div className={clsx(
                    "bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-rose-300 hover:shadow-md transition-all duration-500",
                    highlight && "bg-rose-50 border-rose-200 ring-4 ring-rose-100/50"
                )}>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Last Result</p>
                        <h3 className={clsx(
                            "text-2xl font-black truncate tracking-tight",
                            !lastResult ? "text-slate-300" :
                            lastResult.classification === 'Normal' ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {lastResult?.classification || 'Waiting data...'}
                        </h3>
                        <p className="text-xs font-black text-slate-400 mt-3 uppercase tracking-widest">
                            Confidence: <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md ml-1">{lastResult?.confidence ? (lastResult.confidence * 100).toFixed(1) + '%' : '-'}</span>
                        </p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm">
                        <Activity size={28} />
                    </div>
                </div>
            </div>

            {/* --- BOTTOM ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
                
                {/* PANEL 4: LAST 10 CLASSIFICATIONS (Paginated 5 per page) */}
                <div className={clsx(
                    "lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all duration-500",
                    highlight && "ring-2 ring-blue-100 border-blue-200"
                )}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <FileHeart size={18} className="text-slate-400" />
                            Recent Classifications
                        </h3>
                        
                        <button 
                            onClick={loadDashboardData}
                            disabled={loading}
                            className={clsx(
                                "group px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2",
                                loading 
                                    ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" 
                                    : "bg-white text-slate-600 border-slate-200 hover:text-blue-600 hover:border-blue-300 active:scale-95"
                            )}
                        >
                            <span className="inline group-hover:text-blue-600 transition-colors">Refresh</span>
                            <RefreshCcw size={12} className={clsx(loading && "animate-spin text-blue-500", "group-hover:text-blue-600")} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <table className="w-full text-sm text-left border-collapse table-fixed">
                                                                <thead className="bg-slate-50/80 text-slate-500 sticky top-0 z-10 backdrop-blur-sm">
                                                            <tr>
                                                                <th className="px-6 py-4 font-extrabold text-[10px] uppercase tracking-[0.2em] w-[40%] text-slate-400">Timestamp</th>
                                                                <th className="px-6 py-4 font-extrabold text-[10px] uppercase tracking-[0.2em] w-[35%] text-slate-400">Classification</th>
                                                                <th className="px-6 py-4 font-extrabold text-[10px] uppercase tracking-[0.2em] w-[25%] text-slate-400 text-center">Confidence</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {paginatedData.length > 0 ? (
                                                                paginatedData.map((row, idx) => (
                                                                    <tr key={idx} className={clsx(
                                                                        "hover:bg-slate-50 transition-colors h-[54px] group",
                                                                        highlight && idx === 0 && currentPage === 1 && "bg-emerald-50/30"
                                                                    )}>
                                                                        <td className="px-6 font-mono font-bold text-slate-600 truncate text-xs">{formatTimeForTable(row.changed_dt || row.timestamp)}</td>
                                                                        <td className="px-6">
                                                                            <span className={clsx(
                                                                                "inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all group-hover:scale-105",
                                                                                row.classification === 'Normal' 
                                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                                                                                    : "bg-rose-50 text-rose-700 border-rose-200 shadow-sm"
                                                                            )}>
                                                                                <span className={clsx("w-2 h-2 rounded-full mr-2.5", row.classification === 'Normal' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")}></span>
                                                                                {row.classification}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 text-slate-700 font-black text-xs text-center">
                                                                            <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                                                {row.confidence ? (row.confidence * 100).toFixed(1) + '%' : '-'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={3} className="px-6 py-12">
                                                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                                                            <AlertCircle size={32} className="opacity-20" />
                                                                            <span className="font-bold text-xs uppercase tracking-widest">No history data found</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            {/* Filler rows to keep height consistent */}
                                                            {paginatedData.length > 0 && paginatedData.length < rowsPerPage && (
                                                                Array.from({ length: rowsPerPage - paginatedData.length }).map((_, i) => (
                                                                    <tr key={`filler-${i}`} className="h-[54px]">
                                                                        <td colSpan={3}></td>
                                                                    </tr>
                                                                ))
                                                            )}                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                            <div className="flex items-center gap-1">
                                <span>Page</span>
                                <span className="text-slate-700 font-extrabold">{currentPage}</span>
                                <span>/</span>
                                <span className="text-slate-700 font-extrabold">{totalPages}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* PANEL 5: CIRCLE DIAGRAM */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-blue-100 shadow-md flex flex-col overflow-hidden ring-1 ring-blue-50">
                    <div className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Result Summary</h3>
                    </div>
                    <div className="flex-1 p-6 flex items-center justify-center relative min-h-0">
                        {totalProcessed > 0 ? (
                            <div className="w-full h-full max-h-[300px]">
                                <Doughnut data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <div className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Waiting for data...</div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50 shrink-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Total Processed: <span className="text-slate-700 text-sm ml-1">{totalProcessed}</span> packets
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
