'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { Wifi, WifiOff, ChevronDown, Info, Power, XCircle } from 'lucide-react';
import clsx from 'clsx';

export default function DeviceDropdown() {
    // 1. Hooks, State & Refs
    const { user, isConnected, isRecording } = useStore();
    const { devices, currentDeviceId, selectDevice, disconnectDevice } = useDeviceManager();
    const [isOpen, setIsOpen] = useState(false);
    
    // Confirmation State
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'switch' | 'disconnect', deviceId?: string } | null>(null);
    
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 2. Effects
    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 3. Handlers
    const initiateSwitch = (deviceId: string) => {
        if (isRecording) {
            setPendingAction({ type: 'switch', deviceId });
            setShowConfirm(true);
            setIsOpen(false);
        } else {
            selectDevice(deviceId);
            setIsOpen(false);
        }
    };

    const initiateDisconnect = () => {
        if (isRecording) {
            setPendingAction({ type: 'disconnect' });
            setShowConfirm(true);
            setIsOpen(false);
        } else {
            disconnectDevice();
            setIsOpen(false);
        }
    };

    const confirmAction = () => {
        if (pendingAction?.type === 'switch' && pendingAction.deviceId) {
            selectDevice(pendingAction.deviceId);
        } else if (pendingAction?.type === 'disconnect') {
            disconnectDevice();
        }
        setShowConfirm(false);
        setPendingAction(null);
    };

    // 4. Render
    // Hide if profile is not complete
    if (!user || !user.is_patient) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 shadow-sm active:scale-95 min-w-[200px] justify-between",
                    currentDeviceId 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-300" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white",
                        isConnected 
                            ? (currentDeviceId ? "bg-emerald-500 animate-pulse" : "bg-slate-300") 
                            : "bg-rose-400"
                    )}></div>
                    
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                            {currentDeviceId ? "Device Connected" : "No Device"}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider leading-none truncate max-w-[120px]">
                            {currentDeviceId || "Select Source"}
                        </span>
                    </div>
                </div>
                
                <ChevronDown size={16} className={clsx("transition-transform duration-200 text-slate-400", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 overflow-hidden ring-1 ring-black/5">
                    
                    {/* Active Connection Section */}
                    {currentDeviceId && (
                        <div className="px-4 py-4 border-b border-slate-50 bg-emerald-50/30">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
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
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm active:scale-95"
                            >
                                <Power size={14} /> Disconnect Device
                            </button>
                        </div>
                    )}

                    <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Sources</p>
                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md shadow-sm">{devices.length}</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                        {devices.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 border border-slate-100 border-dashed">
                                    <WifiOff size={20} />
                                </div>
                                <p className="text-xs text-slate-600 font-bold">No devices found</p>
                                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Ensure the ECG device is powered on and within range.</p>
                            </div>
                        ) : (
                            devices.map((device) => {
                                const isSelected = currentDeviceId === device.id;
                                if (isSelected) return null; // Skip active one (shown at top)

                                return (
                                    <button
                                        key={device.id}
                                        onClick={() => initiateSwitch(device.id)}
                                        disabled={device.is_locked}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all text-left group border border-transparent",
                                            device.is_locked 
                                                ? "opacity-60 cursor-not-allowed bg-slate-50/50 grayscale" 
                                                : "hover:bg-slate-50 hover:border-slate-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm",
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
            />
        </div>
    );
}