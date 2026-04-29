'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import { RefreshCcw } from 'lucide-react';

import ApprovalLogs from './parts/ApprovalLogs';
import { ApprovalsComingSoon } from './parts/ApprovalsComingSoon';
import { ApprovalsHeader } from './parts/ApprovalsHeader';
import ApprovalsQueue from './parts/ApprovalsQueue';
import UserActionModals from './parts/UserActionModals';
import UserDetailModal from './parts/UserDetailModal';
import { EVENTS } from '@/config/constants';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';
import { User } from '@/types/user';
import { ApprovalLog } from '@/types/user';

export default function UserApprovals() {
    const adminViewMode = useStore(state => state.adminViewMode);
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [approvalType, setApprovalType] = useState<'patient' | 'operator' | 'doctor'>('patient');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<ApprovalLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        setAdminLoading(loading);
    }, [loading, setAdminLoading]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [queuePage, setQueuePage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [refreshKey, setRefreshKey] = useState(0);
    const [rejectingUser, setRejectingUser] = useState<{ id: string, name: string } | null>(null);
    const [approvingUser, setApprovingUser] = useState<{ id: string, name: string } | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const showToast = useToast((state) => state.show);
    const fetchIdRef = useRef(0);
    const lastFetchedRef = useRef("");

    const isFilterActive = searchTerm !== '' || startDate !== '' || endDate !== '';

    const handleDateRangeChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        showToast(adminViewMode === 'queue' ? "Verification queue updated" : "History logs updated", "success");
    }, [adminViewMode, showToast]);

    useEffect(() => {
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
    }, [handleRefresh]);

    useEffect(() => {
        if (searchTerm === debouncedSearch) return;
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm, debouncedSearch]);

    useEffect(() => {
        setCurrentPage(1);
        setQueuePage(1);
    }, [debouncedSearch, startDate, endDate, approvalType, adminViewMode]);

    useEffect(() => {
        const totalQueuePages = Math.ceil(pendingUsers.length / rowsPerPage) || 1;
        if (queuePage > totalQueuePages) {
            setQueuePage(totalQueuePages);
        }
    }, [pendingUsers.length, rowsPerPage, queuePage]);

    useEffect(() => {
        const totalLogPages = Math.ceil(logs.length / rowsPerPage) || 1;
        if (currentPage > totalLogPages) {
            setCurrentPage(totalLogPages);
        }
    }, [logs.length, rowsPerPage, currentPage]);

    useEffect(() => {
        const currentParams = JSON.stringify({
            debouncedSearch, startDate, endDate, approvalType, adminViewMode, refreshKey
        });
        if (lastFetchedRef.current === currentParams) return;
        const currentFetchId = ++fetchIdRef.current;
        const loadData = async () => {
            setLoading(true);
            lastFetchedRef.current = currentParams;
            try {

                const filters = {
                    search: debouncedSearch,
                    start_date: startDate,
                    end_date: endDate,
                    is_patient: approvalType === 'patient',
                    is_operator: approvalType === 'operator',
                    is_doctor: approvalType === 'doctor',
                };
                let data;
                if (adminViewMode === 'queue') {
                    if (approvalType === 'patient' || approvalType === 'operator') {
                        data = await api.fetchPendingApprovals(filters);
                        if (currentFetchId === fetchIdRef.current) setPendingUsers(data);
                    } else {
                        if (currentFetchId === fetchIdRef.current) setPendingUsers([]);
                    }
                } else {
                    data = await api.fetchApprovalLogs(filters);
                    if (currentFetchId === fetchIdRef.current) setLogs(data);
                }
            } catch (error) {
                if (currentFetchId === fetchIdRef.current) {
                    console.error("Fetch error:", error);
                    showToast(`Failed to load ${adminViewMode}`, "error");
                    lastFetchedRef.current = "";
                }
            } finally {
                if (currentFetchId === fetchIdRef.current) {
                    setLoading(false);
                    setAdminLoading(false);
                }
            }
        };
        loadData();
    }, [debouncedSearch, startDate, endDate, approvalType, adminViewMode, refreshKey, showToast, setAdminLoading]);

    const resetFilters = async () => {
        setIsResetting(true);
        setSearchTerm('');
        setDebouncedSearch('');
        setStartDate('');
        setEndDate('');
        setIsResetting(false);
        showToast("Filters cleared", "success");
    };
    const handleActionSuccess = (userId: string, message: string) => {
        showToast(message, "success");
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        setApprovingUser(null);
        setRejectingUser(null);
        setSelectedUser(null);
    };

    const confirmApprove = async () => {
        if (!approvingUser) return;
        setActionLoading(true);
        try {
            await api.updateUserStatus(approvingUser.id, 'APPROVE');
            handleActionSuccess(approvingUser.id, `User ${approvingUser.name} approved successfully`);
        } catch {
            showToast("Failed to approve user", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const confirmReject = async () => {
        if (!rejectingUser) return;
        if (!rejectionReason.trim()) return showToast("Please provide a reason for rejection", "warning");
        setActionLoading(true);
        try {
            await api.updateUserStatus(rejectingUser.id, 'REJECT', rejectionReason);
            handleActionSuccess(rejectingUser.id, `User ${rejectingUser.name} rejected with reason: ${rejectionReason}`);
        } catch {
            showToast("Failed to reject user", "error");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
            <ApprovalsHeader 
                approvalType={approvalType}
                setApprovalType={setApprovalType}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                startDate={startDate}
                endDate={endDate}
                onDateRangeChange={handleDateRangeChange}
                resetFilters={resetFilters}
                isFilterActive={isFilterActive}
                isResetting={isResetting}
            />

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20">
                        <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Data...</p>
                    </div>
                ) : adminViewMode === 'queue' ? (
                    approvalType === 'doctor' ? (
                        <ApprovalsComingSoon type={approvalType} />
                    ) : (
                        <ApprovalsQueue
                            users={pendingUsers}
                            rowsPerPage={rowsPerPage}
                            setRowsPerPage={setRowsPerPage}
                            currentPage={queuePage}
                            setCurrentPage={setQueuePage}
                            searchTerm={searchTerm}
                            dateRange={{ start: startDate, end: endDate }}
                            onApprove={(id, name) => setApprovingUser({ id, name })}
                            onReject={(id, name) => { setRejectingUser({ id, name }); setRejectionReason(''); }}
                            onViewDetails={setSelectedUser}
                        />
                    )
                ) : (
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ApprovalLogs logs={logs} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                    </div>
                )}
            </div>
            {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onApprove={(id, name) => setApprovingUser({ id, name })} onReject={(id, name) => { setRejectingUser({ id, name }); setRejectionReason(''); }} />}
            <UserActionModals
                approvingUser={approvingUser}
                rejectingUser={rejectingUser}
                rejectionReason={rejectionReason}
                onCloseApproving={() => setApprovingUser(null)}
                onCloseRejecting={() => setRejectingUser(null)}
                onRejectionReasonChange={setRejectionReason}
                onConfirmApprove={confirmApprove}
                onConfirmReject={confirmReject}
                loading={actionLoading}
            />
        </div>
    );
}
