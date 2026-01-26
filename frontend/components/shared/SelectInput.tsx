'use client';

import { ChangeEvent } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

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
        <div className="relative group w-full space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] ml-1 text-slate-400">{label}</label>
            <div className="relative">
                <select 
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    className={clsx(
                        "w-full px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all duration-300 outline-none appearance-none",
                        disabled 
                            ? "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none"
                            : "border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 bg-slate-50/50 focus:bg-white text-slate-800"
                    )}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} strokeWidth={3} />
                </div>
            </div>
        </div>
    );
}