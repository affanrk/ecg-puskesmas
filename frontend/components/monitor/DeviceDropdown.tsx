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
                    "flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-200 shadow-sm active:scale-95 min-w-[180px] justify-between",
                    currentDeviceId 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
            >
                <div className="flex items-center gap-2.5">
                    <div className={clsx(
                        "w-2.5 h-2.5 rounded-full shadow-sm",
                        isConnected 
                            ? (currentDeviceId ? "bg-emerald-500 animate-pulse" : "bg-slate-300") 
                            : "bg-rose-400"
                    )}></div>
                    
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                            {currentDeviceId ? "Connected to" : "ECG Device"}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider leading-none">
                            {currentDeviceId || "Select Device"}
                        </span>
                    </div>
                </div>
                
                <ChevronDown size={14} className={clsx("transition-transform duration-200 text-slate-400", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2">
                    
                    {/* Active Connection Section */}
                    {currentDeviceId && (
                        <div className="px-4 py-3 border-b border-slate-50 bg-emerald-50/30">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                        <Wifi size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{currentDeviceId}</p>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            Live Stream Active
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={initiateDisconnect}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-50 transition-colors shadow-sm active:scale-95"
                            >
                                <Power size={14} /> Disconnect
                            </button>
                        </div>
                    )}

                    <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Devices</p>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">{devices.length}</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {devices.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                                    <WifiOff size={20} />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">No devices found</p>
                                <p className="text-[10px] text-slate-400 mt-1">Make sure device is turned on</p>
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
                                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group mb-1",
                                            device.is_locked 
                                                ? "opacity-50 cursor-not-allowed bg-slate-50" 
                                                : "hover:bg-slate-50 hover:pl-4"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-sm"
                                            )}>
                                                {device.is_locked ? <XCircle size={14} /> : <Wifi size={14} />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">{device.id}</p>
                                                <p className={clsx("text-[10px] font-medium", device.is_locked ? "text-rose-400" : "text-emerald-500")}>
                                                    {device.is_locked ? "Locked by other user" : "Ready to connect"}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="px-3 pt-2 pb-1 border-t border-slate-50">
                        <div className="flex items-center gap-2 px-2 py-1 text-[9px] text-slate-400">
                            <Info size={10} />
                            <span>Select a device to start monitoring</span>
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