'use client';

import { ChangeEvent } from 'react';
import clsx from 'clsx';

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
}

export default function SelectInput({ label, value, onChange, options, disabled = false }: SelectInputProps) {
    return (
        <div className="relative group w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{label}</label>
            <div className="relative">
                <select 
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    className={clsx(
                        "w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:outline-none focus:ring-4 appearance-none",
                        "border-slate-200 focus:border-brand-500 focus:ring-brand-500/10 bg-white text-slate-800 shadow-sm",
                        disabled && "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100 shadow-none"
                    )}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <svg width="8" height="5" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 1L5 5L9 1" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
