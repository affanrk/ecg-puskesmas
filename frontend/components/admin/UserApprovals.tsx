'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { User, useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';
import {
    ShieldCheck,
    RefreshCcw,
    Search,
    Calendar as CalendarIcon,
    Trash2
} from 'lucide-react';
import clsx from 'clsx';
import ApprovalsQueue from './ApprovalsQueue';
import ApprovalLogs, { ApprovalLog } from './ApprovalLogs';
import UserDetailModal from './UserDetailModal';
import UserActionModals from './UserActionModals';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface FlatpickrInstance {
    destroy: () => void;
    clear: (triggerChange?: boolean) => void;
    setDate: (date: string | Date | string[] | Date[], triggerChange?: boolean) => void;
}

import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';

export default function UserApprovals() {
    const { adminViewMode, setAdminLoading } = useStore();
    const [approvalType, setApprovalType] = useState<'patient' | 'operator' | 'doctor'>('patient');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<ApprovalLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Sync local loading to global store
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
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fpRef = useRef<FlatpickrInstance | null>(null);
    const fetchIdRef = useRef(0);
    const lastFetchedRef = useRef("");

    const isFilterActive = searchTerm !== '' || startDate !== '' || endDate !== '';

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
                    is_patient: approvalType === 'patient' ? true : undefined,
                    is_operator: approvalType === 'operator' ? true : undefined,
                    is_doctor: approvalType === 'doctor' ? true : undefined,
                };
                let data;
                if (adminViewMode === 'queue') {
                    if (approvalType === 'patient') {
                        data = await api.fetchPendingApprovals(filters);
                        if (currentFetchId === fetchIdRef.current) setPendingUsers(data);
                    } else {
                        if (currentFetchId === fetchIdRef.current) setPendingUsers([]);
                    }
                } else {
                    data = await api.fetchApprovalLogs(filters);
                    if (currentFetchId === fetchIdRef.current) setLogs(data);
                }
            } catch (error: unknown) {
                if (currentFetchId === fetchIdRef.current) {
                    console.error("Fetch error:", error);
                    showToast(`Failed to load ${adminViewMode}`, "error");
                    lastFetchedRef.current = "";
                }
            } finally {
                if (currentFetchId === fetchIdRef.current) setLoading(false);
            }
        };
        loadData();
    }, [debouncedSearch, startDate, endDate, approvalType, adminViewMode, refreshKey, showToast]);

    useEffect(() => {
        if (dateInputRef.current) {
            fpRef.current = flatpickr(dateInputRef.current, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'j F Y',
                altInputClass: "pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold w-64 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all shadow-sm cursor-pointer placeholder:text-slate-400 text-slate-700",
                onChange: (selectedDates, dateStr) => {
                    if (selectedDates.length === 2) {
                        const [start, end] = dateStr.split(' to ');
                        setStartDate(start);
                        setEndDate(end || start);
                    } else if (selectedDates.length === 0) {
                        setStartDate('');
                        setEndDate('');
                    }
                },
                onReady: (_, __, instance) => {
                    if (instance.altInput) instance.altInput.placeholder = "Select Date Range";
                }
            }) as unknown as FlatpickrInstance;
        }
        return () => fpRef.current?.destroy();
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fpRef.current?.setDate([startDate, endDate], false);
        } else if (!startDate && !endDate) {
            fpRef.current?.clear(false);
        }
    }, [startDate, endDate]);

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setStartDate('');
        setEndDate('');
        if (fpRef.current) fpRef.current.clear(false);
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
        try {
            await api.updateUserStatus(approvingUser.id, 1);
            handleActionSuccess(approvingUser.id, `User ${approvingUser.name} approved successfully`);
        } catch {
            showToast("Failed to approve user", "error");
        }
    };

    const confirmReject = async () => {
        if (!rejectingUser) return;
        if (!rejectionReason.trim()) return showToast("Please provide a reason for rejection", "warning");
        try {
            await api.updateUserStatus(rejectingUser.id, 0, rejectionReason);
            handleActionSuccess(rejectingUser.id, `User ${rejectingUser.name} rejected with reason: ${rejectionReason}`);
        } catch {
            showToast("Failed to reject user", "error");
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
            <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-8 bg-slate-50/50 gap-8">
                <div className="flex items-center gap-6 h-full shrink-0">
                    <button onClick={() => setApprovalType('patient')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center", approvalType === 'patient' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>
                        Patients {approvalType === 'patient' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                    </button>
                    <button onClick={() => setApprovalType('operator')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center", approvalType === 'operator' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>
                        Operators {approvalType === 'operator' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                    </button>
                    <button onClick={() => setApprovalType('doctor')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center", approvalType === 'doctor' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>
                        Specialists {approvalType === 'doctor' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                    </button>
                </div>

                <div className="w-px h-6 bg-slate-200 shrink-0" />

                {/* 2. Filters Zone (Expanded to Right) */}
                <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                    <button onClick={resetFilters} disabled={!isFilterActive} className={clsx("flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0", isFilterActive ? "bg-white border border-rose-200 text-rose-50 text-rose-500 hover:bg-rose-50 shadow-sm" : "text-slate-300 cursor-not-allowed border border-slate-100")}>
                        <Trash2 size={12} /> Reset
                    </button>
                    <div className="relative group/date shrink-0">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                        <input type="text" ref={dateInputRef} className="hidden" />
                    </div>
                    <div className="relative group shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                        <input type="text" placeholder="Search by Name or NIK..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold w-64 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all shadow-sm" />
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                {loading && (adminViewMode === 'queue' ? pendingUsers.length === 0 : logs.length === 0) ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20">
                        <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Data...</p>
                    </div>
                ) : approvalType !== 'patient' ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 animate-in fade-in duration-500">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4"><ShieldCheck size={32} /></div>
                        <h3 className="text-lg font-black text-slate-800">Section Coming Soon</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{approvalType === 'operator' ? "Operator & Nurse" : "Heart Specialist"} module is under development</p>
                    </div>
                ) : adminViewMode === 'queue' ? (
                    <ApprovalsQueue
                        users={pendingUsers}
                        rowsPerPage={rowsPerPage}
                        currentPage={queuePage}
                        setCurrentPage={setQueuePage}
                        searchTerm={searchTerm}
                        dateRange={{ start: startDate, end: endDate }}
                        onApprove={(id, name) => setApprovingUser({ id, name })}
                        onReject={(id, name) => { setRejectingUser({ id, name }); setRejectionReason(''); }}
                        onViewDetails={setSelectedUser}
                    />
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
            />
        </div>
    );
}
