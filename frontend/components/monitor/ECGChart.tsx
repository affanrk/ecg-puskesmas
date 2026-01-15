'use client';

import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import '@/config/chartSetup';
import { globalEventBus } from '@/services/events';
import { CONFIG, EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

interface ECGChartProps {
    visibleLeads: {
        leadI: boolean;
        leadII: boolean;
        v1: boolean;
    };
    onToggleLead?: (key: 'leadI' | 'leadII' | 'v1') => void;
}

const LeadToggle = ({ label, active, colorClass, onClick }: any) => (
    <button
        type="button"
        className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer select-none group bg-white border transition-all active:scale-95 hover:shadow-sm",
            active ? "border-slate-300 shadow-sm" : "border-slate-200"
        )}
        onMouseDown={(e) => {
            e.preventDefault();
            onClick();
        }}
        onClick={(e) => {
            e.stopPropagation();
        }}
    >
        <div className={clsx(
            "w-2.5 h-2.5 rounded-full transition-colors",
            active ? colorClass : "bg-slate-200"
        )}></div>
        <span className={clsx(
            "text-[10px] font-bold transition-colors",
            active ? "text-slate-700" : "text-slate-400"
        )}>{label}</span>
    </button>
);

export default function ECGChart({ visibleLeads, onToggleLead }: ECGChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const cursorRef = useRef(0);
    const { currentDeviceId, patient } = useStore();

    // Initialize Chart
    useEffect(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const totalPoints = CONFIG.MAX_DATA_POINTS;
        const initialData = new Array(totalPoints).fill(null);

        const commonOptions: any = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'none' },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: {
                    type: 'linear',
                    display: false,
                    min: 0,
                    max: totalPoints
                },
                y: {
                    display: true,
                    grid: { color: CONFIG.COLORS.grid, drawBorder: false },
                    ticks: {
                        color: CONFIG.COLORS.text,
                        font: {
                            size: 10,
                            family: 'var(--font-geist-mono)',
                            weight: '700'
                        }
                    },
                    min: -2,
                    max: 2
                }
            },
            elements: { point: { radius: 0 }, line: { borderWidth: 1.5, tension: 0.3 } }
        };

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: totalPoints }, (_, i) => i),
                datasets: [
                    { label: 'Lead I', data: [...initialData], borderColor: CONFIG.COLORS.leadI, borderWidth: 1.5, hidden: !visibleLeads.leadI },
                    { label: 'Lead II', data: [...initialData], borderColor: CONFIG.COLORS.leadII, borderWidth: 1.5, hidden: !visibleLeads.leadII },
                    { label: 'V1', data: [...initialData], borderColor: CONFIG.COLORS.v1, borderWidth: 1.5, hidden: !visibleLeads.v1 }
                ]
            },
            options: commonOptions
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, []);

    // Handle Visibility Changes
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;
        
        chart.setDatasetVisibility(0, visibleLeads.leadI);
        chart.setDatasetVisibility(1, visibleLeads.leadII);
        chart.setDatasetVisibility(2, visibleLeads.v1);
        chart.update('none');
    }, [visibleLeads]);

    // Handle Clear on Device or Patient Change
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;
        cursorRef.current = 0;
        chart.data.datasets.forEach(ds => ds.data.fill(null));
        
        // Reset scales to legacy defaults
        if (chart.options.scales?.y) {
            chart.options.scales.y.min = -2;
            chart.options.scales.y.max = 2;
        }
        
        chart.update('none');
    }, [currentDeviceId, patient]);

    // Handle Data Stream
    useEffect(() => {
        const handleData = (data: { leadI: number, leadII: number, v1: number }) => {
            if (!chartRef.current) return;
            const chart = chartRef.current;
            const cursor = cursorRef.current;
            const totalPoints = CONFIG.MAX_DATA_POINTS;

            // Update Data
            chart.data.datasets[0].data[cursor] = data.leadI;
            chart.data.datasets[1].data[cursor] = data.leadII;
            chart.data.datasets[2].data[cursor] = data.v1;

            // Erase Bar
            const gap = CONFIG.ERASE_GAP;
            for (let i = 1; i <= gap; i++) {
                const eraseIdx = (cursor + i) % totalPoints;
                chart.data.datasets[0].data[eraseIdx] = null;
                chart.data.datasets[1].data[eraseIdx] = null;
                chart.data.datasets[2].data[eraseIdx] = null;
            }

            // Auto Scale every 10 frames
            if (cursor % 10 === 0) {
                 adjustScale(chart);
            }

            cursorRef.current = (cursor + 1) % totalPoints;
            chart.update('none');
        };

        globalEventBus.on(EVENTS.CHART.ECG_DATA, handleData);

        return () => {
            globalEventBus.off(EVENTS.CHART.ECG_DATA, handleData);
        };
    }, []);

    const adjustScale = (chart: Chart) => {
        let maxVal = 0;
        chart.data.datasets.forEach((ds, i) => {
            if (chart.isDatasetVisible(i)) {
                for (let j = 0; j < ds.data.length; j++) {
                    const v = ds.data[j] as number;
                    if (v !== null && v !== undefined) {
                        const abs = Math.abs(v);
                        if (abs > maxVal) maxVal = abs;
                    }
                }
            }
        });

        if (maxVal < 1.0) maxVal = 1.0;
        const limit = maxVal * 1.1;
        
        const currentMax = chart.options.scales?.y?.max as number;

        if (chart.options.scales?.y && Math.abs(currentMax - limit) > 0.1) {
            chart.options.scales.y.min = -limit;
            chart.options.scales.y.max = limit;
        }
    }

    return (
        <div className="flex flex-col w-full">
            {/* Header Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 bg-slate-50/30 mb-1">
                <h3 className="font-bold text-slate-700 text-xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                    Live ECG Signal
                </h3>
                <div className="flex gap-2">
                    {onToggleLead && (
                        <>
                            <LeadToggle 
                                label="LEAD I" 
                                active={visibleLeads.leadI} 
                                colorClass="bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" 
                                onClick={() => onToggleLead('leadI')}
                            />
                            <LeadToggle 
                                label="LEAD II" 
                                active={visibleLeads.leadII} 
                                colorClass="bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" 
                                onClick={() => onToggleLead('leadII')}
                            />
                            <LeadToggle 
                                label="V1" 
                                active={visibleLeads.v1} 
                                colorClass="bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" 
                                onClick={() => onToggleLead('v1')}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Chart Canvas */}
            <div className="h-[280px] w-full relative bg-white min-h-0">
                <div className="absolute inset-0 z-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                ></div>
                <canvas ref={canvasRef} id="ecgChart" className="relative z-10 w-full h-full"></canvas>
            </div>
        </div>
    );
}