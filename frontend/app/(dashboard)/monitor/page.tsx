'use client';

import React, { useState } from 'react';
import ECGChart from '@/components/monitor/ECGChart';
import PatientSection from '@/components/monitor/PatientSection';
import StatsPanel from '@/components/monitor/StatsPanel';
import AIAnalysisCard from '@/components/monitor/AIAnalysisCard';
import LiveTable from '@/components/monitor/LiveTable';
import PatientModal from '@/components/shared/PatientModal';

export default function MonitorPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [visibleLeads, setVisibleLeads] = useState({
        leadI: true,
        leadII: true,
        v1: true
    });

    return (
        <div className="space-y-4 max-w-[1600px] mx-auto pb-20">
            {/* Top Row: Info & Stats */}
            <div className="grid grid-cols-12 gap-4 h-32 lg:h-28">
                {/* Patient / Session Info (5 cols) */}
                <div className="col-span-12 lg:col-span-5">
                    <PatientSection onNewSession={() => setIsModalOpen(true)} />
                </div>

                {/* Stats: HR & Duration (4 cols) */}
                <div className="col-span-12 lg:col-span-4">
                    <StatsPanel />
                </div>

                {/* AI Insight (3 cols) */}
                <div className="col-span-12 lg:col-span-3">
                    <AIAnalysisCard />
                </div>
            </div>

            {/* Middle Row: ECG Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                <ECGChart 
                    visibleLeads={visibleLeads} 
                    onToggleLead={(key) => setVisibleLeads(prev => ({ ...prev, [key]: !prev[key] }))}
                />
            </div>

            {/* Bottom Row: Analysis Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <LiveTable />
            </div>

            {/* Modals */}
            <PatientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
