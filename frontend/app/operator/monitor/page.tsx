'use client';

import OperatorMonitorDashboard from '@/components/operator/monitor/OperatorMonitorDashboard';

export default function OperatorMonitorPage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50">
            <div className="flex-1 min-h-0 border-t border-slate-200">
                <OperatorMonitorDashboard />
            </div>
        </div>
    );
}
