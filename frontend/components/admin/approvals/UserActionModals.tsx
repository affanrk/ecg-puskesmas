'use client';

import { UserCheck, UserX } from 'lucide-react';
import clsx from 'clsx';

interface UserActionModalsProps {
    approvingUser: { id: string, name: string } | null;
    rejectingUser: { id: string, name: string } | null;
    rejectionReason: string;
    onCloseApproving: () => void;
    onCloseRejecting: () => void;
    onRejectionReasonChange: (reason: string) => void;
    onConfirmApprove: () => void;
    onConfirmReject: () => void;
    loading?: boolean;
}

export default function UserActionModals({
    approvingUser,
    rejectingUser,
    rejectionReason,
    onCloseApproving,
    onCloseRejecting,
    onRejectionReasonChange,
    onConfirmApprove,
    onConfirmReject,
    loading = false
}: UserActionModalsProps) {
    return (
        <>
            {approvingUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onCloseApproving} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"><UserCheck size={28} /></div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Approve User Profile?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">Are you sure you want to approve <span className="font-bold text-slate-700">@{approvingUser.name}</span>? They will be granted full access to the medical dashboard and monitoring features.</p>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <button onClick={onCloseApproving} disabled={loading} className="flex-1 px-6 py-3 bg-white border border-slate-200 disabled:opacity-50 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 cursor-pointer">Cancel</button>
                            <button onClick={onConfirmApprove} disabled={loading} className="flex-1 px-6 py-3 bg-emerald-600 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer">
                                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Approve Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rejectingUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onCloseRejecting} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6"><UserX size={28} /></div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Reject User Profile?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">Please provide a clear reason why <span className="font-bold text-slate-700">@{rejectingUser.name}</span> is being rejected. This message will be shown to the user.</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejection Reason</label><span className={clsx("text-[10px] font-bold uppercase", rejectionReason.length >= 90 ? "text-rose-500" : "text-slate-400")}>{rejectionReason.length}/100</span></div>
                                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all min-h-[100px] resize-none" placeholder="e.g. Invalid NIK number, etc." value={rejectionReason} onChange={(e) => onRejectionReasonChange(e.target.value.slice(0, 100))} maxLength={100} autoFocus />
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <button onClick={onCloseRejecting} disabled={loading} className="flex-1 px-6 py-3 bg-white border border-slate-200 disabled:opacity-50 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 cursor-pointer">Cancel</button>
                            <button onClick={onConfirmReject} disabled={loading || !rejectionReason.trim()} className="flex-[2] px-6 py-3 bg-rose-600 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer">
                                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
