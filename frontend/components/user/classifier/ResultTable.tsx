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
    const { user, archiveData, setArchiveData } = useStore();
    const { show: toast } = useToast();
    const searchParams = useSearchParams();
    
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState<number | ''>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecord, setSelectedRecord] = useState<AnalysisResult | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const isFetching = useRef(false);

    const loadHistory = useCallback(async (showToast = false) => {
        if (!user?.id || isFetching.current) return;
        
        isFetching.current = true;
        setLoading(true);
        try {
            const requestLimit = limit === '' ? undefined : (limit > 200 ? 200 : limit);

            const data = await api.fetchHistory({
                limit: requestLimit,
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
    }, [limit, dateRange, user?.id, setArchiveData, toast]);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            setDateRange({ start: dateParam, end: dateParam });
        }
    }, [searchParams, setDateRange]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const totalPages = Math.ceil(archiveData.length / rowsPerPage) || 1;
    const paginatedData = archiveData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const isFilterActive = dateRange.start.length > 0 || limit !== '';

    const clearFilters = () => {
        setLimit('');
        setDateRange({ start: '', end: '' });
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative group">
                <ClassifierToolbar
                    limit={limit}
                    setLimit={setLimit}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    isFilterActive={isFilterActive}
                    clearFilters={clearFilters}
                    loadHistory={loadHistory}
                    loading={loading}
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
