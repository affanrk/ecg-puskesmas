'use client';

import PatientMonitorDashboard from '@/components/patient/monitor/PatientMonitorDashboard';

export default function PatientMonitorPage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <div className="flex-1 min-h-0 border-t border-slate-100">
                <PatientMonitorDashboard />
            </div>
        </div>
    );
}
