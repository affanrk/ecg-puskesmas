'use client';

import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import '@/config/chartSetup';

interface PerformanceChartProps {
    data: number[];
    color: string;
    label: string;
    maxPoints?: number;
    suggestedMax?: number;
}

export default function PerformanceChart({ data, color, label, maxPoints = 50, suggestedMax = 100 }: PerformanceChartProps) {
    // 1. Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    // 2. Effects
    
    // Init Chart
    useEffect(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Create Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, color + '40'); // 25% opacity
        gradient.addColorStop(1, color + '00'); // 0% opacity

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(maxPoints).fill(''),
                datasets: [{
                    label,
                    data: [], // Initialize empty, let second effect fill it
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
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [color, label, maxPoints, suggestedMax]);

    // Update Data
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.data.datasets[0].data = [...data];
            chartRef.current.update('none');
        }
    }, [data]);

    // 3. Render
    return (
        <div className="h-full w-full relative">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" 
                style={{
                    backgroundImage: `linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                }}
            />
            <canvas ref={canvasRef} className="relative z-10"></canvas>
        </div>
    );
}
