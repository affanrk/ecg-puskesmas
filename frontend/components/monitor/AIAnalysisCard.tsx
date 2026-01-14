'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import clsx from 'clsx';

export default function AIAnalysisCard() {
    const liveData = useStore((state) => state.liveData);
    const [prediction, setPrediction] = useState<{
        classification: string;
        confidence: number;
    } | null>(null);

    useEffect(() => {
        if (liveData && liveData.length > 0) {
            const latest = liveData[0];
            const result = (latest.classification === 'Recording...' && liveData[1]) ? liveData[1] : latest;

            if (result && result.classification !== 'Recording...') {
                setPrediction({
                    classification: result.classification,
                    confidence: result.confidence || 0
                });
            } else if (latest.classification === 'Recording...') {
                // If we only have "Recording...", we can keep "Waiting..." or show "Recording..."
                // Based on previous logic, we want to reset if no valid prediction.
                // But usually we want to show the last one until it's really cleared.
                if (liveData.length === 1) {
                    setPrediction(null);
                }
            }
        } else {
            setPrediction(null);
        }
    }, [liveData]);

    // Determine state for styling
    const isAbnormal = prediction && ['Abnormal', 'Aritmia', 'Berpotensi'].some(x => prediction.classification.includes(x));
    const confidencePct = prediction ? Math.round(prediction.confidence * 100) : 0;

    return (
        <div 
            className={clsx(
                "h-full rounded-xl shadow-lg p-4 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-500",
                isAbnormal 
                    ? "bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/20" 
                    : "bg-gradient-to-br from-brand-500 to-brand-600 shadow-brand-500/20"
            )}
        >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[10px] font-bold text-brand-100 uppercase tracking-wider">AI Insight</h3>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]"></span>
                </div>
                <div className="text-xl font-bold leading-tight tracking-tight truncate uppercase">
                    {prediction ? prediction.classification : "Waiting..."}
                </div>
            </div>

            <div className="relative z-10 mt-2">
                <div className="flex justify-between items-end mb-1">
                    <p className="text-brand-50 text-[10px] font-medium opacity-90">
                        Conf: {confidencePct}%
                    </p>
                </div>
                <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden backdrop-blur-sm shadow-inner">
                    <div 
                        className="bg-white h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_white]" 
                        style={{ width: `${confidencePct}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
