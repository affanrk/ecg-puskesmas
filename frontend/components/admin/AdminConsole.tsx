'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { User } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';
import { 
    ShieldCheck, 
    Search,
    RefreshCcw,
    ListFilter,
    History,
    UserCheck,
    UserX,
    Calendar as CalendarIcon,
    Trash2
} from 'lucide-react';
import clsx from 'clsx';
import ApprovalsQueue from './ApprovalsQueue';
import ApprovalLogs, { ApprovalLog } from './ApprovalLogs';
import UserDetailModal from './UserDetailModal';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface FlatpickrInstance {
    destroy: () => void;
    clear: (triggerChange?: boolean) => void;
    setDate: (date: string | Date | string[] | Date[], triggerChange?: boolean) => void;
}

export default function AdminConsole() {
    const [activeView, setActiveView] = useState<'queue' | 'logs'>('queue');
    const [approvalType, setApprovalType] = useState<'patient' | 'operator' | 'doctor'>('patient');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<ApprovalLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
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

    useEffect(() => {
        if (searchTerm === debouncedSearch) return;
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm, debouncedSearch]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, startDate, endDate, approvalType, activeView]);

    useEffect(() => {
        const currentParams = JSON.stringify({
            debouncedSearch, startDate, endDate, approvalType, activeView, refreshKey
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
                if (activeView === 'queue') {
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
                    showToast(`Failed to load ${activeView}`, "error");
                    lastFetchedRef.current = "";
                }
            } finally {
                if (currentFetchId === fetchIdRef.current) setLoading(false);
            }
        };
        loadData();
    }, [debouncedSearch, startDate, endDate, approvalType, activeView, refreshKey, showToast]);

    useEffect(() => {
        if (dateInputRef.current) {
            fpRef.current = flatpickr(dateInputRef.current, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'j F Y',
                altInputClass: "pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold w-52 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all shadow-sm cursor-pointer placeholder:text-slate-400 text-slate-700",
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

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        if (activeView === 'queue') {
            showToast("Pending list updated", "success");
        } else {
            showToast("Logs updated", "success");
        }
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
            <div className="h-[72px] shrink-0 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 shadow-sm border border-rose-100/50"><ShieldCheck size={22} /></div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Admin Console</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">User Management</p>
                        </div>
                    </div>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl relative w-[260px] h-[40px]">
                        <div 
                            className={clsx(
                                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out z-0",
                                activeView === 'queue' ? "left-1" : "left-[calc(50%+1px)]"
                            )}
                        />
                        <button 
                            onClick={() => setActiveView('queue')} 
                            className={clsx(
                                "flex-1 relative z-10 h-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 px-2", 
                                activeView === 'queue' ? "text-rose-600" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <ListFilter size={14} /> Queue
                        </button>
                        <button 
                            onClick={() => setActiveView('logs')} 
                            className={clsx(
                                "flex-1 relative z-10 h-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 px-2", 
                                activeView === 'logs' ? "text-rose-600" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <History size={14} /> History Logs
                        </button>
                    </div>
                </div>
                <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-md hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-95 shadow-sm flex items-center gap-2">
                    <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
                    <span className="text-[10px] font-black uppercase tracking-widest pr-1">Sync</span>
                </button>
            </div>
            <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/50">
                <div className="flex items-center gap-8 h-full">
                    <button onClick={() => setApprovalType('patient')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center", approvalType === 'patient' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>Patients {approvalType === 'patient' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}</button>
                    <button onClick={() => setApprovalType('operator')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center", approvalType === 'operator' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>Operators {approvalType === 'operator' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}</button>
                    <button onClick={() => setApprovalType('doctor')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center", approvalType === 'doctor' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>Specialists {approvalType === 'doctor' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}</button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={resetFilters} disabled={!isFilterActive} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0", isFilterActive ? "bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 shadow-sm" : "text-slate-300 cursor-not-allowed border border-slate-100")}><Trash2 size={14} /> Reset Filters</button>
                    <div className="relative group/date shrink-0"><CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover/date:text-rose-500 transition-colors pointer-events-none z-10" /><input type="text" ref={dateInputRef} className="hidden" /></div>
                    <div className="relative group"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" /><input type="text" placeholder="Search Name or NIK..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold w-64 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all shadow-sm" /></div>
                </div>
            </div>
            <div className={clsx("flex-1 p-4 lg:p-8 bg-slate-50/30 min-h-0", activeView === 'queue' ? "overflow-y-auto custom-scrollbar" : "flex flex-col overflow-hidden")}>
                {loading && (activeView === 'queue' ? pendingUsers.length === 0 : logs.length === 0) ? (
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
                ) : activeView === 'queue' ? (
                    <ApprovalsQueue users={pendingUsers} searchTerm={searchTerm} dateRange={{ start: startDate, end: endDate }} onApprove={(id, name) => setApprovingUser({ id, name })} onReject={(id, name) => { setRejectingUser({ id, name }); setRejectionReason(''); }} onViewDetails={setSelectedUser} />
                ) : (
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ApprovalLogs logs={logs} rowsPerPage={rowsPerPage} setRowsPerPage={setRowsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                    </div>
                )}
            </div>
            {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onApprove={(id, name) => setApprovingUser({ id, name })} onReject={(id, name) => { setRejectingUser({ id, name }); setRejectionReason(''); }} />}
            {approvingUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setApprovingUser(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"><UserCheck size={28} /></div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Approve User Profile?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">Are you sure you want to approve <span className="font-bold text-slate-700">@{approvingUser.name}</span>? They will be granted full access to the medical dashboard and monitoring features.</p>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <button onClick={() => setApprovingUser(null)} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">Cancel</button>
                            <button onClick={confirmApprove} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20">Approve Now</button>
                        </div>
                    </div>
                </div>
            )}
            {rejectingUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setRejectingUser(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6"><UserX size={28} /></div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Reject User Profile?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">Please provide a clear reason why <span className="font-bold text-slate-700">@{rejectingUser.name}</span> is being rejected. This message will be shown to the user.</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejection Reason</label><span className={clsx("text-[10px] font-bold uppercase", rejectionReason.length >= 90 ? "text-rose-500" : "text-slate-400")}>{rejectionReason.length}/100</span></div>
                                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all min-h-[100px] resize-none" placeholder="e.g. Invalid NIK number, etc." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value.slice(0, 100))} maxLength={100} autoFocus />
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <button onClick={() => setRejectingUser(null)} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">Cancel</button>
                            <button onClick={confirmReject} className="flex-[2] px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-600/20">Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
