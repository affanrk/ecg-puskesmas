'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { useSearchParams } from 'next/navigation';

import ClassifierPagination from './parts/ClassifierPagination';
import ClassifierTable from './parts/ClassifierTable';
import ClassifierToolbar from './parts/ClassifierToolbar';
import { api } from '@/services';
import { useStore } from '@/store/useStore';

export default function ResultTable() {
    const user = useStore(state => state.user);
    const archiveData = useStore(state => state.archiveData);
    const setArchiveData = useStore(state => state.setArchiveData);
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState<number | ''>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const isFetching = useRef(false);

    const loadHistory = useCallback(async () => {
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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [limit, dateRange, user?.id, setArchiveData]);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            setDateRange({ start: dateParam, end: dateParam });
        }
    }, [searchParams, setDateRange]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const clearFilters = () => {
        setLimit('');
        setDateRange({ start: '', end: '' });
    };

    const totalPages = Math.ceil(archiveData.length / rowsPerPage) || 1;
    const paginatedData = archiveData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const isFilterActive = dateRange.start.length > 0 || limit !== '';

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
