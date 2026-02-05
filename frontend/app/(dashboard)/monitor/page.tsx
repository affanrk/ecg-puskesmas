'use client';

import ECGChart from '@/components/monitor/ECGChart';
import PatientSection from '@/components/monitor/PatientSection';
import StatsPanel from '@/components/monitor/StatsPanel';
import AIAnalysisCard from '@/components/monitor/AIAnalysisCard';
import { useStore } from '@/store/useStore';

export default function MonitorPage() {

    // 1. State

    const { visibleLeads, setVisibleLeads } = useStore();



    // 2. Render

            return (

                <div className="flex flex-col gap-4 h-full">

                    {/* Top Row: Info & Stats - Compact Height */}

                    <div className="grid grid-cols-12 gap-4 shrink-0 lg:h-[120px]">

                        {/* Patient / Session Info (4 cols) */}

                        <div className="col-span-12 lg:col-span-4 h-full">

                            <PatientSection />

                        </div>

        

                        {/* Stats: HR & Duration (5 cols) */}

                        <div className="col-span-12 lg:col-span-5 h-full">

                            <StatsPanel />

                        </div>

        

                        {/* AI Insight (3 cols) */}

                        <div className="col-span-12 lg:col-span-3 h-full">

                            <AIAnalysisCard />

                        </div>

                    </div>

        

                    {/* Middle Row: ECG Chart - Expands to fill remaining space */}

                    <div className="flex-1 min-h-[500px]">

                        <ECGChart 

                            visibleLeads={visibleLeads} 

                            onToggleLead={(key) => setVisibleLeads({ [key]: !visibleLeads[key] })}

                        />

                    </div>

                </div>

            );

        

    

}
