'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
    UserX
} from 'lucide-react';
import clsx from 'clsx';
import ApprovalsQueue from './ApprovalsQueue';
import ApprovalLogs, { ApprovalLog } from './ApprovalLogs';

export default function AdminConsole() {
    const [activeView, setActiveView] = useState<'queue' | 'logs'>('queue');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<ApprovalLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rejectingUser, setRejectingUser] = useState<{ id: number, name: string } | null>(null);
    const [approvingUser, setApprovingUser] = useState<{ id: number, name: string } | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const { show: toast } = useToast();
    const isFetching = useRef(false);

    const loadData = useCallback(async (showToast = false) => {
        if (isFetching.current) return;
        isFetching.current = true;
        setLoading(true);
        try {
            if (activeView === 'queue') {
                const data = await api.fetchPendingApprovals();
                setPendingUsers(data);
                if (showToast) toast("Pending list updated", "success");
            } else {
                const data = await api.fetchApprovalLogs();
                setLogs(data);
                if (showToast) toast("Logs updated", "success");
            }
        } catch {
            toast(`Failed to load ${activeView}`, "error");
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [toast, activeView]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleApproveClick = (id: number, name: string) => {
        setApprovingUser({ id, name });
    };

    const confirmApprove = async () => {
        if (!approvingUser) return;
        try {
            await api.updateUserStatus(approvingUser.id, 1);
            toast(`User ${approvingUser.name} approved successfully`, "success");
            setPendingUsers(prev => prev.filter(u => u.id !== approvingUser.id));
            setApprovingUser(null);
        } catch {
            toast("Failed to approve user", "error");
        }
    };

    const handleRejectClick = (id: number, name: string) => {
        setRejectingUser({ id, name });
        setRejectionReason('');
    };

    const confirmReject = async () => {
        if (!rejectingUser) return;
        if (!rejectionReason.trim()) {
            toast("Please provide a reason for rejection", "warning");
            return;
        }

        try {
            await api.updateUserStatus(rejectingUser.id, 0, rejectionReason);
            toast(`User ${rejectingUser.name} rejected with reason: ${rejectionReason}`, "success");
            setPendingUsers(prev => prev.filter(u => u.id !== rejectingUser.id));
            setRejectingUser(null);
        } catch {
            toast("Failed to reject user", "error");
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
            <div className="h-[72px] shrink-0 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 shadow-sm border border-rose-100/50">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Admin Console</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">User Management</p>
                        </div>
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveView('queue')}
                            className={clsx(
                                "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                activeView === 'queue' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <ListFilter size={14} /> Queue
                        </button>
                        <button 
                            onClick={() => setActiveView('logs')}
                            className={clsx(
                                "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                activeView === 'logs' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <History size={14} /> History Logs
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder={activeView === 'queue' ? "Search queue..." : "Search logs..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold w-64 focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => loadData(true)}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-md hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
                    >
                        <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50/30">
                {loading && (activeView === 'queue' ? pendingUsers.length === 0 : logs.length === 0) ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20">
                        <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading {activeView}...</p>
                    </div>
                ) : activeView === 'queue' ? (
                    <ApprovalsQueue 
                        users={pendingUsers} 
                        searchTerm={searchTerm} 
                        onApprove={handleApproveClick} 
                        onReject={handleRejectClick} 
                    />
                ) : (
                    <ApprovalLogs logs={logs} searchTerm={searchTerm} />
                )}
            </div>

            {/* Approval Modal */}
            {approvingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setApprovingUser(null)} />
                    
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                                <UserCheck size={28} />
                            </div>
                            
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Approve User Profile?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                                Are you sure you want to approve <span className="font-bold text-slate-700">@{approvingUser.name}</span>? They will be granted full access to the medical dashboard and monitoring features.
                            </p>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <button 
                                onClick={() => setApprovingUser(null)}
                                className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmApprove}
                                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
                            >
                                Approve Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setRejectingUser(null)} />
                    
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                                <UserX size={28} />
                            </div>
                            
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Reject User Profile?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                                Please provide a clear reason why <span className="font-bold text-slate-700">@{rejectingUser.name}</span> is being rejected. This message will be shown to the user.
                            </p>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rejection Reason</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all min-h-[120px] resize-none"
                                    placeholder="e.g. Invalid NIK number, Full name does not match ID, etc."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <button 
                                onClick={() => setRejectingUser(null)}
                                className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmReject}
                                className="flex-[2] px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-600/20"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
