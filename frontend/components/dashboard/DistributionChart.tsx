'use client';

import { useMemo } from 'react';
import { PieChart, Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LegendItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DistributionChartProps {
    stats: Record<string, number>;
}

export default function DistributionChart({ stats }: DistributionChartProps) {
    const totalProcessed = useMemo(() => {
        return Object.values(stats).reduce((a, b) => a + b, 0);
    }, [stats]);

    const getColorForLabel = (label: string) => {
        const l = label.toLowerCase();
        if (l === 'normal') return '#10b981';
        if (l === 'abnormal') return '#94a3b8';
        if (l === 'berpotensi aritmia') return '#f97316';
        if (l === 'sangat berpotensi aritmia') return '#ef4444';
        
        if (l.includes('sangat')) return '#ef4444';
        if (l.includes('berpotensi')) return '#f97316';
        if (l.includes('aritmia')) return '#f43f5e';
        
        return '#94a3b8';
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

    return (
        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500">
            <div className="px-8 py-5 border-b border-slate-50 bg-white/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-md flex items-center justify-center border border-slate-100 shadow-sm">
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
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <Activity size={32} className="text-slate-300" />
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Awaiting Analytics</div>
                    </div>
                )}
                {totalProcessed > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{totalProcessed}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1.5">Total Packets</span>
                    </div>
                )}
            </div>
        </div>
    );
}