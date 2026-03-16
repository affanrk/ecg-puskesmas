'use client';

import React from 'react';
import { Activity, Square, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import DeviceDropdown from './DeviceDropdown';

interface ECGFooterProps {
    currentDeviceId: string | null;
    isSessionActive: boolean;
    isRecording: boolean;
    wsPendingAction: 'starting' | 'stopping' | 'switching' | 'disconnecting' | null;
    isEnding: boolean;
    onToggleRecording: () => void;
    onReset: () => void;
}

export const ECGFooter = React.memo(function ECGFooter({
    currentDeviceId,
    isSessionActive,
    isRecording,
    wsPendingAction,
    isEnding,
    onToggleRecording,
    onReset
}: ECGFooterProps) {
    const isToggling = wsPendingAction === 'starting' || wsPendingAction === 'stopping';

    return (
        <div className="h-[45px] bg-white border-t border-slate-100 flex items-center px-4 justify-between shrink-0 relative z-20">
            <div className="flex items-center gap-4">
                <DeviceDropdown />
            </div>
            <div className="flex items-center gap-3">
                {(currentDeviceId || isSessionActive) && (
                    <div className="flex items-center gap-2">
                        {!isSessionActive ? (
                            <button
                                onClick={onToggleRecording}
                                disabled={!currentDeviceId || isToggling}
                                className={clsx(
                                    "flex items-center gap-2 px-6 py-1.5 rounded-md text-[10px] font-black shadow-lg transition-all active:scale-95 justify-center uppercase tracking-wider text-white",
                                    (!currentDeviceId || isToggling) ? "bg-slate-300 shadow-none cursor-not-allowed opacity-80" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 cursor-pointer"
                                )}
                            >
                                {isToggling ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                                {isToggling ? "Starting..." : "Start Recording"}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onToggleRecording}
                                    disabled={(!isRecording && !currentDeviceId) || isToggling}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black shadow-lg transition-all active:scale-95 justify-center uppercase tracking-wider text-white",
                                        isToggling ? "opacity-80 cursor-not-allowed bg-slate-400" :
                                        isRecording
                                            ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20 cursor-pointer"
                                            : (!currentDeviceId
                                                ? "bg-slate-300 shadow-none cursor-not-allowed"
                                                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 cursor-pointer")
                                    )}
                                >
                                    {isToggling ? <Loader2 size={12} className="animate-spin" /> : (isRecording ? <Square size={12} fill="currentColor" /> : <Activity size={12} />)}
                                    {wsPendingAction === 'stopping' ? "Stopping..." : (wsPendingAction === 'starting' ? "Processing..." : (isRecording ? "Stop Recording" : "Resume Recording"))}
                                </button>
                                <button
                                    onClick={onReset}
                                    disabled={isRecording || isEnding || wsPendingAction === 'stopping'}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black shadow-lg transition-all active:scale-95 justify-center uppercase tracking-wider text-black",
                                        (isRecording || isEnding || wsPendingAction === 'stopping')
                                            ? "bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100"
                                            : "bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm active:scale-95 cursor-pointer"
                                    )}
                                    title="End Session"
                                >
                                    <XCircle size={12}/> End Session
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
