'use client';

import clsx from 'clsx';
import { MapPin, RefreshCw, AlertTriangle } from 'lucide-react';

import Tooltip from '@/components/shared/Tooltip';
import { User, LocationResponse } from '@/types/user';

interface AdminTableRowProps {
    admin: User;
    locations: LocationResponse[];
    onReassign: (admin: User) => void;
    onActivate: (admin: User) => void;
    onDeactivate: (admin: User) => void;
    onDelete: (admin: User) => void;
}

export default function AdminTableRow({ admin, locations, onReassign, onActivate, onDeactivate, onDelete }: AdminTableRowProps) {
    const locId = admin.admin_profile?.location_id || admin.location_id;
    const loc = locations.find(l => l.id === locId);
    const isLocationInactive = loc && !loc.is_active;

    return (
        <tr className={clsx(
            "hover:bg-violet-50/30 transition-colors group h-[48px]",
            isLocationInactive && "bg-amber-50/20"
        )}>
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-violet-600 transition-colors shadow-sm">
                        {admin.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-800 group-hover:text-violet-700 transition-colors truncate max-w-[200px]">
                            {admin.admin_profile?.full_name || admin.username}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 truncate">
                            @{admin.username}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <p className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">{admin.email}</p>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className={clsx(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                    admin.is_active
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    <div className={clsx("w-1.5 h-1.5 rounded-full", admin.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                    {admin.is_active ? "Active" : "Inactive"}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    {loc ? (
                        <div className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border",
                            isLocationInactive 
                                ? "bg-amber-50 text-amber-700 border-amber-200" 
                                : "bg-slate-50 text-slate-600 border-slate-100"
                        )}>
                            <MapPin size={12} className={isLocationInactive ? "text-amber-500" : "text-slate-400"} /> 
                            {loc.name}
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">Unassigned</span>
                    )}
                    {isLocationInactive && (
                        <div 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
                            title="This admin's location is inactive and needs reassignment"
                        >
                            <AlertTriangle size={10} className="text-amber-600" />
                            <span className="text-[8px] font-black uppercase tracking-wider">Inactive Location</span>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap text-right pr-6">
                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onReassign(admin)}
                        className={clsx(
                            "px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5",
                            isLocationInactive
                                ? "bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-600 hover:text-white"
                                : "bg-violet-50 text-violet-600 border border-violet-100/50 hover:bg-violet-600 hover:text-white"
                        )}
                        title={isLocationInactive ? "Reassign to active location (Required)" : "Reassign Location"}
                    >
                        <RefreshCw size={10} /> Reassign
                    </button>
                    {admin.is_active ? (
                        <button
                            onClick={() => onDeactivate(admin)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 hover:text-rose-700 transition-all active:scale-[0.98] border border-rose-100 cursor-pointer"
                        >
                            Deactivate
                        </button>
                    ) : (
                        <button
                            onClick={() => onActivate(admin)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-[0.98] border border-emerald-100 cursor-pointer"
                        >
                            Activate
                        </button>
                    )}
                    <Tooltip 
                        content="Deactivate first before deleting" 
                        disabled={admin.is_active}
                        position="left"
                    >
                        <button
                            onClick={() => onDelete(admin)}
                            disabled={admin.is_active}
                            className={clsx(
                                "px-3 py-1.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] border border-red-100",
                                admin.is_active 
                                    ? "opacity-40 cursor-not-allowed" 
                                    : "hover:bg-red-100 hover:text-red-700 cursor-pointer"
                            )}
                        >
                            Delete
                        </button>
                    </Tooltip>
                </div>
            </td>
        </tr>
    );
}
