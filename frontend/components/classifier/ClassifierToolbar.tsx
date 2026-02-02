'use client';

import { useRef, useEffect } from 'react';
import { Search, Calendar, Trash2, RefreshCcw, Activity, FileText, Download } from 'lucide-react';
import clsx from 'clsx';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface ClassifierToolbarProps {
    search: string;
    setSearch: (val: string) => void;
    dateRange: { start: string; end: string };
    setDateRange: (range: { start: string; end: string }) => void;
    isFilterActive: boolean;
    clearFilters: () => void;
    loadHistory: (showToast?: boolean) => void;
    loading: boolean;
    selectedRecordId: string | null;
    handleDownload: (type: 'raw' | 'feature' | 'plot') => void;
}

interface FlatpickrInstance {
    destroy: () => void;
    clear: (triggerChange?: boolean) => void;
    setDate: (date: string | Date | string[] | Date[], triggerChange?: boolean) => void;
}

export default function ClassifierToolbar({
    search,
    setSearch,
    dateRange,
    setDateRange,
    isFilterActive,
    clearFilters,
    loadHistory,
    loading,
    selectedRecordId,
    handleDownload
}: ClassifierToolbarProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fpRef = useRef<FlatpickrInstance | null>(null);

    // Initialize Flatpickr
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
                    // Only update state if we have a valid range or cleared
                    if (selectedDates.length === 2) {
                        const [start, end] = dateStr.split(' to ');
                        setDateRange({ start, end: end || start });
                    } else if (selectedDates.length === 0) {
                        setDateRange({ start: '', end: '' });
                    }
                    // Note: We don't update on single date selection (length 1) 
                    // to allow the user to pick the second date without premature state updates
                    // unless they explicitly close the calendar or logic requires it.
                    // However, standard flatpickr behavior for range is to wait for 2nd click.
                }
            }) as unknown as FlatpickrInstance;
        }

        return () => {
            if (fpRef.current) {
                fpRef.current.destroy();
                fpRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Sync Flatpickr with external state changes (e.g. clear filters, URL params)
    useEffect(() => {
        if (fpRef.current) {
            // Only update if strictly necessary to avoid loops or interrupting user interaction
            if (dateRange.start && dateRange.end) {
                fpRef.current.setDate([dateRange.start, dateRange.end], false); // false = no onChange trigger
            } else if (!dateRange.start && !dateRange.end) {
                fpRef.current.clear(false);
            }
        }
    }, [dateRange]);



    return (
        <div className="px-4 sm:px-6 py-4 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/50 backdrop-blur-sm relative z-20 shrink-0">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
                <div className="relative w-full sm:w-64 group/search shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-teal-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
                    />
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
                            "flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white rounded-lg shadow-sm transition-all flex items-center justify-center gap-2",
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
                        className="p-2.5 text-slate-400 hover:text-teal-600 transition-all rounded-md hover:bg-teal-50 border border-transparent hover:border-teal-100 ml-auto sm:ml-0"
                        title="Sync Data"
                    >
                        <RefreshCcw className={clsx("w-4 h-4", loading && "animate-spin")} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                <div className="h-8 w-px bg-slate-100 hidden lg:block mx-2"></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mr-2 hidden lg:block">Export:</span>
                {[
                    { id: 'raw', label: 'Signal', icon: Activity },
                    { id: 'feature', label: 'Report', icon: FileText },
                    { id: 'plot', label: 'Wave', icon: Download }
                ].map((btn) => (
                    <button
                        key={btn.id}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={() => handleDownload(btn.id as any)}
                        disabled={!selectedRecordId}
                        className={clsx(
                            "px-3 sm:px-4 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap",
                            selectedRecordId
                                ? "bg-white border-slate-200 text-slate-600 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 shadow-sm active:scale-95"
                                : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                        )}
                    >
                        <btn.icon size={14} strokeWidth={2.5} />
                        <span className="hidden xs:inline">{btn.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
