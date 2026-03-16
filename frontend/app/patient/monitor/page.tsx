'use client';

import MonitorDashboard from '@/components/patient/monitor/MonitorDashboard';

export default function MonitorPage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <div className="flex-1 min-h-0 border-t border-slate-100">
                <MonitorDashboard />
            </div>
        </div>
    );
}
