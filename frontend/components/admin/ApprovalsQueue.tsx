'use client';

import { User } from '@/store/useStore';
import { UserX, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateShort } from '@/utils/helpers';

interface ApprovalsQueueProps {
    users: User[];
    rowsPerPage: number;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    searchTerm: string;
    dateRange: { start: string, end: string };
    onApprove: (id: string, name: string) => void;
    onReject: (id: string, name: string) => void;
    onViewDetails: (user: User) => void;
}

export default function ApprovalsQueue({
    users,
    rowsPerPage,
    currentPage,
    setCurrentPage,
    searchTerm,
    dateRange,
    onApprove,
    onReject,
    onViewDetails
}: ApprovalsQueueProps) {
    const totalPages = Math.ceil(users.length / rowsPerPage) || 1;
    const paginatedUsers = users.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (users.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 animate-in fade-in duration-500">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3">
                    <UserX size={24} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Empty Queue</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {searchTerm || dateRange.start ? "No matching results" : "No pending verifications"}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse table-auto h-full">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">
                                    Identity
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">
                                    NIK
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">
                                    Profile Summary
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap w-[120px]">
                                    Registered
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-8">
                                    Control
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-rose-50/30 transition-colors group cursor-pointer h-[48px]"
                                    onClick={() => onViewDetails(user)}
                                >
                                    <td className="px-5 whitespace-nowrap">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-rose-600 transition-colors shadow-sm">
                                                {user.username.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-[11px] font-black text-slate-800 group-hover:text-rose-700 transition-colors truncate max-w-[180px]">
                                                {user.full_name || user.username}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 whitespace-nowrap text-[10px] font-mono font-black text-slate-500 group-hover:text-slate-700 transition-colors">
                                        {user.nik || '---'}
                                    </td>
                                    <td className="px-5 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm text-[9px] font-black">{user.gender || 'U'}</span>
                                            <span className="truncate max-w-[120px]">{user.pob || '---'}</span>
                                            <span className="text-slate-200">|</span>
                                            <span className="flex items-center gap-1"><Calendar size={10} className="text-slate-300" /> {user.dob ? String(user.dob) : '---'}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 whitespace-nowrap text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                        {formatDateShort((user.changed_dt || user.created_dt) as string)}
                                    </td>
                                    <td className="px-5 whitespace-nowrap text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => onReject(user.id || "", user.full_name || user.username || "-")}
                                                className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 border border-rose-100/50"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => onApprove(user.id || "", user.full_name || user.username || "-")}
                                                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-8 py-3 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
                        </span>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="text-rose-600">{users.length}</span> In Queue
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                        >
                            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                        >
                            <ChevronRight className="w-4 h-4" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
