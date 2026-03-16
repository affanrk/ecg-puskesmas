'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Chart, ChartOptions } from 'chart.js';
import '@/config/chartSetup';
import { globalEventBus } from '@/services/events';
import { CONFIG, EVENTS, LEAD_CONFIGS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import { EcgSample5Leads, EcgSample12Leads } from '@/types/models';
import clsx from 'clsx';
import { LeadChart } from './LeadChart';

type EcgSample = EcgSample5Leads | EcgSample12Leads;

interface ECGMonitorProps {
    selectedLeadMode: 5 | 12;
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
        devicePixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
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
            point: { radius: 0, hitRadius: 0, hoverRadius: 0 },
            line: {
                borderWidth: 1.5,
                tension: 0.2,
                borderColor: '#0f172a',
                stepped: false
            }
        }
    };
};

const adjustScaleSingle = (chart: Chart, localMin: number, localMax: number) => {
    const limit = Math.max(Math.abs(localMin), Math.abs(localMax), 0.15) * 1.5;
    const roundedLimit = Math.ceil(limit * 100) / 100;

    const currentScales = chart.options.scales?.y;
    if (currentScales && (currentScales.min !== -roundedLimit || currentScales.max !== roundedLimit)) {
        currentScales.min = -roundedLimit;
        currentScales.max = roundedLimit;
    }
};
export const ECGMonitor = React.memo(function ECGMonitor({ selectedLeadMode }: ECGMonitorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [snappedHeight, setSnappedHeight] = useState<number | null>(null);
    const [canvasHeight, setCanvasHeight] = useState<number | null>(null);
    
    const cursorRef = useRef(0);
    const bufferRef = useRef<EcgSample[]>([]);
    const currentSpsRef = useRef(100);
    const accumulatedPointsRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const isMounted = useRef(false);

    const activeLeads = useMemo(() => {
        return LEAD_CONFIGS[selectedLeadMode as 5 | 12] || LEAD_CONFIGS[12];
    }, [selectedLeadMode]);

    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const chartRefs = useRef<(Chart | null)[]>([]);

    const currentDeviceId = useStore(state => state.currentDeviceId);
    const isConnected = useStore(state => state.isConnected);
    const isRecording = useStore(state => state.isRecording);

    useEffect(() => {
        isMounted.current = true;
        const syncPixels = () => {
            if (!containerRef.current || !isMounted.current) return;
            const parentHeight = Math.floor(containerRef.current.parentElement?.clientHeight || 0);
            const reserved = 90;
            const available = parentHeight - reserved;
            
            const rows = selectedLeadMode === 12 ? 6 : 5;
            const cH = Math.floor((available - (rows + 1)) / rows);
            
            if (cH <= 0) return;
            const totalH = (rows * cH) + (rows + 1);
            const dpr = window.devicePixelRatio || 1;
            
            setCanvasHeight(cH);
            setSnappedHeight(totalH);
            
            activeLeads.forEach((_, i) => {
                const canvas = canvasRefs.current[i];
                const chart = chartRefs.current[i];
                if (canvas && isMounted.current) {
                    const rect = canvas.getBoundingClientRect();
                    canvas.width = Math.round(rect.width * dpr);
                    canvas.height = Math.round(cH * dpr);
                    if (chart) {
                        try {
                            chart.resize();
                            chart.update('none');
                        } catch {}
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
    }, [activeLeads, selectedLeadMode]);

    useEffect(() => {
        const totalPoints = CONFIG.MAX_DATA_POINTS;
        const initialData = new Array(totalPoints).fill(null);
        const signalColor = '#0f172a';
        
        chartRefs.current.forEach(chart => chart?.destroy());
        chartRefs.current = new Array(activeLeads.length).fill(null);
        canvasRefs.current = new Array(activeLeads.length).fill(null);

        const initTimeout = setTimeout(() => {
            activeLeads.forEach((_, i) => {
                const canvas = canvasRefs.current[i];
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        chartRefs.current[i] = new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: Array.from({ length: totalPoints }, (_, idx) => idx),
                                datasets: [{ data: [...initialData], borderColor: signalColor }]
                            },
                            options: createChartConfig(totalPoints)
                        });
                    }
                }
            });

            const storeState = useStore.getState();
            const initialBuffer = selectedLeadMode === 12 ? storeState.ecgBuffer12Leads : storeState.ecgBuffer5Leads;
            if (initialBuffer.length > 0) {
                const pointsToRestore = initialBuffer.slice(-totalPoints);
                activeLeads.forEach((lead, i) => {
                    const chart = chartRefs.current[i];
                    if (chart) {
                        const ds = chart.data.datasets[0].data;
                        let lMin = Infinity;
                        let lMax = -Infinity;
                        pointsToRestore.forEach((pt, j) => {
                            const val = pt[lead.key as keyof EcgSample] as number;
                            ds[j] = val;
                            if (val < lMin) lMin = val;
                            if (val > lMax) lMax = val;
                        });
                        if (lMin !== Infinity) {
                            adjustScaleSingle(chart, lMin, lMax);
                        }
                        chart.update('none');
                    }
                });
                cursorRef.current = pointsToRestore.length % totalPoints;
            }
 else {
                cursorRef.current = 0;
            }
        }, 0);

        const processBuffer = () => {
            const now = performance.now();
            const deltaTime = (now - lastFrameTimeRef.current) / 1000;
            lastFrameTimeRef.current = now;

            if (bufferRef.current.length === 0) {
                accumulatedPointsRef.current = 0;
                return;
            }

            if (bufferRef.current.length > (currentSpsRef.current * 5)) {
                bufferRef.current = bufferRef.current.slice(-(currentSpsRef.current * 1));
                accumulatedPointsRef.current = 0;
            }

            const dynamicEraseGap = Math.round((currentSpsRef.current / 100) * CONFIG.ERASE_GAP);
            const bufferSize = bufferRef.current.length;
            const targetBuffer = currentSpsRef.current * 0.3;
            let speedMultiplier = 1.0;

            if (bufferSize > targetBuffer * 3) speedMultiplier = 1.5;
            else if (bufferSize > targetBuffer * 2) speedMultiplier = 1.2;
            else if (bufferSize > targetBuffer * 1.5) speedMultiplier = 1.1;
            else if (bufferSize < targetBuffer * 0.5) speedMultiplier = 0.9;

            accumulatedPointsRef.current += (currentSpsRef.current * deltaTime) * speedMultiplier;

            const processLimit = Math.floor(accumulatedPointsRef.current);
            if (processLimit <= 0) return;

            const pointsToProcess = bufferRef.current.splice(0, Math.min(processLimit, bufferRef.current.length));
            accumulatedPointsRef.current -= pointsToProcess.length;

            if (pointsToProcess.length === 0) return;

            let lastCursor = cursorRef.current;
            const totalPointsLimit = CONFIG.MAX_DATA_POINTS;
            
            const localMins = new Array(activeLeads.length).fill(Infinity);
            const localMaxs = new Array(activeLeads.length).fill(-Infinity);

            for (let i = 0; i < pointsToProcess.length; i++) {
                const data = pointsToProcess[i];
                activeLeads.forEach((lead, idx) => {
                    const chart = chartRefs.current[idx];
                    if (chart) {
                        const val = (data[lead.key as keyof EcgSample] as number) ?? 0;
                        const ds = chart.data.datasets[0].data;
                        ds[lastCursor] = val;

                        if (val < localMins[idx]) localMins[idx] = val;
                        if (val > localMaxs[idx]) localMaxs[idx] = val;

                        for (let j = 1; j <= dynamicEraseGap; j++) {
                            ds[(lastCursor + j) % totalPointsLimit] = null;
                        }
                    }
                });
                lastCursor = (lastCursor + 1) % totalPointsLimit;
            }

            cursorRef.current = lastCursor;

            if (lastCursor % 50 === 0) {
                chartRefs.current.forEach((chart, idx) => {
                    if (chart && localMins[idx] !== Infinity) {
                        adjustScaleSingle(chart, localMins[idx], localMaxs[idx]);
                    }
                });
            }

            chartRefs.current.forEach(chart => {
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
            clearTimeout(initTimeout);
            cancelAnimationFrame(animationFrameId);
            chartRefs.current.forEach(chart => chart?.destroy());
        };
    }, [activeLeads, selectedLeadMode]);

    useEffect(() => {
        const storeState = useStore.getState();
        const storeBuffer = selectedLeadMode === 12 ? storeState.ecgBuffer12Leads : storeState.ecgBuffer5Leads;
        if (!currentDeviceId || !isConnected || storeBuffer.length === 0) {
            cursorRef.current = 0;
            bufferRef.current = [];
            chartRefs.current.forEach(chart => {
                if (chart) {
                    chart.data.datasets[0].data.fill(null);
                    if (chart.options.scales?.y) {
                        chart.options.scales.y.min = -2;
                        chart.options.scales.y.max = 2;
                    }
                    chart.update('none');
                }
            });
        }
    }, [currentDeviceId, isConnected, isRecording, selectedLeadMode]);

    useEffect(() => {
        const handleBatch5 = (batch: { samples: EcgSample5Leads[], counter?: number, sampling_rate?: number }) => {
            bufferRef.current.push(...batch.samples);
            if (batch.sampling_rate && batch.sampling_rate > 0) {
                const newSps = Math.round(batch.sampling_rate);
                currentSpsRef.current = (currentSpsRef.current * 0.95) + (newSps * 0.05);
            }
        };

        const handleBatch12 = (batch: { samples: EcgSample12Leads[], counter?: number, sampling_rate?: number }) => {
            bufferRef.current.push(...batch.samples);
            if (batch.sampling_rate && batch.sampling_rate > 0) {
                const newSps = Math.round(batch.sampling_rate);
                currentSpsRef.current = (currentSpsRef.current * 0.95) + (newSps * 0.05);
            }
        };

        const handleDisconnect = () => {
            bufferRef.current = [];
        };
        
        if (selectedLeadMode === 12) {
            globalEventBus.on(EVENTS.CHART.ECG_BATCH_12, handleBatch12);
        } else {
            globalEventBus.on(EVENTS.CHART.ECG_BATCH_5, handleBatch5);
        }
        
        globalEventBus.on(EVENTS.DEVICE.DISCONNECTED, handleDisconnect);
        globalEventBus.on(EVENTS.WS.DISCONNECTED, handleDisconnect);
        return () => {
            if (selectedLeadMode === 12) {
                globalEventBus.off(EVENTS.CHART.ECG_BATCH_12, handleBatch12);
            } else {
                globalEventBus.off(EVENTS.CHART.ECG_BATCH_5, handleBatch5);
            }
            globalEventBus.off(EVENTS.DEVICE.DISCONNECTED, handleDisconnect);
            globalEventBus.off(EVENTS.WS.DISCONNECTED, handleDisconnect);
        };
    }, [selectedLeadMode]);

    return (
        <div
            ref={containerRef}
            className={clsx(
                "w-full flex-1 bg-white border-y border-slate-950 overflow-hidden shrink-0",
                selectedLeadMode === 12 ? "grid grid-cols-2 grid-rows-6 gap-px bg-slate-950" : "flex flex-col divide-y divide-slate-950"
            )}
            style={{ height: snappedHeight ? `${snappedHeight}px` : 'auto' }}
        >
            {activeLeads.map((lead, i) => (
                <LeadChart
                    key={`${selectedLeadMode}-${lead.id}`}
                    ref={el => { canvasRefs.current[i] = el; }}
                    label={lead.label}
                    canvasHeight={canvasHeight}
                    gridStyle={medicalGridStyle}
                />
            ))}
        </div>
    );
});
