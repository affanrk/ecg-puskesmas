'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { ChevronDown, Search, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/hooks/useToast';

export default function DeviceDropdown() {
    const { devices, currentDeviceId, selectDevice, disconnectDevice } = useDeviceManager();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { show: toast } = useToast();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredDevices = devices.filter(d => 
        d.id.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    const handleSelect = (deviceId: string, isLocked: boolean) => {
        if (isLocked && deviceId !== currentDeviceId) {
            toast(`Device ${deviceId} is currently BUSY`, "warning");
            return;
        }
        selectDevice(deviceId);
        toast(`Connecting to ${deviceId}...`, "success");
        setIsOpen(false);
        setSearch('');
    };

    const handleDisconnect = () => {
        if (currentDeviceId) {
            disconnectDevice();
            toast(`Disconnected from ${currentDeviceId}`, "warning");
        }
        setIsOpen(false);
    };

    return (
        <div className="relative w-56" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-3 py-2 flex items-center justify-between transition-all active:scale-95 duration-75 uppercase tracking-wider"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className={clsx(
                        "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]",
                        currentDeviceId ? "bg-emerald-500" : "bg-slate-300 shadow-none"
                    )}></div>
                    <span className={clsx("truncate", currentDeviceId ? "text-brand-700" : "text-slate-400")}>
                        {currentDeviceId || "Select Device"}
                    </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl ring-1 ring-black/5 z-[100] overflow-hidden transform origin-top animate-in fade-in zoom-in duration-150">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-xs pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto custom-scrollbar bg-white">
                        {filteredDevices.length === 0 ? (
                            <div className="p-4 text-[11px] text-slate-400 text-center italic font-medium">No available hardware</div>
                        ) : (
                            filteredDevices.map(d => {
                                const isSelected = d.id === currentDeviceId;
                                const isBusy = d.is_locked && !isSelected;

                                return (
                                    <div 
                                        key={d.id}
                                        onClick={() => handleSelect(d.id, d.is_locked)}
                                        className={clsx(
                                            "px-4 py-3 border-b border-slate-50 flex justify-between items-center cursor-pointer transition-colors",
                                            isSelected ? "bg-brand-50" : "hover:bg-slate-50",
                                            isBusy && "opacity-60 cursor-not-allowed bg-slate-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-2 h-2 rounded-full",
                                                isSelected ? "bg-brand-500" : (isBusy ? "bg-slate-300" : "bg-emerald-400")
                                            )}></div>
                                            <span className="text-[11px] font-bold text-slate-700 tracking-tight uppercase">{d.id}</span>
                                        </div>
                                        {isSelected && <span className="text-[9px] font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded border border-brand-200 tracking-widest uppercase">Active</span>}
                                        {isBusy && <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Occupied</span>}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                        <button 
                            onClick={handleDisconnect}
                            className="flex items-center justify-center gap-2 text-[10px] text-rose-600 hover:text-white hover:bg-rose-500 font-bold w-full py-2 rounded-lg transition-all uppercase tracking-widest active:scale-95"
                        >
                            <XCircle className="w-3 h-3" />
                            Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
