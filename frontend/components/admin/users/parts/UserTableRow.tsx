import React, { memo } from 'react';

import clsx from 'clsx';

import { User } from '@/types/user';
import { formatDateShort, getActiveProfile } from '@/utils/helpers';

interface UserTableRowProps {
    user: User;
    onEdit: (u: User) => void;
    onDelete: (u: User) => void;
    onViewDetails?: (u: User) => void;
}

export const UserTableRow = memo(({
    user,
    onEdit,
    onDelete,
    onViewDetails
}: UserTableRowProps) => {
    const fullName = (getActiveProfile(user)?.full_name || "") || user.username;
    const isPatient = user.is_patient || user.role === 'patient';
    
    return (
        <tr className="hover:bg-rose-50/30 transition-colors group h-[48px]">
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-rose-600 transition-colors shadow-sm">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-800 group-hover:text-rose-700 transition-colors truncate max-w-[180px]">{fullName}</p>
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
                    {isPatient && onViewDetails && (
                        <button
                            onClick={() => onViewDetails(user)}
                            className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all active:scale-[0.98] border border-purple-100/50 cursor-pointer"
                            title="View Patient Details"
                        >
                            Details
                        </button>
                    )}
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
    );
});

UserTableRow.displayName = 'UserTableRow';
