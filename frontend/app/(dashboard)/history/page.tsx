'use client';

import CalendarDrillDown from '@/components/history/CalendarDrillDown';
import { FileText } from 'lucide-react';

export default function HistoryPage() {
    return (
        <div className="flex flex-col h-full w-full gap-2 sm:gap-3 overflow-hidden pb-1">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-md flex items-center justify-center shadow-lg shadow-teal-500/10 border border-slate-100">
                        <FileText size={18} className="text-teal-500 sm:hidden" strokeWidth={2.5} />
                        <FileText size={20} className="text-teal-500 hidden sm:block" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none">Medical Records</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1 h-1 rounded-full bg-teal-500"></span>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Patient History Archive</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Calendar View */}
            <div className="flex-1 min-h-0">
                <CalendarDrillDown />
            </div>
        </div>
    );
}