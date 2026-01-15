'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { formatDate, escapeHtml } from '@/utils/helpers';
import { CONFIG } from '@/config/constants';
import { Search, Calendar, Trash2, Download, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, BarChart2, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/hooks/useToast';
import { useStore } from '@/store/useStore';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

export default function HistoryPage() {
    const { archiveData, setArchiveData } = useStore();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const rowsPerPage = CONFIG.ROWS_PER_PAGE_ARCHIVE || 10;
    const { show: toast } = useToast();
    
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fpRef = useRef<any>(null);

    // Initialize Flatpickr
    useEffect(() => {
        if (dateInputRef.current) {
            fpRef.current = flatpickr(dateInputRef.current, {
                mode: "range",
                dateFormat: "Y-m-d",
                altInput: false, 
                maxDate: "today",
                locale: { rangeSeparator: " - " },
                onChange: (selectedDates) => {
                    if (selectedDates.length === 2) {
                        const fmt = (d: Date) => {
                            const offset = d.getTimezoneOffset() * 60000;
                            return new Date(d.getTime() - offset).toISOString().split('T')[0];
                        };
                        setDateRange({
                            start: fmt(selectedDates[0]),
                            end: fmt(selectedDates[1])
                        });
                    } else if (selectedDates.length === 0) {
                        setDateRange({ start: '', end: '' });
                    }
                }
            });
        }
        return () => {
            if (fpRef.current) fpRef.current.destroy();
        };
    }, []);

    // Load Data
    const loadHistory = async (showToast = false) => {
        setLoading(true);
        try {
            const data = await api.fetchHistory({
                search,
                start_date: dateRange.start,
                end_date: dateRange.end
            });
            setArchiveData(data);
            setCurrentPage(1);
            if (showToast) toast("Synchronized", "success");
        } catch (error) {
            console.error(error);
            toast("Sync failed", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [search, dateRange]);

    const totalPages = Math.ceil(archiveData.length / rowsPerPage) || 1;
    const paginatedData = archiveData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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

    const isFilterActive = search.length > 0 || dateRange.start.length > 0;

    return (
        <div className="flex flex-col h-full max-w-[1600px] mx-auto gap-4 overflow-hidden">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-fit overflow-hidden">
                {/* Header Toolbar */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-white shrink-0">
                    <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 w-full">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search archives..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                            />
                        </div>

                        <div className="relative group w-full sm:w-56">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10" />
                            <input
                                type="text"
                                ref={dateInputRef}
                                placeholder="Filter by Date"
                                className="pl-9 pr-3 py-2 text-xs font-medium w-full rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-brand-300 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-700 shadow-sm cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={clearFilters}
                            disabled={!isFilterActive}
                            className={clsx(
                                "px-3 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-lg shadow-sm transition-all flex items-center gap-1",
                                isFilterActive 
                                    ? "bg-rose-500 hover:bg-rose-600 active:scale-95 cursor-pointer" 
                                    : "bg-slate-300 opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Reset
                        </button>
                        
                        <button
                            onClick={() => loadHistory(true)}
                            className="p-2 text-slate-400 hover:text-brand-600 transition-colors rounded-lg hover:bg-slate-50"
                            title="Sync Data"
                        >
                            <RefreshCcw className={clsx("w-4 h-4", loading && "animate-spin")} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleDownload('raw')}
                            disabled={!selectedRecord}
                            className="disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-brand-600 rounded-md text-[10px] font-bold transition-all shadow-sm active:scale-95 uppercase tracking-wider cursor-pointer"
                        >
                            Export
                        </button>
                        <button
                            onClick={() => handleDownload('feature')}
                            disabled={!selectedRecord}
                            className="disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-brand-600 rounded-md text-[10px] font-bold transition-all shadow-sm active:scale-95 uppercase tracking-wider cursor-pointer"
                        >
                            Analysis
                        </button>
                        <button
                            onClick={() => handleDownload('plot')}
                            disabled={!selectedRecord}
                            className="disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-brand-600 rounded-md text-[10px] font-bold transition-all shadow-sm active:scale-95 uppercase tracking-wider cursor-pointer"
                        >
                            Waveform
                        </button>
                    </div>
                </div>

                {/* Table Area - Compacted for 10 rows (10 * 36px + header 36px = 396px) */}
                <div className="overflow-hidden bg-white h-[396px]">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-slate-50">
                            <tr className="text-[10px] uppercase text-slate-400 font-bold tracking-widest h-9 border-b border-slate-100">
                                <th className="px-5 w-[20%]">Capture Date</th>
                                <th className="px-5 w-[15%]">Device</th>
                                <th className="px-5 w-[18%]">NIK</th>
                                <th className="px-5 w-[27%]">Name</th>
                                <th className="px-5 w-[20%]">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && archiveData.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic text-sm">Synchronizing...</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic text-sm">No records found.</td></tr>
                            ) : (
                                paginatedData.map((rec, idx) => {
                                    const isSelected = selectedRecord?.recording_id === rec.recording_id;
                                    const status = (rec.classification || '').toString();
                                    const isAbnormal = ['Abnormal', 'Aritmia', 'Berpotensi'].some(x => status.includes(x));

                                    return (
                                        <tr
                                            key={rec.recording_id || `${rec.timestamp}-${idx}`}
                                            onClick={() => setSelectedRecord(isSelected ? null : rec)}
                                            className={clsx(
                                                "cursor-pointer transition-all h-9 text-[10px] leading-none group",
                                                isSelected ? "bg-brand-50/80 ring-1 ring-inset ring-brand-200" : "hover:bg-slate-50/50"
                                            )}
                                        >
                                            <td className="px-5 font-mono font-bold text-slate-500">{formatDate(rec.timestamp)}</td>
                                            <td className="px-5 font-bold text-slate-900">{rec.device_id}</td>
                                            <td className="px-5 font-mono text-slate-600 truncate">{rec.subject_id}</td>
                                            <td className="px-5 font-bold text-slate-700 truncate">{rec.patient_name}</td>
                                            <td className="px-5">
                                                <span className={clsx(
                                                    "inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset uppercase",
                                                    status === 'Normal' ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                                                        isAbnormal ? "bg-rose-50 text-rose-700 ring-rose-200" :
                                                            "bg-slate-50 text-slate-600 ring-slate-200"
                                                )}>
                                                    {status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            {/* Fill empty rows to maintain height consistency */}
                            {paginatedData.length > 0 && paginatedData.length < 10 && (
                                Array.from({ length: 10 - paginatedData.length }).map((_, i) => (
                                    <tr key={`empty-${i}`} className="h-9 border-none bg-white"><td colSpan={5}></td></tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Fixed Pagination Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                    <div className="flex items-center gap-4">
                        <span>Page <span className="text-slate-700">{currentPage}</span> / <span className="text-slate-700">{totalPages}</span></span>
                        <span className="text-slate-300 font-normal">|</span>
                        <span>{archiveData.length} Total</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}