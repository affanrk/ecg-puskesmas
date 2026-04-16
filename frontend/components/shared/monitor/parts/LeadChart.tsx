'use client';

import React, { forwardRef } from 'react';

interface LeadChartProps {
    label: string;
    canvasHeight: number | null;
    gridStyle: React.CSSProperties;
}

export const LeadChart = React.memo(forwardRef<HTMLCanvasElement, LeadChartProps>(
    function LeadChart({ label, canvasHeight, gridStyle }, ref) {
        return (
            <div
                className="relative w-full overflow-hidden bg-white flex-1"
                style={{
                    ...gridStyle,
                    height: canvasHeight ? `${canvasHeight}px` : 'auto'
                }}
            >
                <div className="absolute top-2 left-4 z-10 pointer-events-none">
                    <div className="text-[8px] font-mono font-bold text-rose-600/40 uppercase tracking-widest">Speed: 25mm/s | Gain: 10mm/mV</div>
                </div>
                <div className="absolute top-2 right-4 z-10 pointer-events-none">
                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-white/90 px-1.5 py-0.5 border border-slate-200 shadow-sm rounded-sm">
                        {label}
                    </div>
                </div>
                <canvas
                    ref={ref}
                    style={{ height: canvasHeight ? `${canvasHeight}px` : '100%' }}
                    className="w-full relative z-0 block transform-gpu"
                ></canvas>
            </div>
        );
    }
));
