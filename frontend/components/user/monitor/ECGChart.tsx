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
                borderColor: '#0f172a', 
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

    const limit = (!hasData || maxAbs === 0) ? 2.0 : maxAbs * 1.2;
    const roundedLimit = Math.ceil(limit * 10) / 10;

    if (chart.options.scales?.y) {
        chart.options.scales.y.min = -roundedLimit;
        chart.options.scales.y.max = roundedLimit;
    }
};

export default function ECGChart({ }: ECGChartProps) {
    const canvasRefI = useRef<HTMLCanvasElement>(null);
    const canvasRefII = useRef<HTMLCanvasElement>(null);
    const canvasRefIII = useRef<HTMLCanvasElement>(null);
    const canvasRefavF = useRef<HTMLCanvasElement>(null);
    const canvasRefV1 = useRef<HTMLCanvasElement>(null);

    const chartRefI = useRef<Chart | null>(null);
    const chartRefII = useRef<Chart | null>(null);
    const chartRefIII = useRef<Chart | null>(null);
    const chartRefavF = useRef<Chart | null>(null);
    const chartRefV1 = useRef<Chart | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const [snappedHeight, setSnappedHeight] = useState<number | null>(null);
    const [canvasHeight, setCanvasHeight] = useState<number | null>(null);

    const cursorRef = useRef(0);
    const bufferRef = useRef<{ leadI: number | null, leadII: number | null, leadIII: number | null, avF: number | null, v1: number | null }[]>([]);
    const currentSpsRef = useRef(100);
    const lastFrameTimeRef = useRef(0);
    const isMounted = useRef(false);

    const { user, currentDeviceId, isRecording, ecgBuffer, isSessionActive, resetSession } = useStore();
    const { toggleRecording } = useSessionManager();
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        const syncPixels = () => {
            if (!containerRef.current || !isMounted.current) return;
            
            const parentHeight = Math.floor(containerRef.current.parentElement?.clientHeight || 0);
            const reserved = 90; 
            const available = parentHeight - reserved;
            
            const cH = Math.floor((available - 6) / 5);
            if (cH <= 0) return;

            const totalH = (5 * cH) + 6;
            const dpr = window.devicePixelRatio || 1;

            setCanvasHeight(cH);
            setSnappedHeight(totalH);

            [
                { cRef: canvasRefI, chartRef: chartRefI },
                { cRef: canvasRefII, chartRef: chartRefII },
                { cRef: canvasRefIII, chartRef: chartRefIII },
                { cRef: canvasRefavF, chartRef: chartRefavF },
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
        const signalColor = '#0f172a'; 

        const createAndSetChart = (ref: React.RefObject<HTMLCanvasElement | null>, chartRef: React.MutableRefObject<Chart | null>) => {
            if (ref.current) {
                const ctx = ref.current.getContext('2d');
                if (ctx) {
                    chartRef.current = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: Array.from({ length: totalPoints }, (_, i) => i),
                            datasets: [{ data: [...initialData], borderColor: signalColor }]
                        },
                        options: createChartConfig(totalPoints)
                    });
                }
            }
        };

        createAndSetChart(canvasRefI, chartRefI);
        createAndSetChart(canvasRefII, chartRefII);
        createAndSetChart(canvasRefIII, chartRefIII);
        createAndSetChart(canvasRefavF, chartRefavF);
        createAndSetChart(canvasRefV1, chartRefV1);

        const initialBuffer = useStore.getState().ecgBuffer;
        if (initialBuffer.length > 0) {
            const pointsToRestore = initialBuffer.slice(-totalPoints);

            const restore = (chartRef: React.MutableRefObject<Chart | null>, key: 'leadI' | 'leadII' | 'leadIII' | 'avF' | 'v1') => {
                if (chartRef.current) {
                    const ds = chartRef.current.data.datasets[0].data;
                    pointsToRestore.forEach((pt, i) => ds[i] = pt[key]);
                    adjustScaleSingle(chartRef.current);
                    chartRef.current.update('none');
                }
            };

            restore(chartRefI, 'leadI');
            restore(chartRefII, 'leadII');
            restore(chartRefIII, 'leadIII');
            restore(chartRefavF, 'avF');
            restore(chartRefV1, 'v1');

            cursorRef.current = pointsToRestore.length % totalPoints;
        }

        const processBuffer = () => {
            const now = performance.now();
            const deltaTime = (now - lastFrameTimeRef.current) / 1000;
            lastFrameTimeRef.current = now;

            if (bufferRef.current.length === 0) return;

            if (bufferRef.current.length > (currentSpsRef.current * 2)) {
                bufferRef.current = [];
                return;
            }

            const dynamicEraseGap = Math.round((currentSpsRef.current / 100) * CONFIG.ERASE_GAP);
            
            let targetPoints = currentSpsRef.current * deltaTime;
            
            if (bufferRef.current.length > currentSpsRef.current * 0.2) {
                targetPoints *= 1.2;
            }

            const processLimit = Math.max(1, Math.ceil(targetPoints));
            const pointsToProcess = bufferRef.current.splice(0, processLimit);

            const charts = [
                { chart: chartRefI.current, key: 'leadI' as const },
                { chart: chartRefII.current, key: 'leadII' as const },
                { chart: chartRefIII.current, key: 'leadIII' as const },
                { chart: chartRefavF.current, key: 'avF' as const },
                { chart: chartRefV1.current, key: 'v1' as const }
            ];

            let lastCursor = cursorRef.current;
            const totalPoints = currentSpsRef.current * 5;

            for (let i = 0; i < pointsToProcess.length; i++) {
                const data = pointsToProcess[i];

                charts.forEach(({ chart, key }) => {
                    if (chart) {
                        const ds = chart.data.datasets[0].data;
                        ds[lastCursor] = data[key] ?? 0;
                        for (let j = 1; j <= dynamicEraseGap; j++) ds[(lastCursor + j) % totalPoints] = null;
                    }
                });

                lastCursor = (lastCursor + 1) % totalPoints;
            }

            cursorRef.current = lastCursor;

            if (lastCursor % 50 === 0) {
                charts.forEach(({ chart }) => {
                    if (chart) adjustScaleSingle(chart);
                });
            }

            charts.forEach(({ chart }) => {
                if (chart) chart.update('none');
            });
        };

        let animationFrameId: number;
        const renderLoop = () => {
            processBuffer();
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        lastFrameTimeRef.current = performance.now();
        animationFrameId = requestAnimationFrame(renderLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
            [chartRefI, chartRefII, chartRefIII, chartRefavF, chartRefV1].forEach(ref => ref.current?.destroy());
        };
    }, []); 

    useEffect(() => {
        if (ecgBuffer.length === 0) {
            cursorRef.current = 0;
            bufferRef.current = [];
            [chartRefI, chartRefII, chartRefIII, chartRefavF, chartRefV1].forEach(ref => {
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
        const handleData = (data: { leadI: number, leadII: number, leadIII: number, avF: number, v1: number, counter?: number }) => {
            bufferRef.current.push(data);
        };
        const handleBatch = (batch: { samples: { leadI: number, leadII: number, leadIII: number, avF: number, v1: number }[], counter?: number, sampling_rate?: number }) => {
            bufferRef.current.push(...batch.samples);

            if (batch.sampling_rate && batch.sampling_rate > 0) {
                const newSps = Math.round(batch.sampling_rate);
                currentSpsRef.current = (currentSpsRef.current * 0.95) + (newSps * 0.05);
            }
        };
        const handleDisconnect = () => {
            bufferRef.current = [];
        };

        globalEventBus.on(EVENTS.CHART.ECG_DATA, handleData);
        globalEventBus.on(EVENTS.CHART.ECG_BATCH, handleBatch);
        globalEventBus.on(EVENTS.DEVICE.DISCONNECTED, handleDisconnect);

        return () => {
            globalEventBus.off(EVENTS.CHART.ECG_DATA, handleData);
            globalEventBus.off(EVENTS.CHART.ECG_BATCH, handleBatch);
            globalEventBus.off(EVENTS.DEVICE.DISCONNECTED, handleDisconnect);
        };
    }, []);

    return (
        <div className="flex flex-col w-full h-full bg-white relative transition-all duration-500">
            <div className="h-[45px] flex items-center justify-between px-6 border-b border-slate-100 bg-white relative z-20 shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
                        <Activity size={14} className="text-rose-500 animate-pulse" />
                        <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-tight">Monitoring</h3>
                    </div>

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
                    ECG Digital Stream
                </div>
            </div>

            <div 
                ref={containerRef}
                className="w-full flex-1 flex flex-col bg-white border-y border-slate-950 divide-y divide-slate-950 overflow-hidden shrink-0"
                style={{ height: snappedHeight ? `${snappedHeight}px` : 'auto' }}
            >
                {[
                    { id: 'leadI', label: 'Lead I', ref: canvasRefI },
                    { id: 'leadII', label: 'Lead II', ref: canvasRefII },
                    { id: 'leadIII', label: 'Lead III', ref: canvasRefIII },
                    { id: 'avF', label: 'avF', ref: canvasRefavF },
                    { id: 'v1', label: 'V1', ref: canvasRefV1 }
                ].map((lead) => (
                    <div 
                        key={lead.id} 
                        className="relative w-full overflow-hidden bg-white flex-1"
                        style={{ 
                            ...medicalGridStyle,
                            height: canvasHeight ? `${canvasHeight}px` : 'auto'
                        }}
                    >
                        <div className="absolute top-2 left-4 z-10 pointer-events-none">
                            <div className="text-[8px] font-mono font-bold text-rose-600/40 uppercase tracking-widest">Speed: 25mm/s | Gain: 10mm/mV</div>
                        </div>
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