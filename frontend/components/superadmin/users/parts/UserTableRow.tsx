'use client';

import { User } from '@/types/user';
import clsx from 'clsx';

interface UserTableRowProps {
    user: User;
    readOnly?: boolean;
    onActivate?: (user: User) => void;
    onDeactivate?: (user: User) => void;
    onDelete?: (user: User) => void;
}

export default function UserTableRow({ user, readOnly = false }: UserTableRowProps) {
    return (
        <tr className="hover:bg-blue-50/30 transition-colors group h-[48px]">
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-blue-600 transition-colors shadow-sm">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-800 group-hover:text-blue-700 transition-colors truncate max-w-[200px]">
                            {user.username}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 truncate max-w-[250px]">
                            {user.email || "No Email"}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-slate-50 text-slate-500 border-slate-100">
                    {user.role}
                </span>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className={clsx(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                    user.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", user.is_active ? "bg-emerald-500" : "bg-slate-400")}></span>
                    {user.is_active ? "Active" : "Inactive"}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className={clsx(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                    user.is_activated === 1 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                    {user.is_activated === 1 ? "Activated" : "Pending"}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-tighter">
                    {user.created_dt ? new Date(user.created_dt).toLocaleDateString() : '-'}
                </span>
            </td>
            {readOnly && (
                <td className="px-5 whitespace-nowrap text-right pr-6">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Read-Only
                    </span>
                </td>
            )}
        </tr>
    );
}
