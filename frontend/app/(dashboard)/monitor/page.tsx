'use client';

import { useState } from 'react';
import ECGChart from '@/components/monitor/ECGChart';
import PatientSection from '@/components/monitor/PatientSection';
import StatsPanel from '@/components/monitor/StatsPanel';
import AIAnalysisCard from '@/components/monitor/AIAnalysisCard';
import LiveTable from '@/components/monitor/LiveTable';
import { useStore } from '@/store/useStore';

export default function MonitorPage() {
    // 1. State
    const { visibleLeads, setVisibleLeads } = useStore();

    // 2. Render
    return (
        <div className="flex flex-col flex-1 gap-6 max-w-[1800px] mx-auto pb-6">
            {/* Top Row: Info & Stats - Auto Height to prevent overlap */}
            <div className="grid grid-cols-12 gap-6 min-h-[8rem] shrink-0">
                {/* Patient / Session Info (5 cols) */}
                <div className="col-span-12 lg:col-span-5 h-full">
                    <PatientSection />
                </div>

                {/* Stats: HR & Duration (4 cols) */}
                <div className="col-span-12 lg:col-span-4 h-full">
                    <StatsPanel />
                </div>

                {/* AI Insight (3 cols) */}
                <div className="col-span-12 lg:col-span-3 h-full">
                    <AIAnalysisCard />
                </div>
            </div>

            {/* Middle Row: ECG Chart - Fixed Height */}
            <div className="shrink-0">
                <ECGChart 
                    visibleLeads={visibleLeads} 
                    onToggleLead={(key) => setVisibleLeads({ [key]: !visibleLeads[key] })}
                />
            </div>

            {/* Bottom Row: Analysis Table - Dynamic Height */}
            <div className="w-full">
                <LiveTable />
            </div>
        </div>
    );
}