import { History } from 'lucide-react';

export function EmptyLogs() {
    return (
        <tr>
            <td colSpan={5} className="py-20 text-center">
                <div className="flex flex-col items-center opacity-30">
                    <History size={48} className="text-slate-300 mb-3" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No History Found</p>
                </div>
            </td>
        </tr>
    );
}
