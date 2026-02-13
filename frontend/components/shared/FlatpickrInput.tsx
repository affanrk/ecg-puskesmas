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
    const inputRef = useRef<HTMLInputElement>(null);
    const fpInstance = useRef<flatpickr.Instance | null>(null);
    const onChangeRef = useRef(onChange);
    const initialValueRef = useRef(value);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (inputRef.current) {
            fpInstance.current = flatpickr(inputRef.current, {
                defaultDate: initialValueRef.current,
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

    useEffect(() => {
        if (fpInstance.current && value) {
            fpInstance.current.setDate(value, false);
        }
    }, [value]);

    useEffect(() => {
        if (fpInstance.current && fpInstance.current.altInput) {
             fpInstance.current.altInput.disabled = disabled;
             const altInput = fpInstance.current.altInput;
             const baseClasses = "w-full px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all duration-300 outline-none";
             const activeClasses = "border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 bg-slate-50/50 focus:bg-white text-slate-800 placeholder:text-slate-400";
             const disabledClasses = "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none";
             const errorClasses = "border-rose-100 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 bg-rose-50/20 text-rose-900 placeholder:text-rose-300";
             altInput.className = baseClasses;
             if (disabled) {
                 altInput.classList.add(...disabledClasses.split(' '));
             } else if (errorMessage) {
                 altInput.classList.add(...errorClasses.split(' '));
             } else {
                 altInput.classList.add(...activeClasses.split(' '));
             }
        }
    }, [disabled, errorMessage]);

    return (
        <div className="relative group w-full space-y-1.5">
            {label && <label className="text-[10px] font-black uppercase tracking-[0.15em] ml-1 text-slate-400 block">{label}</label>}
            <div className="relative">
                <input
                    ref={inputRef}
                    data-fp-original="true" 
                    className="hidden"
                    placeholder={placeholder}
                    disabled={disabled}
                    defaultValue={value}
                />
                <Calendar className={clsx("absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors", errorMessage ? "text-rose-400" : "text-slate-400")} size={16} />
            </div>
            {errorMessage && (
                <div className="flex items-center gap-1.5 mt-1 ml-1 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{errorMessage}</span>
                </div>
            )}
            <style jsx global>{`
                .flatpickr-calendar {
                    z-index: 99999 !important;
                    border-radius: 1rem !important;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                    border: 1px solid #f1f5f9 !important;
                }
                .flatpickr-day.selected {
                    background: #0ea5e9 !important;
                    border-color: #0ea5e9 !important;
                }
            `}</style>
        </div>
    );
}
