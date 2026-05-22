'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { AdditionalLocationRequest } from '@/types/models';
import { parseApiError } from '@/utils/helpers';
import LocationRequestsHeader from './parts/LocationRequestsHeader';
import LocationRequestsTable from './parts/LocationRequestsTable';
import LocationRequestModals from './parts/LocationRequestModals';
import { EVENTS } from '@/config/constants';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';

type ApprovalType = 'additional_location' | 'transfer' | 'profile_update';

export default function LocationRequestsDashboard() {
    const { show: toast } = useToast();
    const { setAdminLoading } = useStore();
    const [requests, setRequests] = useState<AdditionalLocationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [filterType, setFilterType] = useState<ApprovalType | 'all'>('all');
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const [approvingRequest, setApprovingRequest] = useState<AdditionalLocationRequest | null>(null);
    const [rejectingRequest, setRejectingRequest] = useState<AdditionalLocationRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const fetchIdRef = useRef(0);
    const lastFetchedRef = useRef("");

    useEffect(() => {
        setAdminLoading(loading);
    }, [loading, setAdminLoading]);

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        toast("Location requests updated", "success");
    }, [toast]);

    useEffect(() => {
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
    }, [handleRefresh]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterType]);

    useEffect(() => {
        const totalPages = Math.ceil(requests.length / rowsPerPage) || 1;
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [requests.length, rowsPerPage, currentPage]);

    useEffect(() => {
        const currentParams = JSON.stringify({ filterType, refreshKey });
        if (lastFetchedRef.current === currentParams) return;
        
        const currentFetchId = ++fetchIdRef.current;
        
        const loadRequests = async () => {
            setLoading(true);
            lastFetchedRef.current = currentParams;
            
            try {
                const response = await api.fetchPendingAdditionalLocationRequests();
                const data = response?.data || [];
                
                if (currentFetchId === fetchIdRef.current) {
                    setRequests(data);
                }
            } catch (error) {
                if (currentFetchId === fetchIdRef.current) {
                    toast('Failed to load location requests', 'error');
                    console.error('Load requests error:', error);
                    lastFetchedRef.current = "";
                }
            } finally {
                if (currentFetchId === fetchIdRef.current) {
                    setLoading(false);
                    setAdminLoading(false);
                }
            }
        };
        
        loadRequests();
    }, [filterType, refreshKey, toast, setAdminLoading]);

    const filteredRequests = requests.filter(() => {
        if (filterType === 'all') return true;
        if (filterType === 'additional_location') return true;
        return false;
    });

    const counts = {
        all: requests.length,
        additional_location: requests.length,
        transfer: 0,
        profile_update: 0,
    };

    const handleApprove = async () => {
        if (!approvingRequest) return;
        setActionLoading(true);
        try {
            await api.approveAdditionalLocationRequest(approvingRequest.id);
            toast(`Request approved successfully`, 'success');
            setApprovingRequest(null);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            const { message } = parseApiError(error as Error);
            toast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectingRequest) return;
        if (!rejectionReason.trim()) {
            toast('Please provide a reason for rejection', 'warning');
            return;
        }
        setActionLoading(true);
        try {
            await api.rejectAdditionalLocationRequest(rejectingRequest.id, rejectionReason);
            toast(`Request rejected`, 'success');
            setRejectingRequest(null);
            setRejectionReason('');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            const { message } = parseApiError(error as Error);
            toast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in duration-500">
            <LocationRequestsHeader 
                filterType={filterType}
                onFilterChange={setFilterType}
                counts={counts}
            />

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20">
                        <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Requests...</p>
                    </div>
                ) : (
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div className="overflow-x-auto flex-1">
                            <LocationRequestsTable
                                requests={filteredRequests}
                                loading={loading}
                                rowsPerPage={rowsPerPage}
                                setRowsPerPage={setRowsPerPage}
                                currentPage={currentPage}
                                setCurrentPage={setCurrentPage}
                                onApprove={setApprovingRequest}
                                onReject={(request) => {
                                    setRejectingRequest(request);
                                    setRejectionReason('');
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <LocationRequestModals
                approvingRequest={approvingRequest}
                rejectingRequest={rejectingRequest}
                rejectionReason={rejectionReason}
                onCloseApproving={() => setApprovingRequest(null)}
                onCloseRejecting={() => {
                    setRejectingRequest(null);
                    setRejectionReason('');
                }}
                onRejectionReasonChange={setRejectionReason}
                onConfirmApprove={handleApprove}
                onConfirmReject={handleReject}
                loading={actionLoading}
            />
        </div>
    );
}
