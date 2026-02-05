'use client';

import ECGChart from '@/components/monitor/ECGChart';
import StatsPanel from '@/components/monitor/StatsPanel';
import AIAnalysisCard from '@/components/monitor/AIAnalysisCard';
import { useStore } from '@/store/useStore';

export default function MonitorPage() {

    // 1. State

    const { visibleLeads, setVisibleLeads } = useStore();



    // 2. Render

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white rounded-md shadow-sm border border-slate-100">
            {/* Main Area: Waveforms and Stats Sidebar - Professional Integrated Design */}
            <div className="flex-1 grid grid-cols-12 gap-px bg-slate-200 min-h-0">
                {/* Left Column: ECG Waveforms (10/12 cols) - High Visibility Diagnostic Area */}
                <div className="col-span-12 lg:col-span-10 h-full min-h-0 bg-white">
                    <ECGChart 
                        visibleLeads={visibleLeads} 
                        onToggleLead={(key) => setVisibleLeads({ [key]: !visibleLeads[key] })}
                    />
                </div>

                {/* Right Column: Sidebar with Stats & AI (2/12 cols) - Balanced Vital Panel */}
                <div className="col-span-12 lg:col-span-2 flex flex-col gap-px h-full min-h-0 bg-slate-200">
                    {/* Vital Information: Heart Rate & Duration */}
                    <div className="flex-[3] min-h-0 bg-white">
                        <StatsPanel className="grid-cols-1 grid-rows-2 h-full" variant="minimal" />
                    </div>
                    {/* Intelligence: AI Classification Result */}
                    <div className="flex-[2] min-h-0 bg-white">
                        <AIAnalysisCard />
                    </div>
                </div>
            </div>
        </div>
    );
}
