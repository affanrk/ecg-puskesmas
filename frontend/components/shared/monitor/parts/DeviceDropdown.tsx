'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { Wifi, WifiOff, ChevronDown, Info, Power, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function DeviceDropdown() {
    const user = useStore(state => state.user);
    const isConnected = useStore(state => state.isConnected);
    const isRecording = useStore(state => state.isRecording);
    const selectedLeadMode = useStore(state => state.selectedLeadMode);
    const wsPendingAction = useStore(state => state.wsPendingAction);
    
    const { devices, currentDeviceId, selectDevice, disconnectDevice } = useDeviceManager();
    const filteredDevices = devices.filter(d => d.lead_mode === selectedLeadMode);
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'switch' | 'disconnect', deviceId?: string } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const initiateSwitch = async (deviceId: string) => {
        if (isRecording) {
            setPendingAction({ type: 'switch', deviceId });
            setShowConfirm(true);
            setIsOpen(false);
        } else {
            selectDevice(deviceId);
            setIsOpen(false);
        }
    };

    const initiateDisconnect = async () => {
        if (isRecording) {
            setPendingAction({ type: 'disconnect' });
            setShowConfirm(true);
            setIsOpen(false);
        } else {
            disconnectDevice();
            setIsOpen(false);
        }
    };

    const confirmAction = async () => {
        if (pendingAction?.type === 'switch' && pendingAction.deviceId) {
            selectDevice(pendingAction.deviceId);
        } else if (pendingAction?.type === 'disconnect') {
            disconnectDevice();
        }
        setShowConfirm(false);
        setPendingAction(null);
    };

    if (!user) return null;

    const isProcessing = wsPendingAction === 'switching' || wsPendingAction === 'disconnecting';

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => !isProcessing && setIsOpen(!isOpen)}
                disabled={isProcessing}
                className={clsx(
                    "flex items-center gap-3 px-3 py-1.5 rounded-md border transition-all duration-200 active:scale-95 min-w-[180px] justify-between cursor-pointer",
                    currentDeviceId 
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-800 hover:bg-emerald-50" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                    isProcessing && "opacity-70 cursor-not-allowed"
                )}
            >
                <div className="flex items-center gap-2.5">
                    {isProcessing ? (
                        <Loader2 size={12} className="animate-spin text-slate-400" />
                    ) : (
                        <div className={clsx(
                            "w-2 h-2 rounded-full ring-2 ring-white",
                            isConnected 
                                ? (currentDeviceId ? "bg-emerald-500 animate-pulse" : "bg-slate-300") 
                                : "bg-rose-400"
                        )}></div>
                    )}
                    <div className="flex flex-col items-start justify-center">
                        <span className="text-[10px] font-black uppercase tracking-wider leading-none truncate max-w-[120px]">
                            {isProcessing ? "Processing..." : (currentDeviceId || "Select Device")}
                        </span>
                    </div>
                </div>
                <ChevronDown size={14} className={clsx("transition-transform duration-200 text-slate-300", isOpen && "rotate-180")} />
            </button>
            {isOpen && !isProcessing && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-[100] animate-in fade-in slide-in-from-bottom-2 overflow-hidden ring-1 ring-black/5">
                    {currentDeviceId && (
                        <div className="px-4 py-4 border-b border-slate-50 bg-emerald-50/30">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                        <Wifi size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{currentDeviceId}</p>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            Signal Stable
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={initiateDisconnect}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-rose-100 text-rose-600 rounded-md text-xs font-bold uppercase tracking-wider hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                                <Power size={14} /> Disconnect Device
                            </button>
                        </div>
                    )}
                    <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Sources</p>
                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md shadow-sm">{filteredDevices.length}</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                        {filteredDevices.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 border border-slate-100 border-dashed">
                                    <WifiOff size={20} />
                                </div>
                                <p className="text-xs text-slate-600 font-bold">No devices found</p>
                                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Ensure the ECG device is powered on and within range.</p>
                            </div>
                        ) : (
                            filteredDevices.map((device) => {
                                const isSelected = currentDeviceId === device.id;
                                if (isSelected) return null;
                                return (
                                    <button
                                        key={device.id}
                                        onClick={() => initiateSwitch(device.id)}
                                        disabled={device.is_locked}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-3 rounded-md transition-all text-left group border border-transparent cursor-pointer",
                                            (device.is_locked)
                                                ? "opacity-60 cursor-not-allowed bg-slate-50/50 grayscale" 
                                                : "hover:bg-slate-50 hover:border-slate-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-9 h-9 rounded-md flex items-center justify-center transition-colors shadow-sm",
                                                "bg-white border border-slate-100 text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-100"
                                            )}>
                                                {device.is_locked ? <XCircle size={16} /> : <Wifi size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">{device.id}</p>
                                                <p className={clsx("text-[10px] font-bold uppercase tracking-wider mt-0.5", device.is_locked ? "text-rose-400" : "text-emerald-500")}>
                                                    {device.is_locked ? "Locked" : "Ready"}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/30">
                        <div className="flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed">
                            <Info size={12} className="shrink-0 mt-0.5 text-blue-400" />
                            <span>Select a device to begin streaming real-time ECG data.</span>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmAction}
                title={pendingAction?.type === 'switch' ? "Switch Device?" : "Disconnect Device?"}
                message={`Recording is currently in progress. ${pendingAction?.type === 'switch' ? 'Switching devices' : 'Disconnecting'} will stop the current recording. Are you sure you want to continue?`}
                confirmText={pendingAction?.type === 'switch' ? "Stop & Switch" : "Stop & Disconnect"}
                isDestructive={true}
                isLoading={isProcessing}
            />
        </div>
    );
}
