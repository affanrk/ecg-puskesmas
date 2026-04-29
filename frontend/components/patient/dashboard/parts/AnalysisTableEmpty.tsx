import { History } from 'lucide-react';

export function AnalysisTableEmpty() {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-30">
            <History size={64} className="text-slate-300" />
            <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">No Records</span>
        </div>
    );
}
