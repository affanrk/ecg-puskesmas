'use client';

import { useRef, useEffect } from 'react';

import clsx from 'clsx';
import flatpickr from 'flatpickr';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

import 'flatpickr/dist/flatpickr.min.css';

interface FlatpickrInputProps {
    value: string;
    onChange: (date: string) => void;
    onBlur?: (date: string) => void;
    disabled?: boolean;
    placeholder?: string;
    label?: string;
    required?: boolean;
    errorMessage?: string;
    mode?: 'single' | 'range';
    onRangeChange?: (startDate: string, endDate: string) => void;
    colorTheme?: 'brand' | 'rose' | 'violet';
}

export default function FlatpickrInput({
    value,
    onChange,
    onBlur,
    disabled = false,
    placeholder = "Select Date",
    label,
    required = false,
    errorMessage,
    mode = 'single',
    onRangeChange,
    colorTheme = 'brand'
}: FlatpickrInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const fpInstance = useRef<flatpickr.Instance | null>(null);
    const onChangeRef = useRef(onChange);
    const onBlurRef = useRef(onBlur);
    const onRangeChangeRef = useRef(onRangeChange);
    const initialValueRef = useRef(value);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onBlurRef.current = onBlur;
    }, [onBlur]);

    useEffect(() => {
        onRangeChangeRef.current = onRangeChange;
    }, [onRangeChange]);

    useEffect(() => {
        if (inputRef.current) {
            fpInstance.current = flatpickr(inputRef.current, {
                mode: mode === 'range' ? 'range' : 'single',
                defaultDate: initialValueRef.current,
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: mode === 'range' ? "j F Y" : "j F Y",
                disableMobile: true,
                allowInput: true,
                onChange: (selectedDates, dateStr) => {
                    if (mode === 'range' && onRangeChangeRef.current && selectedDates.length === 2) {
                        const [start, end] = dateStr.split(' to ');
                        onRangeChangeRef.current(start, end || start);
                    } else if (onChangeRef.current) {
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
    }, [mode]);

    useEffect(() => {
        if (fpInstance.current && value) {
            fpInstance.current.setDate(value, false);
        }
    }, [value]);

    useEffect(() => {
        if (fpInstance.current && fpInstance.current.altInput) {
            const altInput = fpInstance.current.altInput;
            const baseClasses = "w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all outline-none font-semibold";
            const disabledClasses = "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200 placeholder:text-slate-300";
            const errorClasses = "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-rose-50/50 text-rose-900 placeholder:text-rose-300";
            const isValidAndFilled = !errorMessage && value && value.toString().trim().length > 0;
            const validClasses = "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-emerald-50/30 text-slate-900";
            
            const themeClasses = {
                brand: "border-slate-200 hover:border-slate-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-white text-slate-900 placeholder:text-slate-400",
                rose: "border-slate-200 hover:border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 bg-white text-slate-900 placeholder:text-slate-400",
                violet: "border-slate-200 hover:border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 bg-white text-slate-900 placeholder:text-slate-400"
            };
            const activeClasses = themeClasses[colorTheme];

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
    }, [disabled, errorMessage, value, colorTheme]);

    const isValidAndFilled = !errorMessage && value && value.toString().trim().length > 0;

    return (
        <div className={clsx(
            "relative group w-full flex flex-col items-start",
            label ? "space-y-1.5" : ""
        )}>
            {label && (
                <label className={clsx(
                    "text-[10px] font-semibold uppercase tracking-wide ml-0.5 transition-colors block",
                    errorMessage ? "text-rose-600" : (isValidAndFilled ? "text-emerald-600" : "text-slate-500")
                )}>
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative w-full">
                <input
                    ref={inputRef}
                    data-fp-original="true"
                    className="hidden"
                    placeholder={placeholder}
                    disabled={disabled}
                    defaultValue={value}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none gap-2">
                    {errorMessage ? (
                        <AlertCircle size={16} className="text-rose-400" strokeWidth={2} />
                    ) : isValidAndFilled ? (
                        <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={2} />
                    ) : null}
                    <Calendar className={clsx("transition-colors", errorMessage ? "text-rose-300" : isValidAndFilled ? "text-emerald-400" : "text-slate-400")} size={16} strokeWidth={2} />
                </div>
            </div>

            {label && (
                <div className={clsx("h-4 flex items-start overflow-hidden w-full", errorMessage ? "opacity-100" : "opacity-0")}>
                    {errorMessage && (
                        <div className="flex items-center gap-1.5 ml-0.5 text-rose-600 w-full">
                            <AlertCircle size={10} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                            <span className="text-[10px] font-medium truncate">{errorMessage}</span>
                        </div>
                    )}
                </div>
            )}
            <style jsx global>{`
                .flatpickr-calendar {
                    z-index: 99999 !important;
                    border-radius: 0.75rem !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                    border: 1px solid #e2e8f0 !important;
                }
                .flatpickr-day.selected {
                    background: ${colorTheme === 'rose' ? '#f43f5e' : colorTheme === 'violet' ? '#8b5cf6' : '#0ea5e9'} !important;
                    border-color: ${colorTheme === 'rose' ? '#f43f5e' : colorTheme === 'violet' ? '#8b5cf6' : '#0ea5e9'} !important;
                }
                .flatpickr-day.selected:hover {
                    background: ${colorTheme === 'rose' ? '#e11d48' : colorTheme === 'violet' ? '#7c3aed' : '#0284c7'} !important;
                    border-color: ${colorTheme === 'rose' ? '#e11d48' : colorTheme === 'violet' ? '#7c3aed' : '#0284c7'} !important;
                }
                .flatpickr-day:hover {
                    background: #f1f5f9 !important;
                    border-color: #e2e8f0 !important;
                }
                .flatpickr-day.inRange {
                    background: ${colorTheme === 'rose' ? '#ffe4e6' : colorTheme === 'violet' ? '#ede9fe' : '#e0f2fe'} !important;
                    border-color: ${colorTheme === 'rose' ? '#fecdd3' : colorTheme === 'violet' ? '#ddd6fe' : '#bae6fd'} !important;
                    box-shadow: none !important;
                }
            `}</style>
        </div>
    );
}
