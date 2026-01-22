'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartOptions } from 'chart.js';
import '@/config/chartSetup';
import { globalEventBus } from '@/services/events';
import { CONFIG, EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

// --- Interfaces ---

interface ECGChartProps {
    visibleLeads: {
        leadI: boolean;
        leadII: boolean;
        v1: boolean;
    };
    onToggleLead?: (key: 'leadI' | 'leadII' | 'v1') => void;
}

// --- Helpers ---

const medicalGridStyle = {
    backgroundColor: '#fff',
    backgroundImage: `
        linear-gradient(rgba(255, 50, 50, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 50, 50, 0.1) 1px, transparent 1px),
        linear-gradient(rgba(255, 0, 0, 0.2) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 0, 0, 0.2) 1px, transparent 1px)
    `,
    backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
    backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px'
};

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
    
    // Round limit up to nearest 0.1 to prevent double decimals (e.g. 1.11 -> 1.2)
    const limit = Math.ceil(maxVal * 1.1 * 10) / 10;
    
    const currentMax = chart.options.scales?.y?.max as number;

    if (chart.options.scales?.y && Math.abs(currentMax - limit) > 0.1) {
        chart.options.scales.y.min = -limit;
        chart.options.scales.y.max = limit;
    }
};

const createChartConfig = (totalPoints: number, initialData: (number | null)[], visibleLeads: ECGChartProps['visibleLeads']): ChartOptions => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
            padding: {
                left: 10,
                right: 10,
                top: 15,
                bottom: 10
            }
        },
        plugins: { 
            legend: { display: false }, 
            tooltip: { enabled: false } 
        },
        scales: {
            x: {
                type: 'linear',
                display: true, 
                min: 0,
                max: totalPoints,
                grid: { display: false },
                ticks: { display: false },
                border: { display: false }
            },
            y: {
                display: true,
                position: 'left',
                grid: { display: false },
                border: { display: false },
                ticks: {
                    display: true,
                    color: '#475569', // Slate-600
                    font: {
                        size: 10,
                        family: 'var(--font-geist-mono)',
                        weight: 700
                    },
                    padding: 4,
                    stepSize: 0.5, // Force 0.5 increments
                    callback: (value) => `${Number(value).toFixed(1)}mV`
                },
                min: -2,
                max: 2
            }
        },
        elements: { 
            point: { radius: 0 }, 
            line: { 
                borderWidth: 1.5, 
                tension: 0.4
            } 
        }
    };
};

// --- Component ---

