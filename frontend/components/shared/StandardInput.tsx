'use client';

import { useState, ChangeEvent } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface InputProps {
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    placeholder?: string;
    required?: boolean;
    errorMessage?: string;
    onFocus?: () => void;
    onBlur?: () => void;
}

export default function StandardInput({
    label,
    value,
    onChange,
    disabled = false,
    type = "text",
    placeholder = "",
    required = false,
    errorMessage,
    onFocus,
    onBlur
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPasswordType = type === "password";
    const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

    const isValidAndFilled = !errorMessage && value && value.toString().trim().length > 0;

    return (
        <div className="relative group w-full space-y-1.5 flex flex-col items-start transition-all duration-300">
            <label className={clsx(
                "text-[10px] font-black uppercase tracking-[0.15em] ml-1 transition-colors duration-300",
                errorMessage ? "text-rose-500" : (isValidAndFilled ? "text-emerald-500" : (isFocused ? "text-brand-600" : "text-slate-400"))
            )}>
                {label}
            </label>
            <div className="relative w-full transition-transform duration-300 origin-bottom hover:scale-[1.01]">
                <input
                    required={required}
                    type={inputType}
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    onFocus={() => { setIsFocused(true); onFocus?.(); }}
                    onBlur={() => { setIsFocused(false); onBlur?.(); }}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full px-4 py-3 rounded-lg border-2 text-xs font-bold transition-all duration-300 outline-none",
                        errorMessage
                            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50 border-rose-100 text-rose-900 placeholder:text-rose-300"
                            : isValidAndFilled
                                ? "border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-emerald-50/30 text-emerald-900"
                                : "border-slate-100/80 hover:border-slate-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 bg-slate-50/50 focus:bg-white text-slate-800 placeholder:text-slate-400 shadow-sm shadow-slate-100/50",
                        disabled && "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none hover:scale-100 placeholder:text-slate-300"
                    )}
                />

                {!isPasswordType && !disabled && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none transition-all duration-300">
                        {errorMessage ? (
                            <AlertCircle size={16} className="text-rose-500 animate-in fade-in zoom-in-50 duration-300" strokeWidth={2.5} />
                        ) : isValidAndFilled ? (
                            <CheckCircle2 size={16} className="text-emerald-500 animate-in fade-in zoom-in-50 duration-300" strokeWidth={2.5} />
                        ) : null}
                    </div>
                )}

                {isPasswordType && !disabled && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
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
