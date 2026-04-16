'use client';

import React, { memo } from 'react';
import OperatorECGChart from './parts/OperatorECGChart';
import StatsPanel from '@/components/shared/monitor/parts/StatsPanel';
import AIAnalysisCard from '@/components/shared/monitor/parts/AIAnalysisCard';

const MemoizedOperatorECGChart = memo(OperatorECGChart);
const MemoizedStatsPanel = memo(StatsPanel);
const MemoizedAIAnalysisCard = memo(AIAnalysisCard);

export default function OperatorMonitorDashboard() {
    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <div className="flex-1 grid grid-cols-12 gap-px bg-slate-200 min-h-0">
                <div className="col-span-12 lg:col-span-10 h-full min-h-0 bg-white">
                    <MemoizedOperatorECGChart />
                </div>

                <div className="col-span-12 lg:col-span-2 flex flex-col gap-px h-full min-h-0 bg-slate-200">
                    <div className="flex-[3] min-h-0 bg-white">
                        <MemoizedStatsPanel className="grid-cols-1 grid-rows-2 h-full" variant="minimal" />
                    </div>
                    <div className="flex-[2] min-h-0 bg-white">
                        <MemoizedAIAnalysisCard />
                    </div>
                </div>
            </div>
        </div>
    );
}
