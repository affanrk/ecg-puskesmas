'use client';

import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import '@/config/chartSetup';
import { CONFIG } from '@/config/constants';

interface PerformanceChartProps {
    data: number[];
    color: string;
    label: string;
    maxPoints?: number;
    suggestedMax?: number;
}

export default function PerformanceChart({ data, color, label, maxPoints = 50, suggestedMax = 100 }: PerformanceChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(maxPoints).fill(''),
                datasets: [{
                    label,
                    data: [...data],
                    borderColor: color,
                    backgroundColor: color + '20',
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: {
                        beginAtZero: true,
                        suggestedMax: suggestedMax,
                        grid: { color: CONFIG.COLORS.grid, drawBorder: false },
                        ticks: { color: CONFIG.COLORS.text, font: { size: 10 } }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.data.datasets[0].data = [...data];
            chartRef.current.update('none');
        }
    }, [data]);

    return (
        <div className="h-full w-full">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
}
