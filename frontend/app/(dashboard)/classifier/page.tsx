'use client';

import ResultTable from '@/components/classifier/ResultTable';
import { BrainCircuit } from 'lucide-react';

export default function ResultPage() {
    return (
        <div className="flex flex-col h-full w-full gap-4 sm:gap-5 overflow-hidden pb-2 sm:pb-4">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/10 border border-slate-100">
                        <BrainCircuit size={20} className="text-teal-500 sm:hidden" strokeWidth={2.5} />
                        <BrainCircuit size={24} className="text-teal-500 hidden sm:block" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-none">Classifier Results</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-teal-500"></span>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Analysis & Classification</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Result Table */}
            <div className="flex-1 min-h-0">
                <ResultTable />
            </div>
        </div>
    );
}
