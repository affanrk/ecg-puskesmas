'use client';

import { useRef, useEffect, useState } from 'react';
import { Hash, Calendar, Trash2, RefreshCcw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface ClassifierToolbarProps {
    limit: number | '';
    setLimit: (val: number | '') => void;
    dateRange: { start: string; end: string };
    setDateRange: (range: { start: string; end: string }) => void;
    isFilterActive: boolean;
    clearFilters: () => void;
    loadHistory: (showToast?: boolean) => void;
    loading: boolean;
}

interface FlatpickrInstance {
    destroy: () => void;
    clear: (triggerChange?: boolean) => void;
    setDate: (date: string | Date | string[] | Date[], triggerChange?: boolean) => void;
}

export default function ClassifierToolbar({
    limit,
    setLimit,
    dateRange,
    setDateRange,
    isFilterActive,
    clearFilters,
    loadHistory,
    loading
}: ClassifierToolbarProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fpRef = useRef<FlatpickrInstance | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (dateInputRef.current) {
            fpRef.current = flatpickr(dateInputRef.current, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'j F Y',
                defaultDate: dateRange.start ? [dateRange.start, dateRange.end] : undefined,
                altInputClass: "pl-10 pr-4 py-2.5 text-xs font-bold w-full rounded-md border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-slate-700 cursor-pointer placeholder:text-slate-400",
                onChange: (selectedDates, dateStr) => {
                    if (selectedDates.length === 2) {
                        const [start, end] = dateStr.split(' to ');
                        setDateRange({ start, end: end || start });
                    } else if (selectedDates.length === 0) {
                        setDateRange({ start: '', end: '' });
                    }
                }
            }) as object as FlatpickrInstance;
        }
        return () => {
            if (fpRef.current) {
                fpRef.current.destroy();
                fpRef.current = null;
            }
        };
    }, [dateRange.end, dateRange.start, setDateRange]);

    useEffect(() => {
        if (fpRef.current) {
            if (dateRange.start && dateRange.end) {
                fpRef.current.setDate([dateRange.start, dateRange.end], false);
            } else if (!dateRange.start && !dateRange.end) {
                fpRef.current.clear(false);
            }
        }
    }, [dateRange]);

    return (
        <div className="px-4 sm:px-6 py-2.5 2xl:py-3.5 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/50 backdrop-blur-sm relative z-20 shrink-0">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 flex-wrap">
                <div className="relative w-full sm:w-48 group/limit shrink-0">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/limit:text-teal-500 transition-colors" />
                    <input
                        type="number"
                        placeholder="Max records..."
                        value={limit}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                                setLimit('');
                            } else {
                                const num = parseInt(val);
                                if (!isNaN(num)) {
                                    setLimit(Math.max(1, num));
                                }
                            }
                        }}
                        className={clsx(
                            "w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-md border bg-slate-50/50 focus:bg-white focus:ring-4 outline-none transition-all placeholder:text-slate-400 text-slate-700",
                            typeof limit === 'number' && limit > 200
                                ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500/10"
                                : "border-slate-200 focus:border-teal-500 focus:ring-teal-500/10"
                        )}
                        min="1"
                    />
                    {typeof limit === 'number' && limit > 200 ? (
                        <div className="absolute top-full left-0 mt-2 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 shadow-sm z-50">
                            <AlertTriangle size={10} />
                            <span>Limit capped at 200</span>
                        </div>
                    ) : isFocused ? (
                        <div className="absolute top-full left-0 mt-2 flex items-center gap-1.5 text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md border border-teal-100 shadow-sm z-50">
                            <span>Max records is 200</span>
                        </div>
                    ) : null}
                </div>
                <div className="relative group/date w-full sm:w-56 shrink-0">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover/date:text-teal-500 transition-colors pointer-events-none z-10" />
                    <input
                        type="text"
                        ref={dateInputRef}
                        placeholder="Select Date Range"
                        className="hidden"
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                        onClick={clearFilters}
                        disabled={!isFilterActive}
                        className={clsx(
                            "flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                            isFilterActive
                                ? "bg-rose-500 hover:bg-rose-600 active:scale-95 shadow-rose-500/20"
                                : "bg-slate-200 opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset</span>
                    </button>
                    <button
                        onClick={() => loadHistory(true)}
                        className="p-2.5 text-slate-400 hover:text-teal-600 transition-all rounded-md hover:bg-teal-50 border border-transparent hover:border-teal-100 ml-auto sm:ml-0 cursor-pointer"
                        title="Sync Data"
                    >
                        <RefreshCcw className={clsx("w-4 h-4", loading && "animate-spin")} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}
