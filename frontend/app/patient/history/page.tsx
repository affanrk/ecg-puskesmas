'use client';

import CalendarDrillDown from '@/components/patient/history/CalendarDrillDown';

export default function HistoryPage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <div className="flex-1 min-h-0 border-t border-slate-100">
                <CalendarDrillDown />
            </div>
        </div>
    );
}
