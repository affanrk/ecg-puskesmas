'use client';

import clsx from 'clsx';
import { MapPin, Edit, Users2, AlertTriangle, LogOut } from 'lucide-react';

import Tooltip from '@/components/shared/Tooltip';
import { User, LocationResponse } from '@/types/user';

interface StaffTableRowProps {
    staff: User;
    locations: LocationResponse[];
    onEdit: (staff: User) => void;
    onAssignLocations: (staff: User) => void;
    onActivate: (staff: User) => void;
    onDeactivate: (staff: User) => void;
    onDelete: (staff: User) => void;
    onResign: (staff: User) => void;
}

export default function StaffTableRow({
    staff,
    locations,
    onEdit,
    onAssignLocations,
    onActivate,
    onDeactivate,
    onDelete,
    onResign
}: StaffTableRowProps) {
    const profile = staff.role === 'doctor' ? staff.doctor_profile : staff.operator_profile;
    const profileLocationId = profile?.location_id ?? null;
    const resolvedFallbackLocation = profileLocationId
        ? locations.find(l => l.id === profileLocationId) ?? null
        : null;
    const isApproved = profile?.status === 'APPROVED';
    const canDelete = !staff.is_active && !isApproved;

    const getRoleBadge = () => {
        if (staff.role === 'doctor') {
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    Doctor
                </div>
            );
        }
        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Operator
            </div>
        );
    };

    return (
        <tr className="hover:bg-blue-50/30 transition-colors group h-[48px]">
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-blue-600 transition-colors shadow-sm">
                        {(profile?.full_name || staff.username).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-800 group-hover:text-blue-700 transition-colors truncate max-w-[200px]">
                            {profile?.full_name || staff.username}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 truncate">
                            @{staff.username}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                {getRoleBadge()}
                {staff.role === 'doctor' && staff.doctor_profile?.specialty && (
                    <p className="text-[9px] font-bold text-slate-500 mt-1">
                        {staff.doctor_profile.specialty}
                    </p>
                )}
                {staff.role === 'operator' && staff.operator_profile?.operator_role && (
                    <p className="text-[9px] font-bold text-slate-500 mt-1">
                        {staff.operator_profile.operator_role}
                    </p>
                )}
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-2 flex-wrap">
                    {staff.location_assignments && staff.location_assignments.length > 0 ? (
                        staff.location_assignments.map((assignment) => {
                            const loc = locations.find(l => l.id === assignment.location_id);
                            const isLocationInactive = loc && !loc.is_active;

                            return (
                                <div key={assignment.id} className="flex items-center gap-1.5">
                                    <div className={clsx(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border",
                                        isLocationInactive
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : assignment.is_primary
                                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                                : "bg-slate-50 text-slate-600 border-slate-100"
                                    )}>
                                        <MapPin size={12} className={
                                            isLocationInactive ? "text-amber-500" :
                                                assignment.is_primary ? "text-blue-500" :
                                                    "text-slate-400"
                                        } />
                                        {loc?.name || 'Unknown'}
                                        {assignment.is_primary && (
                                            <span className="text-[8px] font-black uppercase tracking-wider ml-1 px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                                                Primary
                                            </span>
                                        )}
                                    </div>
                                    {isLocationInactive && (
                                        <div
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
                                            title="Location is inactive"
                                        >
                                            <AlertTriangle size={10} className="text-amber-600" />
                                            <span className="text-[8px] font-black uppercase tracking-wider">Inactive</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : resolvedFallbackLocation ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-100">
                            <MapPin size={12} className="text-slate-400" />
                            {resolvedFallbackLocation.name}
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">No locations assigned</span>
                    )}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className={clsx(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                    staff.is_active
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    <div className={clsx("w-1.5 h-1.5 rounded-full", staff.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                    {staff.is_active ? "Active" : "Inactive"}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap text-right pr-6 sticky right-0 bg-white group-hover:bg-blue-50/30">
                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(staff)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 hover:text-blue-700 transition-all active:scale-[0.98] border border-blue-100 cursor-pointer flex items-center gap-1.5"
                    >
                        <Edit size={10} /> Edit
                    </button>
                    <button
                        onClick={() => onAssignLocations(staff)}
                        className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-violet-100 hover:text-violet-700 transition-all active:scale-[0.98] border border-violet-100 cursor-pointer flex items-center gap-1.5"
                    >
                        <Users2 size={10} /> Locations
                    </button>
                    {staff.is_active && (
                        <button
                            onClick={() => onResign(staff)}
                            className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-orange-100 hover:text-orange-700 transition-all active:scale-[0.98] border border-orange-100 cursor-pointer flex items-center gap-1.5"
                        >
                            <LogOut size={10} /> Resign
                        </button>
                    )}
                    {staff.is_active ? (
                        <button
                            onClick={() => onDeactivate(staff)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 hover:text-rose-700 transition-all active:scale-[0.98] border border-rose-100 cursor-pointer"
                        >
                            Deactivate
                        </button>
                    ) : (
                        <button
                            onClick={() => onActivate(staff)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-[0.98] border border-emerald-100 cursor-pointer"
                        >
                            Activate
                        </button>
                    )}
                    <Tooltip
                        content={
                            staff.is_active
                                ? "Deactivate first before deleting"
                                : isApproved
                                    ? "Cannot delete approved users"
                                    : "Delete this user"
                        }
                        disabled={canDelete}
                        position="left"
                    >
                        <button
                            onClick={() => onDelete(staff)}
                            disabled={!canDelete}
                            className={clsx(
                                "px-3 py-1.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] border border-red-100",
                                !canDelete
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