export default function ECGChart({ visibleLeads, onToggleLead }: ECGChartProps) {
    // 1. Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const cursorRef = useRef(0);
    const bufferRef = useRef<{ leadI: number | null, leadII: number | null, v1: number | null }[]>([]);

    // 2. Store Hooks
    const { currentDeviceId, isRecording, ecgBuffer } = useStore();

    // 3. Effects

    // Init Chart & Render Loop
    useEffect(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const totalPoints = CONFIG.MAX_DATA_POINTS;
        const initialData = new Array(totalPoints).fill(null);
        const options = createChartConfig(totalPoints, initialData, visibleLeads);

        // Create Chart Instance
        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: totalPoints }, (_, i) => i),
                datasets: [
                    { 
                        label: 'Lead I', 
                        data: [...initialData], 
                        borderColor: '#0f172a', // Standard Dark (Medical Ink)
                        borderWidth: 1.5, 
                        hidden: !visibleLeads.leadI 
                    },
                    { 
                        label: 'Lead II', 
                        data: [...initialData], 
                        borderColor: '#0f172a', // Standard Dark (Medical Ink)
                        borderWidth: 1.5, 
                        hidden: !visibleLeads.leadII 
                    },
                    { 
                        label: 'V1', 
                        data: [...initialData], 
                        borderColor: '#0f172a', // Standard Dark (Medical Ink)
                        borderWidth: 1.5, 
                        hidden: !visibleLeads.v1 
                    }
                ]
            },
            options: options
        });

        // Restore Persistent Data
        if (ecgBuffer.length > 0 && chartRef.current) {
            const chart = chartRef.current;
            const ds0 = chart.data.datasets[0].data;
            const ds1 = chart.data.datasets[1].data;
            const ds2 = chart.data.datasets[2].data;
            
            const pointsToRestore = ecgBuffer.slice(-totalPoints);
            
            pointsToRestore.forEach((pt, i) => {
                ds0[i] = pt.leadI;
                ds1[i] = pt.leadII;
                ds2[i] = pt.v1;
            });
            
            // Set cursor to the end of the restored data so the sweep continues from there
            cursorRef.current = pointsToRestore.length % totalPoints;
            
            adjustScale(chart);
            chart.update('none');
        }

        // Render Logic
        const processBuffer = () => {
            if (!chartRef.current || bufferRef.current.length === 0) return;
            
            const chart = chartRef.current;
            const eraseGap = CONFIG.ERASE_GAP;
            const processLimit = 200; 
            const pointsToProcess = bufferRef.current.splice(0, processLimit);

            const ds0 = chart.data.datasets[0].data;
            const ds1 = chart.data.datasets[1].data;
            const ds2 = chart.data.datasets[2].data;

            let lastCursor = cursorRef.current;

            for (let i = 0; i < pointsToProcess.length; i++) {
                const data = pointsToProcess[i];
                
                ds0[lastCursor] = data.leadI;
                ds1[lastCursor] = data.leadII;
                ds2[lastCursor] = data.v1;

                for (let j = 1; j <= eraseGap; j++) {
                    const eraseIdx = (lastCursor + j) % totalPoints;
                    ds0[eraseIdx] = null;
                    ds1[eraseIdx] = null;
                    ds2[eraseIdx] = null;
                }

                lastCursor = (lastCursor + 1) % totalPoints;
            }
            
            cursorRef.current = lastCursor;

            if (lastCursor % 50 === 0) {
                 adjustScale(chart);
            }

            chart.update('none');
        };

        let animationFrameId: number;
        const renderLoop = () => {
            processBuffer();
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        animationFrameId = requestAnimationFrame(renderLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle Visibility Changes
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;
        
        chart.setDatasetVisibility(0, visibleLeads.leadI);
        chart.setDatasetVisibility(1, visibleLeads.leadII);
        chart.setDatasetVisibility(2, visibleLeads.v1);
        chart.update('none');
    }, [visibleLeads.leadI, visibleLeads.leadII, visibleLeads.v1]);

    // Handle Reset/Clear
    useEffect(() => {
        if (!chartRef.current) return;
        if (ecgBuffer.length === 0) {
            const chart = chartRef.current;
            cursorRef.current = 0;
            bufferRef.current = [];
            chart.data.datasets.forEach(ds => ds.data.fill(null));
            if (chart.options.scales?.y) {
                chart.options.scales.y.min = -2;
                chart.options.scales.y.max = 2;
            }
            chart.update('none');
        }
    }, [currentDeviceId, isRecording, ecgBuffer.length]);

    // Handle Data Stream
    useEffect(() => {
        const handleData = (data: { leadI: number, leadII: number, v1: number }) => {
            bufferRef.current.push(data);
        };

        const handleBatch = (batch: { leadI: number, leadII: number, v1: number }[]) => {
            bufferRef.current.push(...batch);
        };

        globalEventBus.on(EVENTS.CHART.ECG_DATA, handleData);
        globalEventBus.on(EVENTS.CHART.ECG_BATCH, handleBatch);

        return () => {
            globalEventBus.off(EVENTS.CHART.ECG_DATA, handleData);
            globalEventBus.off(EVENTS.CHART.ECG_BATCH, handleBatch);
        };
    }, []);

    return (
        <div className="flex flex-col w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header Controls */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white relative z-20">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                    <h3 className="font-black text-rose-600 text-xs uppercase tracking-widest">Live ECG Signal</h3>
                </div>
                <div className="flex gap-2">
                    {onToggleLead && (
                        <>
                            <LeadToggle 
                                label="Lead I" 
                                active={visibleLeads.leadI} 
                                activeClass="bg-slate-900 text-white border-slate-900 shadow-md" 
                                onClick={() => onToggleLead('leadI')}
                            />
                            <LeadToggle 
                                label="Lead II" 
                                active={visibleLeads.leadII} 
                                activeClass="bg-slate-900 text-white border-slate-900 shadow-md" 
                                onClick={() => onToggleLead('leadII')}
                            />
                            <LeadToggle 
                                label="V1" 
                                active={visibleLeads.v1} 
                                activeClass="bg-slate-900 text-white border-slate-900 shadow-md" 
                                onClick={() => onToggleLead('v1')}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Chart Canvas Area */}
            <div className="h-[300px] w-full relative min-h-0" style={medicalGridStyle}>
                <canvas ref={canvasRef} id="ecgChart" className="relative z-10 w-full h-full"></canvas>
            </div>

            {/* Bottom Info Bar */}
            <div className="h-[50px] bg-white border-t border-slate-100 flex items-center px-5 justify-between shrink-0 relative z-20">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Standard Scale</span>
                        <span className="text-xs font-extrabold text-slate-900 uppercase">10mm/mV</span>
                    </div>
                    <div className="w-px h-6 bg-slate-100"></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Sweep Speed</span>
                        <span className="text-xs font-extrabold text-slate-900 uppercase">25mm/s</span>
                    </div>
                </div>
                <div className="text-[9px] font-mono font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                    Real-time Diagnostic Visualization
                </div>
            </div>
        </div>
    );
}

// --- Sub-components ---

const LeadToggle = ({ label, active, activeClass, onClick }: { label: string, active: boolean, activeClass: string, onClick: () => void }) => (
    <button
        type="button"
        className={clsx(
            "flex items-center justify-center px-4 h-8 rounded-lg cursor-pointer select-none transition-all text-[11px] font-bold active:scale-95 border",
            active 
                ? activeClass 
                : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:border-slate-300 shadow-sm"
        )}
        onMouseDown={(e) => {
            e.preventDefault();
            onClick();
        }}
        onClick={(e) => e.stopPropagation()}
    >
        {label}
    </button>
);
