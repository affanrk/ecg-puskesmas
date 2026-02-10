'use client';

import { useEffect, useRef } from 'react';
import '@/config/chartSetup';
import { usePerformanceChart } from '@/hooks/usePerformanceChart';

interface PerformanceChartProps {
    data: number[];
    color: string;
    label: string;
    maxPoints?: number;
    suggestedMax?: number;
}

export default function PerformanceChart({ data, color, label, maxPoints = 50, suggestedMax = 100 }: PerformanceChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const { initChart, destroyChart } = usePerformanceChart({
        data,
        color,
        label,
        maxPoints,
        suggestedMax
    });

    useEffect(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        initChart(ctx);

        return () => {
            destroyChart();
        };
    }, [initChart, destroyChart]);

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
