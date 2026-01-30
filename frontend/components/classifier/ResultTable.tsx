'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useStore, AnalysisResult } from '@/store/useStore';
import { useSearchParams } from 'next/navigation';
import ClassifierToolbar from './ClassifierToolbar';
import ClassifierTable from './ClassifierTable';
import ClassifierPagination from './ClassifierPagination';

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
    };

    // 6. Render
    return (
        <div className="flex flex-col h-full w-full gap-3 sm:gap-4 overflow-hidden pb-1 sm:pb-2">
            {/* Main Content Card */}
            <div className="bg-white rounded-md sm:rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col flex-1 min-h-0 overflow-hidden relative group">
                
                <ClassifierToolbar
                    search={search}
                    setSearch={setSearch}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    isFilterActive={isFilterActive}
                    clearFilters={clearFilters}
                    loadHistory={loadHistory}
                    loading={loading}
                    selectedRecordId={selectedRecord?.recording_id || null}
                    handleDownload={handleDownload}
                />

                <ClassifierTable
                    loading={loading}
                    data={paginatedData}
                    selectedRecordId={selectedRecord?.recording_id || null}
                    setSelectedRecord={setSelectedRecord}
                    setRowsPerPage={setRowsPerPage}
                />

                <ClassifierPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={archiveData.length}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}