'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { User, Activity, Clock, AlertCircle, RefreshCcw, ChevronLeft, ChevronRight, HeartPulse, History, PieChart } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LegendItem } from 'chart.js';
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
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const containerRef = useRef<HTMLDivElement>(null);

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
        }
    }, [user?.id]);

    // 3. Effects
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Responsive Table Height Logic
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                // Row height is 52px, Table header is approx 48px
                const availableHeight = height - 48; 
                const calculatedRows = Math.max(1, Math.floor(availableHeight / 52));
                setRowsPerPage(calculatedRows);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 4. Computed Values
    const totalProcessed = useMemo(() => {
        return Object.values(stats).reduce((a, b) => a + b, 0);
    }, [stats]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return recentRecords.slice(startIndex, startIndex + rowsPerPage);
    }, [recentRecords, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(recentRecords.length / rowsPerPage);

    const getColorForLabel = (label: string) => {
        const l = label.toLowerCase();
        if (l === 'normal') return '#10b981'; // emerald-500
        if (l === 'abnormal') return '#94a3b8'; // slate-400 (neutral gray)
        if (l === 'berpotensi aritmia') return '#f97316'; // orange-500
        if (l === 'sangat berpotensi aritmia') return '#ef4444'; // red-500
        
        // Fallbacks for other variations
        if (l.includes('sangat')) return '#ef4444';
        if (l.includes('berpotensi')) return '#f97316';
        if (l.includes('aritmia')) return '#f43f5e';
        
        return '#94a3b8'; // default gray
    };

    const chartData = {
        labels: Object.keys(stats),
        datasets: [
            {
                data: Object.values(stats),
                backgroundColor: Object.keys(stats).map(getColorForLabel),
                borderColor: '#ffffff',
                borderWidth: 4,
                hoverOffset: 10
            },
        ],
    };

    const chartOptions = {
        cutout: '65%', 
        layout: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 15,
                    font: { size: 10, family: 'var(--font-inter)', weight: 600 },
                    color: '#64748b',
                    generateLabels: (chart: ChartJS): LegendItem[] => {
                        const data = chart.data;
                        if (data.labels && data.labels.length && data.datasets.length) {
                            return data.labels.map((label: unknown, i: number): LegendItem => ({
                                text: `${String(label).toUpperCase()} (${(data.datasets[0].data as number[])[i]})`,
                                fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                                strokeStyle: '#fff',
                                lineWidth: 0,
                                pointStyle: 'circle' as const,
                                index: i
                            }));
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 12, weight: 'bold' as const },
                bodyFont: { size: 12 },
                cornerRadius: 12,
                displayColors: false
            }
        },
        maintainAspectRatio: false,
        responsive: true
    };

    // 5. Helpers
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

    const cardClass = "bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-5 transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500 relative overflow-hidden group";

    // 6. Render
    return (
        <div className="flex flex-col gap-5 h-full min-h-0">
            
            {/* --- TOP ROW: 3 CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
                
                {/* CARD 1: ACTIVE USER */}
                <div className={cardClass}>
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <User size={120} strokeWidth={1} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shadow-sm border border-teal-100/50">
                                <User size={18} strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Active User</span>
                        </div>
                        
                        {user ? (
                            <>
                                <h3 className="text-2xl font-black text-slate-800 truncate tracking-tight leading-tight mb-2">
                                    {user.full_name || user.username}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                                        <User size={10} className="text-slate-400" strokeWidth={3} />
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                            {user.gender === 'L' ? 'Male' : (user.gender ? 'Female' : 'N/A')} • {user.dob ? calculateAge(user.dob) + ' Years Old' : '-'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-slate-300 text-xs font-bold uppercase tracking-widest py-2 animate-pulse">Synchronizing...</div>
                        )}
                    </div>
                </div>

                {/* CARD 2: LAST RECEIVED DATA */}
                <div className={clsx(
                    cardClass,
                    highlight && "ring-4 ring-blue-50 border-blue-100"
                )}>
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-blue-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Clock size={120} strokeWidth={1} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm border border-blue-100/50">
                                <Clock size={18} strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">System Sync</span>
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">
                                {lastResultTime.time || '--:--:--'}
                            </h3>
                        </div>
                        <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                            {lastResultTime.date}
                        </p>
                    </div>
                </div>

                {/* CARD 3: LAST KNOWN RESULT */}
                <div className={clsx(
                    cardClass,
                    highlight && "ring-4 ring-rose-50 border-rose-100"
                )}>
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-rose-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Activity size={120} strokeWidth={1} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition-colors",
                                lastResult?.classification === 'Normal' ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : "bg-rose-50 text-rose-600 border-rose-100/50"
                            )}>
                                <Activity size={18} strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Latest Result</span>
                        </div>
                        
                        <h3 className={clsx(
                            "text-3xl font-black truncate tracking-tight flex items-center gap-2",
                            !lastResult ? "text-slate-300" :
                            lastResult.classification === 'Normal' ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {lastResult?.classification || 'Waiting...'}
                            {lastResult?.classification === 'Normal' && <HeartPulse size={24} className="animate-pulse" />}
                        </h3>
                        
                        <div className="flex items-center gap-3 mt-4">
                            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                                <div 
                                    className={clsx("h-full rounded-full transition-all duration-1000", lastResult?.classification === 'Normal' ? "bg-emerald-500" : "bg-rose-500")}
                                    style={{ width: `${(lastResult?.confidence || 0) * 100}%` }} 
                                />
                            </div>
                            <span className="text-xs font-black text-slate-600 uppercase">{( (lastResult?.confidence || 0) * 100 ).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0 pb-10">
                
                {/* PANEL 4: RECENT HISTORY */}
                <div className="lg:col-span-3 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                                <History size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-base tracking-tight">Recent Analysis</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historical Logs</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={loadDashboardData}
                            disabled={loading}
                            className={clsx(
                                "group px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                loading 
                                    ? "bg-slate-50 text-slate-300 cursor-not-allowed" 
                                    : "bg-slate-50 text-slate-500 hover:bg-teal-50 hover:text-teal-600 border border-slate-100 hover:border-teal-100 shadow-sm"
                            )}
                        >
                            <span>Refresh</span>
                            <RefreshCcw size={14} strokeWidth={3} className={clsx(loading && "animate-spin text-teal-500")} />
                        </button>
                    </div>
                    
                    <div ref={containerRef} className="flex-1 overflow-hidden relative z-10">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/30 text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-8 py-4 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-50">Time & Date</th>
                                    <th className="px-8 py-4 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-50">Classification</th>
                                    <th className="px-8 py-4 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-50 text-right">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((row, idx) => (
                                        <tr key={idx} className={clsx(
                                            "hover:bg-slate-50/50 transition-colors group h-[52px]",
                                            highlight && idx === 0 && currentPage === 1 && "bg-emerald-50/20"
                                        )}>
                                            <td className="px-8 py-4">
                                                <div className="font-mono text-sm font-bold text-slate-700">
                                                    {formatDateTime(row.changed_dt || row.timestamp).time}
                                                </div>
                                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                    {formatDateTime(row.changed_dt || row.timestamp).date}
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all border shadow-sm",
                                                    row.classification === 'Normal' 
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                )}>
                                                    <span className={clsx("w-2 h-2 rounded-full", row.classification === 'Normal' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]")}></span>
                                                    {row.classification}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <span className="font-mono text-sm font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-inner">
                                                    {row.confidence ? (row.confidence * 100).toFixed(0) + '%' : '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-300 gap-3">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-dashed border-slate-200">
                                                    <AlertCircle size={32} strokeWidth={1.5} className="opacity-40" />
                                                </div>
                                                <span className="font-black text-xs uppercase tracking-[0.2em] opacity-60">No Analysis Found</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/20 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page {currentPage} of {totalPages}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200"
                                >
                                    <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200"
                                >
                                    <ChevronRight className="w-4 h-4" strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* PANEL 5: DISTRIBUTION */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500">
                    <div className="px-8 py-5 border-b border-slate-50 bg-white/50 backdrop-blur-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                                <PieChart size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-sm tracking-tight">Distribution</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Results</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-8 flex items-center justify-center relative min-h-0">
                        {totalProcessed > 0 ? (
                            <div className="w-full h-full min-h-[220px] max-h-[280px] animate-in fade-in zoom-in-95 duration-700">
                                <Doughnut data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-4 opacity-30 py-12">
                                <div className="w-20 h-20 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center">
                                    <Activity size={32} className="text-slate-300" />
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Awaiting Analytics</div>
                            </div>
                        )}
                        
                        {/* Center Text Overlay */}
                        {totalProcessed > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{totalProcessed}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1.5">Total Packets</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}