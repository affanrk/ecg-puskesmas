'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LegendItem } from 'chart.js';
import { PieChart, Activity } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DistributionChartProps {
    stats: Record<string, number>;
    isVertical?: boolean;
}

export default function DistributionChart({ stats, isVertical = false }: DistributionChartProps) {
    const totalProcessed = useMemo(() => {
        return Object.values(stats).reduce((a, b) => a + b, 0);
    }, [stats]);

    const getColorForLabel = (label: string) => {
        const l = label.toLowerCase();
        if (l === 'normal') return '#10b981';
        if (l === 'abnormal') return '#64748b';
        if (l === 'berpotensi aritmia') return '#f97316';
        if (l === 'sangat berpotensi aritmia') return '#ef4444';
        if (l.includes('sangat')) return '#ef4444';
        if (l.includes('berpotensi')) return '#f97316';
        if (l.includes('aritmia')) return '#f43f5e';
        if (l.includes('unknown') || l.includes('insufficient')) return '#cbd5e1';
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
        layout: { 
            padding: isVertical ? { top: 5, bottom: 5, left: 10, right: 10 } : { top: 15, bottom: 15, left: 15, right: 15 } 
        },
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: isVertical ? 8 : 15,
                    font: { size: 9, family: 'var(--font-inter)', weight: 600 },
                    color: '#64748b',
                    generateLabels: (chart: ChartJS): LegendItem[] => {
                        const data = chart.data;
                        if (data.labels && data.labels.length && data.datasets.length) {
                            return (data.labels as string[]).map((label: string, i: number): LegendItem => ({
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
        <div className="bg-white flex flex-col overflow-hidden transition-all duration-500 min-h-0 h-full">
            <div className="px-8 py-5 border-b border-slate-50 bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-md flex items-center justify-center border border-slate-100 shadow-sm">
                        <PieChart size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-xs 2xl:text-sm tracking-tight italic uppercase">Classification Distribution</h3>
                        <p className="text-[9px] 2xl:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Aggregate Results Data</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 p-6 2xl:p-10 flex items-center justify-center relative min-h-0">
                {totalProcessed > 0 && (
                    <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none pb-12 2xl:pb-16">
                        <span className="text-3xl 2xl:text-5xl font-black text-slate-800 tracking-tighter leading-none">{totalProcessed}</span>
                        <span className="text-[10px] 2xl:text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-2 ml-1">Packets</span>
                    </div>
                )}
                {totalProcessed > 0 ? (
                    <div className="w-full h-full z-10 animate-in fade-in zoom-in-95 duration-700">
                        < Doughnut data={chartData} options={chartOptions} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 opacity-30 py-8">
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <Activity size={24} className="text-slate-300" />
                        </div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Awaiting Analytics</div>
                    </div>
                )}
            </div>
        </div>
    );
}
