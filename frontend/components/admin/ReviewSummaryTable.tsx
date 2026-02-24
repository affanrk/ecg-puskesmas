'use client';

interface ReviewField {
    field: string;
    value: string;
}

interface ChangeField {
    field: string;
    old: string;
    new: string;
}

interface ReviewSummaryTableProps {
    data?: ReviewField[];
    changes?: ChangeField[];
}

export default function ReviewSummaryTable({ data, changes }: ReviewSummaryTableProps) {
    return (
        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-[10px] text-left border-collapse">
                <thead className="bg-slate-100 text-slate-400 uppercase font-black">
                    <tr>
                        <th className="px-4 py-2 border-b border-slate-200">Field</th>
                        {changes ? (
                            <>
                                <th className="px-4 py-2 border-b border-slate-200">Original</th>
                                <th className="px-4 py-2 border-b border-slate-200">New Value</th>
                            </>
                        ) : (
                            <th className="px-4 py-2 border-b border-slate-200">Value</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                    {data?.map((item, i) => (
                        <tr key={i} className="hover:bg-white transition-colors">
                            <td className="px-4 py-2 text-slate-400 font-black uppercase">{item.field}</td>
                            <td className="px-4 py-2 text-blue-600">{item.value || '-'}</td>
                        </tr>
                    ))}
                    {changes?.map((change, i) => (
                        <tr key={i} className="hover:bg-white transition-colors">
                            <td className="px-4 py-2 text-slate-400 font-black uppercase">{change.field}</td>
                            <td className="px-4 py-2 line-through decoration-rose-300 opacity-60">{change.old}</td>
                            <td className="px-4 py-2 text-blue-600">{change.new}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
