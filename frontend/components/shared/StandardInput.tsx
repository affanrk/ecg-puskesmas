'use client';

import { useState, ChangeEvent } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface InputProps {
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    placeholder?: string;
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
    errorMessage,
    onFocus,
    onBlur
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPasswordType = type === "password";
    const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

    return (
        <div className="relative group w-full space-y-1.5">
            <label className={clsx(
                "text-[10px] font-black uppercase tracking-[0.15em] ml-1 transition-colors duration-300",
                errorMessage ? "text-rose-500" : (isFocused ? "text-brand-600" : "text-slate-400")
            )}>
                {label}
            </label>
            <div className="relative">
                <input 
                    type={inputType} 
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    onFocus={() => { setIsFocused(true); onFocus?.(); }}
                    onBlur={() => { setIsFocused(false); onBlur?.(); }}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all duration-300 outline-none",
                        errorMessage 
                            ? "border-rose-100 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 bg-rose-50/20 text-rose-900 placeholder:text-rose-300" 
                            : "border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 bg-slate-50/50 focus:bg-white text-slate-800 placeholder:text-slate-400",
                        disabled && "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none"
                    )}
                />
                {isPasswordType && !disabled && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors p-1"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
            {errorMessage && (
                <div className="flex items-center gap-1.5 mt-1 ml-1 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{errorMessage}</span>
                </div>
            )}
        </div>
    );
}
