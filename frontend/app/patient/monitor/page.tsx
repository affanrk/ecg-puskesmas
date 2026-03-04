'use client';

import ECGChart from '@/components/patient/monitor/ECGChart';
import StatsPanel from '@/components/patient/monitor/StatsPanel';
import AIAnalysisCard from '@/components/patient/monitor/AIAnalysisCard';
import { useStore } from '@/store/useStore';

export default function MonitorPage() {
    const { visibleLeads, setVisibleLeads } = useStore();

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <div className="flex-1 min-h-0 border-t border-slate-100">
                <div className="flex flex-col h-full overflow-hidden bg-white">
                    <div className="flex-1 grid grid-cols-12 gap-px bg-slate-200 min-h-0">
                        <div className="col-span-12 lg:col-span-10 h-full min-h-0 bg-white">
                            <ECGChart 
                                visibleLeads={visibleLeads} 
                                onToggleLead={(key) => setVisibleLeads({ [key]: !visibleLeads[key] })}
                            />
                        </div>
                        <div className="col-span-12 lg:col-span-2 flex flex-col gap-px h-full min-h-0 bg-slate-200">
                            <div className="flex-[3] min-h-0 bg-white">
                                <StatsPanel className="grid-cols-1 grid-rows-2 h-full" variant="minimal" />
                            </div>
                            <div className="flex-[2] min-h-0 bg-white">
                                <AIAnalysisCard />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
