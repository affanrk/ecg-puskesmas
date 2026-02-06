'use client';

import ResultTable from '@/components/classifier/ResultTable';

export default function ResultPage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <div className="flex-1 min-h-0 border-t border-slate-100">
                <ResultTable />
            </div>
        </div>
    );
}