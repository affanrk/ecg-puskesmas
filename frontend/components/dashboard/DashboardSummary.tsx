'use client';

import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { User, Activity, FileHeart, Clock, AlertCircle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import clsx from 'clsx';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardSummary() {
    const { patient, liveData } = useStore();

    // DATA PROCESSING
    const lastResult = liveData.length > 0 ? liveData[0] : null;

    const recentHistory = useMemo(() => {
        return liveData.slice(0, 10);
    }, [liveData]);

    const stats = useMemo(() => {
        const counts: Record<string, number> = {};
        liveData.forEach(item => {
            const label = item.classification || 'Unknown';
            counts[label] = (counts[label] || 0) + 1;
        });
        return counts;
    }, [liveData]);

    const chartData = {
        labels: Object.keys(stats),
        datasets: [
            {
                data: Object.values(stats),
                backgroundColor: [
                    '#3b82f6',
                    '#ef4444',
                    '#eab308',
                    '#22c55e',
                    '#a855f7',
                ],
                borderWidth: 0,
                hoverOffset: 4
            },
        ],
    };

    const chartOptions = {
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    font: { size: 11 }
                }
            }
        },
        maintainAspectRatio: false
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('id-ID', { 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
    };

    return (
        <div className="flex flex-col gap-4 h-[calc(100vh-115px)] min-h-[500px]">
            
            {/* --- TOP ROW: 3 CARDS (Fixed Height) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                
                {/* CARD 1: ACTIVE USER */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between relative overflow-hidden group hover:border-blue-300 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active User</p>
                        {patient ? (
                            <>
                                <h3 className="text-lg font-bold text-slate-800 truncate">{patient.name}</h3>
                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-xs font-medium",
                                        patient.gender === 'L' || patient.gender === 'Male' 
                                            ? "bg-blue-50 text-blue-600" 
                                            : "bg-pink-50 text-pink-600"
                                    )}>
                                        {patient.gender === 'L' ? 'Male' : 'Female'}
                                    </span>
                                    <span>•</span>
                                    <span>{patient.age} Years Old</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-slate-400 text-sm italic py-2">No patient selected</div>
                        )}
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <User size={20} />
                    </div>
                </div>

                {/* CARD 2: LAST RECEIVED DATA */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-emerald-300 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Received</p>
                        <h3 className="text-2xl font-mono font-bold text-slate-800">
                            {lastResult ? formatTime(lastResult.timestamp) : '--:--:--'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Server Timestamp</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <Clock size={20} />
                    </div>
                </div>

                {/* CARD 3: LAST KNOWN RESULT */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-rose-300 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Result</p>
                        <h3 className={clsx(
                            "text-lg font-bold truncate",
                            !lastResult ? "text-slate-300" :
                            lastResult.classification === 'Normal' ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {lastResult?.classification || 'Waiting data...'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Confidence: {lastResult?.confidence ? (lastResult.confidence * 100).toFixed(1) + '%' : '-'}
                        </p>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
                        <Activity size={20} />
                    </div>
                </div>
            </div>

            {/* --- BOTTOM ROW: 2 PANELS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 pb-4">
                
                {/* PANEL 4: LAST 10 CLASSIFICATIONS */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <FileHeart size={18} className="text-slate-400" />
                            Recent Classifications
                        </h3>
                        <span className="text-xs font-medium px-2 py-1 bg-white border rounded text-slate-500">Last 10 Data</span>
                    </div>
                    
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Timestamp</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Classification</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentHistory.length > 0 ? (
                                    recentHistory.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 font-mono text-slate-600">{formatTime(row.timestamp)}</td>
                                            <td className="px-4 py-3">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                                                    row.classification === 'Normal' 
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                )}>
                                                    {row.classification === 'Normal' ? (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                                                    ) : (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                                                    )}
                                                    {row.classification}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {row.confidence ? (row.confidence * 100).toFixed(1) + '%' : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4">
                                            <div className="flex flex-col items-center justify-center min-h-[200px] text-slate-400 gap-2">
                                                <AlertCircle size={32} className="opacity-20" />
                                                <span className="font-medium">No data received yet</span>
                                                <p className="text-[10px] opacity-50">Waiting for live stream from device...</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PANEL 5: CIRCLE DIAGRAM */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-700">Result Summary</h3>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center relative min-h-0">
                        {liveData.length > 0 ? (
                            <div className="w-full h-full max-h-[350px]">
                                <Doughnut data={chartData} options={chartOptions} />
                            </div>
                        ) : (
                            <div className="text-center text-[10px] text-slate-400 italic">Waiting...</div>
                        )}
                    </div>
                    <div className="p-3 border-t border-slate-100 text-center bg-slate-50/30">
                        <p className="text-xs text-slate-400">
                            Total Processed: <span className="font-bold text-slate-700">{liveData.length}</span> packets
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}