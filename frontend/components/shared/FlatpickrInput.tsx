'use client';

import { useRef, useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import clsx from 'clsx';
import { Calendar, AlertCircle } from 'lucide-react';

interface FlatpickrInputProps {
    value: string;
    onChange: (date: string) => void;
    disabled?: boolean;
    placeholder?: string;
    label?: string;
    errorMessage?: string;
}

export default function FlatpickrInput({ 
    value, 
    onChange, 
    disabled = false, 
    placeholder = "Select Date",
    label,
    errorMessage
}: FlatpickrInputProps) {
    // 1. Refs
    const inputRef = useRef<HTMLInputElement>(null);
    const fpInstance = useRef<flatpickr.Instance | null>(null);
    const onChangeRef = useRef(onChange);

    // 2. Effects
    
    // Sync onChange callback ref
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Init & Destroy
    useEffect(() => {
        if (inputRef.current) {
            fpInstance.current = flatpickr(inputRef.current, {
                defaultDate: value,
                dateFormat: "Y-m-d", 
                altInput: true,
                altFormat: "j F Y",
                disableMobile: true,
                allowInput: true,
                onChange: (selectedDates, dateStr) => {
                    if (onChangeRef.current) {
                        onChangeRef.current(dateStr);
                    }
                }
            });
        }

        return () => {
            if (fpInstance.current) {
                fpInstance.current.destroy();
                fpInstance.current = null;
            }
        };
    }, []);

    // Update Value
    useEffect(() => {
        if (fpInstance.current && value) {
            // Only update if strictly necessary to avoid thrashing
            fpInstance.current.setDate(value, false);
        }
    }, [value]);

    // Update Disabled State
    useEffect(() => {
        if (fpInstance.current && fpInstance.current.altInput) {
             fpInstance.current.altInput.disabled = disabled;
             // Also toggle background class for visual feedback
             if (disabled) {
                 fpInstance.current.altInput.classList.add('bg-slate-50', 'cursor-not-allowed');
                 fpInstance.current.altInput.classList.remove('bg-white');
             } else {
                 fpInstance.current.altInput.classList.remove('bg-slate-50', 'cursor-not-allowed');
                 fpInstance.current.altInput.classList.add('bg-white');
             }
        }
    }, [disabled]);

    // Update Error State for Alt Input
    useEffect(() => {
        if (fpInstance.current && fpInstance.current.altInput) {
             const altInput = fpInstance.current.altInput;
             if (errorMessage) {
                 altInput.classList.add('border-rose-300', 'focus:border-rose-500', 'focus:ring-rose-500/10', 'bg-rose-50/10', 'text-rose-900');
                 altInput.classList.remove('border-slate-200', 'focus:border-brand-500', 'focus:ring-brand-500/10', 'bg-white', 'text-slate-800');
             } else {
                 altInput.classList.remove('border-rose-300', 'focus:border-rose-500', 'focus:ring-rose-500/10', 'bg-rose-50/10', 'text-rose-900');
                 altInput.classList.add('border-slate-200', 'focus:border-brand-500', 'focus:ring-brand-500/10', 'bg-white', 'text-slate-800');
             }
        }
    }, [errorMessage]);

    return (
        <div className="relative group w-full flatpickr-wrapper">
            {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{label}</label>}
            <div className="relative">
                {/* 
                    We use a data attribute 'data-fp-original' to target this specific input in CSS.
                    We intentionally do NOT pass 'type="hidden"' here to let React render a standard input,
                    but we hide it via CSS so even if React forces type="text", it stays invisible.
                */}
                <input
                    ref={inputRef}
                    data-fp-original="true" 
                    className={clsx(
                        "w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:outline-none focus:ring-4",
                        errorMessage 
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 bg-rose-50/10 text-rose-900" 
                            : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/10 bg-white text-slate-800 shadow-sm",
                        disabled && "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100 shadow-none"
                    )}
                    placeholder={placeholder}
                    disabled={disabled}
                    defaultValue={value}
                />
                <Calendar className={clsx("absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors", errorMessage ? "text-rose-400" : "text-slate-400")} size={14} />
            </div>
            {errorMessage && (
                <div className="flex items-center gap-1 mt-1 text-rose-500 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={10} />
                    <span className="text-[9px] font-bold">{errorMessage}</span>
                </div>
            )}
            
            <style jsx global>{`
                .flatpickr-calendar {
                    z-index: 99999 !important;
                }
                /* Hide the original input that React tries to control */
                input[data-fp-original="true"] {
                    display: none !important;
                }
                /* Ensure Alt Input (created by Flatpickr) inherits styles roughly or looks good */
                .flatpickr-input[readonly] {
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}