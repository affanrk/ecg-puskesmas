'use client';

import clsx from 'clsx';
import { Building } from 'lucide-react';

import Tooltip from '@/components/shared/Tooltip';
import { LocationResponse } from '@/types/user';

interface LocationTableRowProps {
    location: LocationResponse;
    onEdit: (location: LocationResponse) => void;
    onDeactivate: (location: LocationResponse) => void;
    onActivate: (location: LocationResponse) => void;
    onDelete: (location: LocationResponse) => void;
}

export default function LocationTableRow({ location, onEdit, onDeactivate, onActivate, onDelete }: LocationTableRowProps) {
    return (
        <tr className="hover:bg-violet-50/30 transition-colors group h-[48px]">
            <td className="px-5 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 text-white rounded flex items-center justify-center group-hover:bg-violet-600 transition-colors shadow-sm">
                        <Building size={14} />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-800 group-hover:text-violet-700 transition-colors truncate max-w-[200px]">
                            {location.name}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div>
                    <p className="text-[10px] font-mono font-black text-slate-500 uppercase">{location.location_code}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-100">
                        {location.location_type}
                    </span>
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div>
                    <p className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">
                        {location.city || 'No City'}, {location.province || '-'}
                    </p>
                    {(location.kecamatan || location.kelurahan) && (
                        <p className="text-[9px] font-bold text-slate-400 truncate max-w-[200px]">
                            {location.kecamatan && `Kec. ${location.kecamatan}`}
                            {location.kecamatan && location.kelurahan && ', '}
                            {location.kelurahan && `Kel. ${location.kelurahan}`}
                        </p>
                    )}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap">
                <div className={clsx(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                    location.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", location.is_active ? "bg-emerald-500" : "bg-slate-400")}></span>
                    {location.is_active ? "Active" : "Inactive"}
                </div>
            </td>
            <td className="px-5 whitespace-nowrap text-right pr-6">
                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(location)}
                        className="px-3 py-1.5 bg-white text-slate-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-[0.98] border border-slate-200 cursor-pointer"
                    >
                        Edit
                    </button>
                    {location.is_active ? (
                        <button
                            onClick={() => onDeactivate(location)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 hover:text-rose-700 transition-all active:scale-[0.98] border border-rose-100 cursor-pointer"
                        >
                            Deactivate
                        </button>
                    ) : (
                        <button
                            onClick={() => onActivate(location)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-[0.98] border border-emerald-100 cursor-pointer"
                        >
                            Activate
                        </button>
                    )}
                    <Tooltip 
                        content="Deactivate first before deleting" 
                        disabled={location.is_active}
                        position="left"
                    >
                        <button
                            onClick={() => onDelete(location)}
                            disabled={location.is_active}
                            className={clsx(
                                "px-3 py-1.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] border border-red-100",
                                location.is_active 
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
