'use client';

import { ChangeEvent } from 'react';
import clsx from 'clsx';
import { ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectInputProps {
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    options: SelectOption[];
    disabled?: boolean;
    errorMessage?: string;
}

export default function SelectInput({ label, value, onChange, options, disabled = false, errorMessage }: SelectInputProps) {
    const isValidAndFilled = !errorMessage && value && value.toString().trim().length > 0;

    return (
        <div className="relative group w-full space-y-1.5 flex flex-col items-start transition-all duration-300">
            <label className={clsx(
                "text-[10px] font-black uppercase tracking-[0.15em] ml-1 transition-colors duration-300",
                errorMessage ? "text-rose-500" : (isValidAndFilled ? "text-emerald-500" : "text-slate-400")
            )}>
                {label}
            </label>
            <div className="relative w-full transition-transform duration-300 origin-bottom hover:scale-[1.01]">
                <select 
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    className={clsx(
                        "w-full px-4 py-3 rounded-lg border-2 text-xs font-bold transition-all duration-300 outline-none appearance-none",
                        disabled 
                            ? "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none"
                            : errorMessage 
                                ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50 border-rose-100 text-rose-900"
                                : isValidAndFilled
                                    ? "border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-emerald-50/30 text-emerald-900"
                                    : "border-slate-100/80 hover:border-slate-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 bg-slate-50/50 focus:bg-white text-slate-800 cursor-pointer shadow-sm shadow-slate-100/50"
                    )}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none transition-all duration-300 gap-2">
                    {errorMessage ? (
                        <AlertCircle size={16} className="text-rose-500 animate-in fade-in zoom-in-50 duration-300" strokeWidth={2.5} />
                    ) : isValidAndFilled ? (
                        <CheckCircle2 size={16} className="text-emerald-500 animate-in fade-in zoom-in-50 duration-300" strokeWidth={2.5} />
                    ) : null}
                    <ChevronDown size={14} strokeWidth={3} className={clsx(errorMessage ? "text-rose-300" : isValidAndFilled ? "text-emerald-300" : "text-slate-400")} />
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
        </div>
    );
}
