'use client';

import { memo, useEffect, useRef } from 'react';
import { User } from '@/types/user';
import {
    ChevronLeft,
    ChevronRight,
    UserX
} from 'lucide-react';
import clsx from 'clsx';
import { formatDateShort } from '@/utils/helpers';
import { getActiveProfile } from '@/utils/helpers';

const UserTableRow = memo(({
    user,
    onEdit,
    onDelete
}: {
    user: User;
    onEdit: (u: User) => void;
    onDelete: (u: User) => void;
}) => (
    <tr className="hover:bg-rose-50/30 transition-colors group h-[48px]">
        <td className="px-5 whitespace-nowrap">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-rose-600 transition-colors shadow-sm">
                    {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <p className="text-[11px] font-black text-slate-800 group-hover:text-rose-700 transition-colors truncate max-w-[180px]">{(getActiveProfile(user)?.full_name || "") || user.username}</p>
                    <p className="text-[9px] font-bold text-slate-400">{(getActiveProfile(user)?.full_name || "") ? `@${user.username}` : '---'}</p>
                </div>
            </div>
        </td>
        <td className="px-5 whitespace-nowrap">
            <div>
                <p className="text-[10px] font-mono font-black text-slate-500 group-hover:text-slate-700 transition-colors">{(getActiveProfile(user)?.nik || "") || 'No NIK'}</p>
                <p className="text-[9px] font-bold text-slate-400">{user.email}</p>
            </div>
        </td>
        <td className="px-5 whitespace-nowrap">
            <div className="flex items-center gap-2">
                <span className={clsx(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                    user.role === 'admin' ? "bg-slate-900 text-white border-slate-900" :
                        user.is_doctor ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            user.is_operator ? "bg-blue-50 text-blue-600 border-blue-100" :
                                user.is_patient ? "bg-rose-50 text-rose-600 border-rose-100" :
                                    "bg-slate-50 text-slate-500 border-slate-100"
                )}>
                    {user.role === 'admin' ? 'Admin' :
                        user.is_doctor ? 'Specialist' :
                            user.is_operator ? 'Operator' :
                                user.is_patient ? 'Patient' : 'User'}
                </span>
            </div>
        </td>
        <td className="px-5 whitespace-nowrap">
            <div className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                user.is_active
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-slate-50 text-slate-400 border-slate-100"
            )}>
                <div className={clsx("w-1.5 h-1.5 rounded-full", user.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                {user.is_active ? "Active" : "Inactive"}
            </div>
        </td>
        <td className="px-5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-tighter">
                {formatDateShort(user.created_dt as string)}
            </span>
        </td>
        <td className="px-5 whitespace-nowrap text-right pr-6">
            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(user)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-[0.98] border border-blue-100/50 cursor-pointer"
                    title="Edit User"
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(user)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-[0.98] border border-rose-100/50 cursor-pointer"
                    title="Delete User"
                >
                    Delete
                </button>
            </div>
        </td>
    </tr>
));

UserTableRow.displayName = 'UserTableRow';

interface UserManagementTableProps {
    users: User[];
    rowsPerPage: number;
    setRowsPerPage: (count: number) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}

export default function UserManagementTable({
    users,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
    onEdit,
    onDelete
}: UserManagementTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const totalPages = Math.ceil(users.length / rowsPerPage) || 1;
    const paginatedUsers = users.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const headerHeight = 48;
                const availableHeight = height - headerHeight;
                const idealRows = 10;
                const rowHeight = 48;
                const calculatedRows = Math.max(1, Math.floor(availableHeight / rowHeight));
                if (calculatedRows >= idealRows) {
                    setRowsPerPage(idealRows);
                } else {
                    setRowsPerPage(calculatedRows);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [setRowsPerPage]);

    if (users.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-50 rounded-xl bg-white/50 animate-in fade-in duration-500">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3">
                    <UserX size={24} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">No Users Found</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Try adjusting your search or filters
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative z-10 overflow-y-hidden">
                    <table className="w-full text-left border-collapse table-auto h-full">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Identity</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Credentials</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Access</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Status</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Joined</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedUsers.map((user) => (
                                <UserTableRow
                                    key={user.id}
                                    user={user}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
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
                            <span className="text-rose-600">{users.length}</span> Total Users
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                        >
                            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                        >
                            <ChevronRight className="w-4 h-4" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}