'use client';

import { Bell, AlertTriangle, Clock } from 'lucide-react';
import clsx from 'clsx';
import { AnalysisResult } from '@/types/models';

interface OperatorNotificationsProps {
    notifications: AnalysisResult[];
    loading: boolean;
}

const getClassificationColor = (classification: string) => {
    const l = classification.toLowerCase();
    if (l.includes('sangat')) return 'text-red-600 bg-red-50 border-red-100';
    if (l.includes('berpotensi')) return 'text-orange-600 bg-orange-50 border-orange-100';
    if (l.includes('aritmia') || l.includes('arrhythmia')) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (l === 'abnormal') return 'text-slate-600 bg-slate-50 border-slate-100';
    return 'text-amber-600 bg-amber-50 border-amber-100';
};

const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function OperatorNotifications({ notifications, loading }: OperatorNotificationsProps) {
    return (
        <div className="bg-white flex flex-col overflow-hidden transition-all duration-500 h-full min-h-0">
            <div className="px-8 py-5 border-b border-slate-50 bg-white shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-md flex items-center justify-center border border-amber-100 shadow-sm">
                        <Bell size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-xs 2xl:text-sm tracking-tight italic uppercase">Arrhythmia Alerts</h3>
                        <p className="text-[9px] 2xl:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                            {notifications.length} Patient{notifications.length !== 1 ? 's' : ''} Flagged
                        </p>
                    </div>
                </div>
                {notifications.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-100 rounded-full">
                        <AlertTriangle size={10} className="text-rose-500" />
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{notifications.length}</span>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center opacity-40">
                        <Clock size={32} className="animate-spin text-amber-400" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 opacity-30 py-8">
                        <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <Bell size={22} className="text-slate-300" />
                        </div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">No Arrhythmia Cases</div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {notifications.map((notif, idx) => (
                            <div
                                key={notif.recording_id || idx}
                                className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50/50 transition-colors group animate-in fade-in slide-in-from-top-1 duration-300"
                                style={{ animationDelay: `${idx * 30}ms` }}
                            >
                                <div className={clsx(
                                    "w-2 h-2 rounded-full shrink-0 animate-pulse",
                                    "bg-rose-400"
                                )} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate leading-none">
                                        {notif.patient_name || 'Unknown Patient'}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">
                                        {notif.subject_id || '—'}
                                    </p>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1">
                                    <span className={clsx(
                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                        getClassificationColor(notif.classification || '')
                                    )}>
                                        {notif.classification}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-300 font-mono">
                                        {formatTime(notif.changed_dt || notif.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
