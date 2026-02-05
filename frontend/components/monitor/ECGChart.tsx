'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart, ChartOptions } from 'chart.js';
import '@/config/chartSetup';
import { globalEventBus } from '@/services/events';
import { CONFIG, EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import { useSessionManager } from '@/hooks/useSessionManager';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import clsx from 'clsx';
import { Activity, Square, XCircle } from 'lucide-react';
import DeviceDropdown from './DeviceDropdown';

interface ECGChartProps {
    onToggleLead?: (key: 'leadI' | 'leadII' | 'v1') => void;
    visibleLeads?: Record<string, boolean>;
}

const medicalGridStyle = {
    backgroundColor: '#ffffff',
    backgroundImage: `
        linear-gradient(rgba(244, 63, 94, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(244, 63, 94, 0.1) 1px, transparent 1px),
        linear-gradient(rgba(244, 63, 94, 0.2) 1px, transparent 1px),
        linear-gradient(90deg, rgba(244, 63, 94, 0.2) 1px, transparent 1px)
    `,
    backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
    backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px'
};

const createChartConfig = (totalPoints: number, minY: number = -2, maxY: number = 2): ChartOptions => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        devicePixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
        layout: {
            padding: { left: 5, right: 5, top: 15, bottom: 15 }
        },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
        scales: {
            x: {
                type: 'linear',
                display: false,
                min: 0,
                max: totalPoints,
            },
            y: {
                display: true,
                position: 'left',
                grid: { display: false },
                border: { display: false },
                ticks: {
                    display: true,
                    color: '#475569',
                    font: {
                        size: 9,
                        family: 'monospace',
                        weight: 'bold'
                    },
                    padding: 8,
                    stepSize: 0.5,
                    callback: (value) => `${parseFloat(value as string).toFixed(1)}mV`
                },
                suggestedMin: minY,
                suggestedMax: maxY
            }
        },
        elements: {
            point: { radius: 0 },
            line: {
                borderWidth: 2,
                tension: 0.35,
                borderColor: '#0f172a', // Sharp Dark Slate signal
            }
        }
    };
};

const adjustScaleSingle = (chart: Chart) => {
    const ds = chart.data.datasets[0];
    let maxAbs = 0;
    let hasData = false;

    for (let j = 0; j < ds.data.length; j++) {
        const v = ds.data[j] as number;
        if (v !== null && v !== undefined) {
            const absV = Math.abs(v);
            if (absV > maxAbs) maxAbs = absV;
            hasData = true;
        }
    }

    let limit;
    if (!hasData || maxAbs === 0) {
        limit = 2.0;
    } else {
        limit = maxAbs * 1.2;
    }

    const roundedLimit = Math.ceil(limit * 10) / 10;

    if (chart.options.scales?.y) {
        chart.options.scales.y.min = -roundedLimit;
        chart.options.scales.y.max = roundedLimit;
    }
};

