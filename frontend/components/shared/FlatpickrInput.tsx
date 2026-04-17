'use client';

import { useRef, useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import clsx from 'clsx';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FlatpickrInputProps {
    value: string;
    onChange: (date: string) => void;
    onBlur?: (date: string) => void;
    disabled?: boolean;
    placeholder?: string;
    label?: string;
    errorMessage?: string;
}

export default function FlatpickrInput({
    value,
    onChange,
    onBlur,
    disabled = false,
    placeholder = "Select Date",
    label,
    errorMessage
}: FlatpickrInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const fpInstance = useRef<flatpickr.Instance | null>(null);
    const onChangeRef = useRef(onChange);
    const onBlurRef = useRef(onBlur);
    const initialValueRef = useRef(value);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onBlurRef.current = onBlur;
    }, [onBlur]);

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
                },
                onClose: (selectedDates, dateStr) => {
                    if (onBlurRef.current) {
                        onBlurRef.current(dateStr);
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
            const altInput = fpInstance.current.altInput;
            const baseClasses = "w-full px-4 py-3 rounded-lg border-2 text-xs font-bold transition-all duration-300 outline-none";
            const disabledClasses = "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none hover:scale-100 placeholder:text-slate-300";
            const errorClasses = "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50 border-rose-100 text-rose-900 placeholder:text-rose-300";
            const isValidAndFilled = !errorMessage && value && value.toString().trim().length > 0;
            const validClasses = "border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-emerald-50/30 text-emerald-900";
            const activeClasses = "border-slate-100/80 hover:border-slate-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 bg-slate-50/50 focus:bg-white text-slate-800 placeholder:text-slate-400 shadow-sm shadow-slate-100/50";

            altInput.className = baseClasses;
            if (disabled) {
                altInput.classList.add(...disabledClasses.split(' '));
            } else if (errorMessage) {
                altInput.classList.add(...errorClasses.split(' '));
            } else if (isValidAndFilled) {
                altInput.classList.add(...validClasses.split(' '));
            } else {
                altInput.classList.add(...activeClasses.split(' '));
            }
        }
    }, [disabled, errorMessage, value]);

    const isValidAndFilled = !errorMessage && value && value.toString().trim().length > 0;

    return (
        <div className="relative group w-full space-y-1.5 flex flex-col items-start transition-all duration-300">
            {label && (
                <label className={clsx(
                    "text-[10px] font-black uppercase tracking-[0.15em] ml-1 transition-colors duration-300 block",
                    errorMessage ? "text-rose-500" : (isValidAndFilled ? "text-emerald-500" : "text-slate-400")
                )}>
                    {label}
                </label>
            )}
            <div className="relative w-full transition-transform duration-300 origin-bottom hover:scale-[1.01]">
                <input
                    ref={inputRef}
                    data-fp-original="true"
                    className="hidden"
                    placeholder={placeholder}
                    disabled={disabled}
                    defaultValue={value}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none transition-all duration-300 gap-2">
                    {errorMessage ? (
                        <AlertCircle size={16} className="text-rose-500 animate-in fade-in zoom-in-50 duration-300" strokeWidth={2.5} />
                    ) : isValidAndFilled ? (
                        <CheckCircle2 size={16} className="text-emerald-500 animate-in fade-in zoom-in-50 duration-300" strokeWidth={2.5} />
                    ) : null}
                    <Calendar className={clsx("transition-colors", errorMessage ? "text-rose-300" : isValidAndFilled ? "text-emerald-300" : "text-slate-400")} size={16} />
                </div>
            </div>

            <div className={clsx("h-4 flex items-start overflow-hidden w-full", errorMessage ? "opacity-100" : "opacity-0")}>
                {errorMessage && (
                    <div className="flex items-center gap-1.5 ml-1 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200 w-full">
                        <AlertCircle size={10} strokeWidth={3} className="shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-wider truncate">{errorMessage}</span>
                    </div>
                )}
            </div>
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
