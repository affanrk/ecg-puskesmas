'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js';

interface UsePerformanceChartProps {
    data: number[];
    color: string;
    label: string;
    maxPoints: number;
    suggestedMax: number;
}

export function usePerformanceChart({ data, color, label, maxPoints, suggestedMax }: UsePerformanceChartProps) {
    const chartRef = useRef<Chart | null>(null);

    // Initialize Chart
    const initChart = (ctx: CanvasRenderingContext2D) => {
        // Create Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, color + '40'); // 25% opacity
        gradient.addColorStop(1, color + '00'); // 0% opacity

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: Array(maxPoints).fill(''),
                datasets: [{
                    label,
                    data: [], // Initialize empty, let updateData fill it
                    borderColor: color,
                    backgroundColor: gradient,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.35 // Slightly sharper
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
                        grid: { 
                            color: '#f1f5f9', // slate-100
                            tickLength: 0
                        },
                        border: { display: false },
                        ticks: { 
                            color: '#94a3b8', // slate-400
                            font: { size: 9, family: 'var(--font-inter)', weight: 600 },
                            padding: 6,
                            maxTicksLimit: 5
                        }
                    }
                }
            }
        };

        chartRef.current = new Chart(ctx, config);
    };

    // Update Chart Data
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateChart = () => {
        if (chartRef.current) {
            chartRef.current.data.datasets[0].data = [...data];
            chartRef.current.update('none');
        }
    };

    // Cleanup Chart
    const destroyChart = () => {
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }
    };

    useEffect(() => {
        updateChart();
    }, [data, updateChart]);

    return { initChart, destroyChart };
}
