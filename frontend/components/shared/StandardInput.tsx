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
}

export default function StandardInput({ 
    label, 
    value, 
    onChange, 
    disabled = false, 
    type = "text", 
    placeholder = "", 
    errorMessage 
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === "password";
    const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

    return (
        <div className="relative group w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{label}</label>
            <div className="relative">
                <input 
                    type={inputType} 
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:outline-none focus:ring-4",
                        errorMessage 
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 bg-rose-50/10 text-rose-900 placeholder:text-rose-300" 
                            : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/10 bg-white text-slate-800 shadow-sm placeholder:text-slate-400",
                        disabled && "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100 shadow-none"
                    )}
                />
                
                {isPasswordType && !disabled && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                )}
            </div>
            
            {errorMessage && (
                <div className="flex items-center gap-1 mt-1 text-rose-500 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={10} />
                    <span className="text-[9px] font-bold">{errorMessage}</span>
                </div>
            )}
        </div>
    );
}
