'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { formatDate } from '@/utils/helpers';
import { Clock, Search, Calendar, Trash2, ChevronLeft, ChevronRight, RefreshCcw, FileText, Download, Activity, HeartPulse, Database } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/hooks/useToast';
import { useStore, AnalysisResult } from '@/store/useStore';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { useSearchParams } from 'next/navigation';

interface FlatpickrInstance {
    destroy: () => void;
    clear: () => void;
}

export default function ResultTable() {
    // 1. Hooks & State
    const { user, archiveData, setArchiveData } = useStore();
    const { show: toast } = useToast();
    const searchParams = useSearchParams();
    
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecord, setSelectedRecord] = useState<AnalysisResult | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fpRef = useRef<FlatpickrInstance | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isFetching = useRef(false);

    // 2. Data Fetching
    const loadHistory = useCallback(async (showToast = false) => {
        if (!user?.id || isFetching.current) return;
        
        isFetching.current = true;
        setLoading(true);
        try {
            const data = await api.fetchHistory({
                search,
                start_date: dateRange.start,
                end_date: dateRange.end,
                user_id: user.id 
            });
            setArchiveData(data);
            setCurrentPage(1);
            if (showToast) toast("Synchronized", "success");
        } catch (error) {
            console.error(error);
            toast("Sync failed", "error");
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [search, dateRange, user?.id, setArchiveData, toast]);

    // 3. Effects
    
    // URL Params Handling
    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            setDateRange({ start: dateParam, end: dateParam });
        }
    }, [searchParams, setDateRange]);

    // Main Data Load
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Initialize Flatpickr for Date Range
    useEffect(() => {
        if (dateInputRef.current) {
            fpRef.current = flatpickr(dateInputRef.current, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'j F Y',
                defaultDate: dateRange.start ? [dateRange.start, dateRange.end] : undefined,
                // Replicate the styling classes from the original input
                altInputClass: "pl-10 pr-4 py-2.5 text-xs font-bold w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-slate-700 cursor-pointer placeholder:text-slate-400",
                onChange: (selectedDates, dateStr) => {
                    const [start, end] = dateStr.split(' to ');
                    if (start && end) {
                        setDateRange({ start, end });
                    } else if (start) {
                         // Handle single date selection (e.g., just clicking "Today")
                        setDateRange({ start, end: start });
                    } else {
                        setDateRange({ start: '', end: '' });
                    }
                }
            });
        }

        return () => {
            if (fpRef.current) {
                fpRef.current.destroy();
                fpRef.current = null;
            }
        };
    }, [dateRange.start, dateRange.end]);

    // Responsive Table Height Logic
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                // Header is exactly 50px (h-[50px]). Row is exactly 52px (h-[52px]).
                // We subtract header and a small buffer for borders/rounding
                const availableHeight = height - 50; 
                const calculatedRows = Math.max(1, Math.floor(availableHeight / 52));
                setRowsPerPage(calculatedRows);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 4. Computed & Helpers
    const totalPages = Math.ceil(archiveData.length / rowsPerPage) || 1;
    const paginatedData = archiveData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const isFilterActive = search.length > 0 || dateRange.start.length > 0;

    // 5. Handlers
    const handleDownload = (type: 'raw' | 'feature' | 'plot') => {
        if (!selectedRecord) {
            toast("Select a record first", "warning");
            return;
        }
        api.downloadRecording(type, selectedRecord.recording_id);
        const labels = { raw: 'Signal', feature: 'Report', plot: 'Waveform' };
        toast(`Exporting ${labels[type]}...`, "success");
    };

    const clearFilters = () => {
        setSearch('');
        setDateRange({ start: '', end: '' });
        if (fpRef.current) fpRef.current.clear();
    };

    // 6. Render
    return (
        <div className="flex flex-col h-full w-full gap-5 overflow-hidden pb-4">
            
            {/* Header Area */}
            {/* Note: The Header Area is rendered by the parent page in the new structure. 
               However, to match the user's requested "like before" structure which included the header inside the component,
               I will include the Main Content Card structure here. The actual Page Title header is in classifier/page.tsx.
               To strictly follow the "like before" which seemed to be the full page content:
            */}

            {/* Main Content Card */}
            <div className="bg-white rounded-3xl sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col flex-1 min-h-0 overflow-hidden relative group">
                
                {/* Toolbar */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/50 backdrop-blur-sm relative z-20 shrink-0">
                    <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
                        <div className="relative w-full sm:w-64 group/search shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-teal-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search records..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400 text-slate-700"
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
                                    "flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2",
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
                                className="p-2.5 text-slate-400 hover:text-teal-600 transition-all rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-100 ml-auto sm:ml-0"
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
                                disabled={!selectedRecord}
                                className={clsx(
                                    "px-3 sm:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap",
                                    selectedRecord 
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

                {/* Table Area */}
                <div ref={containerRef} className="flex-1 overflow-hidden relative z-10 no-scrollbar">
                    {loading ? (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-40">
                            <div className="animate-spin text-teal-500">
                                <Clock size={48} />
                            </div>
                            <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 text-center uppercase">Loading Archives...</span>
                        </div>
                    ) : archiveData.length === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-30">
                            <Database size={64} className="text-slate-300" />
                            <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 text-center uppercase">No Records Found</span>
                        </div>
                    ) : (
                        <div className="h-full w-full overflow-x-auto no-scrollbar">
                            <table className="w-full h-full text-left border-collapse table-fixed lg:table-auto">
                                <thead className="bg-slate-50/50 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[50px]">
                                    <tr>
                                        <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Capture Date</th>
                                        <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Device ID</th>
                                        <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Subject NIK</th>
                                        <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100">Patient Name</th>
                                        <th className="px-6 sm:px-8 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-100 text-right">Analysis</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedData.map((rec, idx) => {
                                        const isSelected = selectedRecord?.recording_id === rec.recording_id;
                                        const status = (rec.classification || '').toString();
                                        const isAbnormal = ['Abnormal', 'Aritmia', 'Berpotensi'].some(x => status.includes(x));

                                        return (
                                            <tr
                                                key={rec.recording_id || `${rec.changed_dt}-${idx}`}
                                                onClick={() => setSelectedRecord(isSelected ? null : rec)}
                                                className={clsx(
                                                    "cursor-pointer transition-all group h-[52px]",
                                                    isSelected 
                                                        ? "bg-teal-50/50" 
                                                        : "hover:bg-slate-50/80"
                                                )}
                                            >
                                                <td className="px-6 sm:px-8 py-3">
                                                    <div className="font-mono text-sm font-bold text-slate-700">
                                                        {formatDate(rec.changed_dt).split(',')[0]} 
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                        {formatDate(rec.changed_dt).split(',')[1]}
                                                    </div>
                                                </td>
                                                <td className="px-6 sm:px-8 py-3">
                                                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100/50 px-2 py-1 rounded border border-slate-100">
                                                        {rec.device_id}
                                                    </span>
                                                </td>
                                                <td className="px-6 sm:px-8 py-3 font-mono text-xs font-bold text-slate-500">
                                                    {rec.subject_id}
                                                </td>
                                                <td className="px-6 sm:px-8 py-3 font-bold text-sm text-slate-700">
                                                    {rec.patient_name}
                                                </td>
                                                <td className="px-6 sm:px-8 py-3 text-right">
                                                    <span className={clsx(
                                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.12em] transition-all border shadow-sm whitespace-nowrap",
                                                        !isAbnormal 
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                            : "bg-rose-50 text-rose-700 border-rose-100"
                                                    )}>
                                                        <span className={clsx("w-1.5 h-1.5 rounded-full", !isAbnormal ? "bg-emerald-500" : "bg-rose-500")}></span>
                                                        {status}
                                                        {isAbnormal && <HeartPulse size={12} className="animate-pulse" />}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="px-8 py-4 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
                        </span>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="text-teal-600">{archiveData.length}</span> Records
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200"
                        >
                            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200"
                        >
                            <ChevronRight className="w-4 h-4" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}