'use client';

import CalendarDrillDown from '@/components/history/CalendarDrillDown';
import { FileText } from 'lucide-react';

export default function HistoryPage() {
    return (
        <div className="flex flex-col h-full w-full gap-3 sm:gap-4 overflow-hidden pb-1 sm:pb-2">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-md sm:rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/10 border border-slate-100">
                        <FileText size={20} className="text-teal-500 sm:hidden" strokeWidth={2.5} />
                        <FileText size={24} className="text-teal-500 hidden sm:block" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-none">Medical Records</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-teal-500"></span>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient History Archive</p>
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