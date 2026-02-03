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
import { Settings2, Activity, Square, XCircle } from 'lucide-react';
import DeviceDropdown from './DeviceDropdown';

interface ECGChartProps {
    onToggleLead?: (key: 'leadI' | 'leadII' | 'v1') => void;
    visibleLeads?: Record<string, boolean>;
}

const medicalGridStyle = {
    backgroundColor: '#fffcfc',
    backgroundImage: `
        linear-gradient(rgba(220, 38, 38, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(220, 38, 38, 0.1) 1px, transparent 1px),
        linear-gradient(rgba(220, 38, 38, 0.25) 1px, transparent 1px),
        linear-gradient(90deg, rgba(220, 38, 38, 0.25) 1px, transparent 1px)
    `,
    backgroundSize: '10px 10px, 10px 10px, 50px 50px, 50px 50px',
    backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px'
};

const createChartConfig = (totalPoints: number, minY: number = -2, maxY: number = 2): ChartOptions => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
            padding: {
                left: 0,
                right: 0,
                top: 10,
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
                display: false,
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
                    color: '#475569',
                    font: {
                        size: 9,
                        family: 'var(--font-inter)',
                        weight: 700
                    },
                    padding: 8,
                    stepSize: 0.5,
                    callback: (value) => `${Number(value).toFixed(1)}mV`
                },
                min: undefined,
                max: undefined,
                suggestedMin: minY,
                suggestedMax: maxY
            }
        },
        elements: {
            point: { radius: 0 },
            line: {
                borderWidth: 2,
                tension: 0.35,
                borderColor: '#000000'
            }
        }
    };
};

const adjustScaleSingle = (chart: Chart) => {
    const ds = chart.data.datasets[0];
    let minVal = Infinity;
    let maxVal = -Infinity;
    let hasData = false;

    for (let j = 0; j < ds.data.length; j++) {
        const v = ds.data[j] as number;
        if (v !== null && v !== undefined) {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
            hasData = true;
        }
    }

    if (!hasData) {
        minVal = -2;
        maxVal = 2;
    } else {
        const range = maxVal - minVal;
        const padding = range * 0.1 || 0.5;
        minVal -= padding;
        maxVal += padding;
    }

    if (chart.options.scales?.y) {
        chart.options.scales.y.min = minVal;
        chart.options.scales.y.max = maxVal;
    }
};