export default function ECGChart({ }: ECGChartProps) {
    const canvasRefI = useRef<HTMLCanvasElement>(null);
    const canvasRefII = useRef<HTMLCanvasElement>(null);
    const canvasRefV1 = useRef<HTMLCanvasElement>(null);

    const chartRefI = useRef<Chart | null>(null);
    const chartRefII = useRef<Chart | null>(null);
    const chartRefV1 = useRef<Chart | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const [snappedHeight, setSnappedHeight] = useState<number | null>(null);
    const [canvasHeight, setCanvasHeight] = useState<number | null>(null);

    const cursorRef = useRef(0);
    const bufferRef = useRef<{ leadI: number | null, leadII: number | null, v1: number | null }[]>([]);
    const isMounted = useRef(false);

    const { user, currentDeviceId, isRecording, ecgBuffer, isSessionActive, resetSession } = useStore();
    const { toggleRecording } = useSessionManager();
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    // Final Clarity Fix: Sync CSS pixels to Bitmap pixels
    useEffect(() => {
        isMounted.current = true;
        const syncPixels = () => {
            if (!containerRef.current || !isMounted.current) return;
            
            // Use Math.floor on parent to start from a clean integer
            const parentHeight = Math.floor(containerRef.current.parentElement?.clientHeight || 0);
            const reserved = 90; // Header(45) + Footer(45)
            const available = parentHeight - reserved;
            
            // Calculation for Sharpness:
            // The container has border-y (2px total).
            // Inside, we use divide-y which adds 1px between each lead (2px total for 3 leads).
            // Total fixed border/divider height = 4px.
            const cH = Math.floor((available - 4) / 3);
            if (cH <= 0) return;

            const totalH = (3 * cH) + 4;
            const dpr = window.devicePixelRatio || 1;

            setCanvasHeight(cH);
            setSnappedHeight(totalH);

            [
                { cRef: canvasRefI, chartRef: chartRefI },
                { cRef: canvasRefII, chartRef: chartRefII },
                { cRef: canvasRefV1, chartRef: chartRefV1 }
            ].forEach(({ cRef, chartRef }) => {
                const canvas = cRef.current;
                if (canvas && isMounted.current) {
                    const rect = canvas.getBoundingClientRect();
                    canvas.width = Math.round(rect.width * dpr);
                    canvas.height = Math.round(cH * dpr);
                    
                    if (chartRef.current) {
                        try {
                            chartRef.current.resize();
                            chartRef.current.update('none');
                        } catch {
                            // Silently catch resize errors during unmount or stale refs
                        }
                    }
                }
            });
        };

        const observer = new ResizeObserver(syncPixels);
        if (containerRef.current?.parentElement) observer.observe(containerRef.current.parentElement);
        syncPixels();
        return () => {
            isMounted.current = false;
            observer.disconnect();
        };
    }, []);

    const handleReset = () => {
        if (isRecording) return;
        setShowConfirmReset(true);
    };

    const confirmReset = () => {
        resetSession();
        setShowConfirmReset(false);
    };

    useEffect(() => {
        const totalPoints = CONFIG.MAX_DATA_POINTS;
        const initialData = new Array(totalPoints).fill(null);
        const signalColor = '#0f172a'; // High-contrast Dark Slate

        if (canvasRefI.current) {
            const ctxI = canvasRefI.current.getContext('2d');
            if (ctxI) {
                chartRefI.current = new Chart(ctxI, {
                    type: 'line',
                    data: {
                        labels: Array.from({ length: totalPoints }, (_, i) => i),
                        datasets: [{ data: [...initialData], borderColor: signalColor }]
                    },
                    options: createChartConfig(totalPoints)
                });
            }
        }

        if (canvasRefII.current) {
            const ctxII = canvasRefII.current.getContext('2d');
            if (ctxII) {
                chartRefII.current = new Chart(ctxII, {
                    type: 'line',
                    data: {
                        labels: Array.from({ length: totalPoints }, (_, i) => i),
                        datasets: [{ data: [...initialData], borderColor: signalColor }]
                    },
                    options: createChartConfig(totalPoints)
                });
            }
        }

        if (canvasRefV1.current) {
            const ctxV1 = canvasRefV1.current.getContext('2d');
            if (ctxV1) {
                chartRefV1.current = new Chart(ctxV1, {
                    type: 'line',
                    data: {
                        labels: Array.from({ length: totalPoints }, (_, i) => i),
                        datasets: [{ data: [...initialData], borderColor: signalColor }]
                    },
                    options: createChartConfig(totalPoints)
                });
            }
        }

        if (ecgBuffer.length > 0) {
            const pointsToRestore = ecgBuffer.slice(-totalPoints);

            if (chartRefI.current) {
                const ds = chartRefI.current.data.datasets[0].data;
                pointsToRestore.forEach((pt, i) => ds[i] = pt.leadI);
                adjustScaleSingle(chartRefI.current);
                chartRefI.current.update('none');
            }
            if (chartRefII.current) {
                const ds = chartRefII.current.data.datasets[0].data;
                pointsToRestore.forEach((pt, i) => ds[i] = pt.leadII);
                adjustScaleSingle(chartRefII.current);
                chartRefII.current.update('none');
            }
            if (chartRefV1.current) {
                const ds = chartRefV1.current.data.datasets[0].data;
                pointsToRestore.forEach((pt, i) => ds[i] = pt.v1);
                adjustScaleSingle(chartRefV1.current);
                chartRefV1.current.update('none');
            }

            cursorRef.current = pointsToRestore.length % totalPoints;
        }

        const processBuffer = () => {
            if (bufferRef.current.length === 0) return;

            const eraseGap = CONFIG.ERASE_GAP;
            const processLimit = 200;
            const pointsToProcess = bufferRef.current.splice(0, processLimit);

            const cI = chartRefI.current;
            const cII = chartRefII.current;
            const cV1 = chartRefV1.current;

            let lastCursor = cursorRef.current;

            for (let i = 0; i < pointsToProcess.length; i++) {
                const data = pointsToProcess[i];

                if (cI) {
                    const dsI = cI.data.datasets[0].data;
                    dsI[lastCursor] = data.leadI ?? 0;
                    for (let j = 1; j <= eraseGap; j++) dsI[(lastCursor + j) % totalPoints] = null;
                }

                if (cII) {
                    const dsII = cII.data.datasets[0].data;
                    dsII[lastCursor] = data.leadII ?? 0;
                    for (let j = 1; j <= eraseGap; j++) dsII[(lastCursor + j) % totalPoints] = null;
                }

                if (cV1) {
                    const dsV1 = cV1.data.datasets[0].data;
                    dsV1[lastCursor] = data.v1 ?? 0;
                    for (let j = 1; j <= eraseGap; j++) dsV1[(lastCursor + j) % totalPoints] = null;
                }

                lastCursor = (lastCursor + 1) % totalPoints;
            }

            cursorRef.current = lastCursor;

            if (lastCursor % 50 === 0) {
                if (cI) adjustScaleSingle(cI);
                if (cII) adjustScaleSingle(cII);
                if (cV1) adjustScaleSingle(cV1);
            }

            if (cI) cI.update('none');
            if (cII) cII.update('none');
            if (cV1) cV1.update('none');
        };

        let animationFrameId: number;
        const renderLoop = () => {
            processBuffer();
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        animationFrameId = requestAnimationFrame(renderLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
            chartRefI.current?.destroy();
            chartRefII.current?.destroy();
            chartRefV1.current?.destroy();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (ecgBuffer.length === 0) {
            cursorRef.current = 0;
            bufferRef.current = [];
            [chartRefI, chartRefII, chartRefV1].forEach(ref => {
                if (ref.current) {
                    ref.current.data.datasets[0].data.fill(null);
                    if (ref.current.options.scales?.y) {
                        ref.current.options.scales.y.min = -2;
                        ref.current.options.scales.y.max = 2;
                    }
                    ref.current.update('none');
                }
            });
        }
    }, [currentDeviceId, isRecording, ecgBuffer.length]);

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
        <div className="flex flex-col w-full h-full bg-white relative transition-all duration-500">
            {/* Clinical Header: Better UI/UX */}
            <div className="h-[45px] flex items-center justify-between px-6 border-b border-slate-100 bg-white relative z-20 shrink-0">
                <div className="flex items-center gap-8">
                    {/* Live Indicator */}
                    <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
                        <Activity size={14} className="text-rose-500 animate-pulse" />
                        <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-tight">Monitoring</h3>
                    </div>

                    {/* Patient Clinical Profile */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                                {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-800 leading-none">
                                    {user?.full_name || user?.username || 'Unknown Patient'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Patient Identity</span>
                            </div>
                        </div>

                        <div className="w-px h-6 bg-slate-100" />

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medical History:</span>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                    {user?.medical_history || 'No Prior Records'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[9px] font-mono font-bold text-slate-300 uppercase tracking-[0.2em]">
                    ECG-LX Digital Stream
                </div>
            </div>

            {/* Waveforms Area - Simplified & Sharp */}
            <div 
                ref={containerRef}
                className="w-full flex flex-col bg-white border-y border-slate-950 divide-y divide-slate-950 overflow-hidden shrink-0"
                style={{ height: snappedHeight ? `${snappedHeight}px` : 'auto' }}
            >
                {[
                    { id: 'leadI', label: 'Lead I', ref: canvasRefI },
                    { id: 'leadII', label: 'Lead II', ref: canvasRefII },
                    { id: 'v1', label: 'V1', ref: canvasRefV1 }
                ].map((lead) => (
                    <div 
                        key={lead.id} 
                        className="relative w-full overflow-hidden bg-white"
                        style={{ 
                            ...medicalGridStyle,
                            height: canvasHeight ? `${canvasHeight}px` : 'auto'
                        }}
                    >
                        {/* Technical Parameters */}
                        <div className="absolute top-2 left-4 z-10 pointer-events-none">
                            <div className="text-[8px] font-mono font-bold text-rose-600/40 uppercase tracking-widest">Speed: 25mm/s | Gain: 10mm/mV</div>
                        </div>
                        {/* Lead Title */}
                        <div className="absolute top-2 right-4 z-10 pointer-events-none">
                            <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-white/90 px-1.5 py-0.5 border border-slate-200 shadow-sm rounded-sm">
                                {lead.label}
                            </div>
                        </div>
                        <canvas 
                            ref={lead.ref} 
                            style={{ height: canvasHeight ? `${canvasHeight}px` : '100%' }}
                            className="w-full relative z-0 block"
                        ></canvas>
                    </div>
                ))}
            </div>

            {/* Footer: Fixed Integer Height */}
            <div className="h-[45px] bg-white border-t border-slate-100 flex items-center px-4 justify-between shrink-0 relative z-20">
                <div className="flex items-center gap-4">
                    <DeviceDropdown />
                </div>

                <div className="flex items-center gap-3">
                    {(currentDeviceId || isSessionActive) && (
                        <div className="flex items-center gap-2">
                            {!isSessionActive ? (
                                <button
                                    onClick={toggleRecording}
                                    disabled={!currentDeviceId}
                                    className={clsx(
                                        "flex items-center gap-2 px-6 py-1.5 rounded-md text-[10px] font-black shadow-lg transition-all active:scale-95 justify-center uppercase tracking-wider text-white",
                                        !currentDeviceId ? "bg-slate-300 shadow-none cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                                    )}
                                >
                                    <Activity size={14} /> Start Recording
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={toggleRecording}
                                        disabled={!isRecording && !currentDeviceId}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black shadow-lg transition-all active:scale-95 justify-center uppercase tracking-wider text-white",
                                            isRecording 
                                                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20" 
                                                : (!currentDeviceId 
                                                    ? "bg-slate-300 shadow-none cursor-not-allowed" 
                                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20")
                                        )}
                                    >
                                        {isRecording ? <><Square size={12} fill="currentColor" /> Stop Recording</> : <><Activity size={12} /> Resume Recording</>}
                                    </button>

                                    <button
                                        onClick={handleReset}
                                        disabled={isRecording}
                                        className={clsx(
                                            "px-2.5 py-1.5 rounded-md text-[10px] font-black border transition-all uppercase tracking-wider flex items-center justify-center",
                                            isRecording
                                                ? "bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100"
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm active:scale-95"
                                        )}
                                        title="End Session"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={showConfirmReset}
                onClose={() => setShowConfirmReset(false)}
                onConfirm={confirmReset}
                title="End Session?"
                message="Are you sure you want to end this session? All unsaved data will be cleared and the device will be disconnected from the current patient context."
                confirmText="End Session"
                isDestructive={true}
            />
        </div>
    );
}