export default function ECGChart({ }: ECGChartProps) {
    const canvasRefI = useRef<HTMLCanvasElement>(null);
    const canvasRefII = useRef<HTMLCanvasElement>(null);
    const canvasRefV1 = useRef<HTMLCanvasElement>(null);

    const chartRefI = useRef<Chart | null>(null);
    const chartRefII = useRef<Chart | null>(null);
    const chartRefV1 = useRef<Chart | null>(null);

    const cursorRef = useRef(0);
    const bufferRef = useRef<{ leadI: number | null, leadII: number | null, v1: number | null }[]>([]);

    const { currentDeviceId, isRecording, ecgBuffer, isSessionActive, resetSession } = useStore();
    const { toggleRecording } = useSessionManager();
    const [showConfirmReset, setShowConfirmReset] = useState(false);

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

        if (canvasRefI.current) {
            const ctxI = canvasRefI.current.getContext('2d');
            if (ctxI) {
                chartRefI.current = new Chart(ctxI, {
                    type: 'line',
                    data: {
                        labels: Array.from({ length: totalPoints }, (_, i) => i),
                        datasets: [{ data: [...initialData], borderColor: '#000000' }]
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
                        datasets: [{ data: [...initialData], borderColor: '#000000' }]
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
                        datasets: [{ data: [...initialData], borderColor: '#000000' }]
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
        <div className="flex flex-col w-full bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500">
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white relative z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-50 rounded-md text-rose-500 flex items-center justify-center shadow-sm border border-rose-100/50">
                        <Activity size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Live ECG Monitor</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Signal Acquisition</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <DeviceDropdown />

                    {(currentDeviceId || isSessionActive) && (
                        <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                            {!isSessionActive ? (
                                <button
                                    onClick={toggleRecording}
                                    disabled={!currentDeviceId}
                                    className={clsx(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-md text-xs font-bold shadow-lg transition-all active:scale-95 justify-center uppercase tracking-wider text-white",
                                        !currentDeviceId ? "bg-slate-300 shadow-none cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                                    )}
                                >
                                    <Activity size={16} /> Start Recording
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={toggleRecording}
                                        disabled={!isRecording && !currentDeviceId}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold shadow-lg transition-all active:scale-95 justify-center uppercase tracking-wider text-white",
                                            isRecording 
                                                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20" 
                                                : (!currentDeviceId 
                                                    ? "bg-slate-300 shadow-none cursor-not-allowed" 
                                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20")
                                        )}
                                    >
                                        {isRecording ? <><Square size={14} fill="currentColor" /> Stop</> : <><Activity size={14} /> Resume</>}
                                    </button>

                                    <button
                                        onClick={handleReset}
                                        disabled={isRecording}
                                        className={clsx(
                                            "px-3 py-2.5 rounded-md text-xs font-bold border transition-all uppercase tracking-wider flex items-center justify-center",
                                            isRecording
                                                ? "bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100"
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm active:scale-95"
                                        )}
                                        title="End Session"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full flex flex-col bg-slate-50 gap-4 py-4 border-b border-slate-100 min-h-0 overflow-y-auto">
                <div className="h-[200px] shrink-0 relative w-full bg-white border-y border-slate-200 shadow-sm overflow-hidden" style={medicalGridStyle}>
                    <div className="absolute top-3 left-3 z-10 opacity-60 pointer-events-none">
                        <div className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-widest">
                            Speed: 25mm/s | Gain: 10mm/mV
                        </div>
                    </div>
                    <div className="absolute top-2 right-2 z-10 bg-white/90 px-2 py-0.5 rounded-sm border border-slate-100 backdrop-blur-sm shadow-sm">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Lead I</span>
                    </div>
                    <canvas ref={canvasRefI} className="w-full h-full relative z-0 block"></canvas>
                </div>

                <div className="h-[200px] shrink-0 relative w-full bg-white border-y border-slate-200 shadow-sm overflow-hidden" style={medicalGridStyle}>
                    <div className="absolute top-3 left-3 z-10 opacity-60 pointer-events-none">
                        <div className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-widest">
                            Speed: 25mm/s | Gain: 10mm/mV
                        </div>
                    </div>
                    <div className="absolute top-2 right-2 z-10 bg-white/90 px-2 py-0.5 rounded-sm border border-slate-100 backdrop-blur-sm shadow-sm">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Lead II</span>
                    </div>
                    <canvas ref={canvasRefII} className="w-full h-full relative z-0 block"></canvas>
                </div>

                <div className="h-[200px] shrink-0 relative w-full bg-white border-y border-slate-200 shadow-sm overflow-hidden" style={medicalGridStyle}>
                    <div className="absolute top-3 left-3 z-10 opacity-60 pointer-events-none">
                        <div className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-widest">
                            Speed: 25mm/s | Gain: 10mm/mV
                        </div>
                    </div>
                    <div className="absolute top-2 right-2 z-10 bg-white/90 px-2 py-0.5 rounded-sm border border-slate-100 backdrop-blur-sm shadow-sm">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">V1</span>
                    </div>
                    <canvas ref={canvasRefV1} className="w-full h-full relative z-0 block"></canvas>
                </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 flex items-center px-6 py-3 justify-between shrink-0 relative z-20">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-black"></span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Signal: High Precision</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-px h-4 bg-slate-200" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnostic Grade visualization</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    <Settings2 size={10} />
                    Auto-scaling Enabled
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