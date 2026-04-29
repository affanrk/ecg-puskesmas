'use client';

import { useState, ChangeEvent } from 'react';

import clsx from 'clsx';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InputProps {
    label?: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    placeholder?: string;
    required?: boolean;
    maxLength?: number;
    errorMessage?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    icon?: React.ReactNode;
    colorTheme?: 'brand' | 'rose' | 'violet';
    className?: string;
}

export default function StandardInput({
    label,
    value,
    onChange,
    disabled = false,
    type = "text",
    placeholder = "",
    required = false,
    maxLength,
    errorMessage,
    onFocus,
    onBlur,
    icon,
    colorTheme = 'brand',
    className = ''
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPasswordType = type === "password";
    const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

    const isValidAndFilled = !errorMessage && value && value.toString().trim().length > 0;

    const themeClasses = {
        brand: "focus:border-brand-400 focus:ring-brand-100",
        rose: "focus:border-rose-500 focus:ring-rose-500/10",
        violet: "focus:border-violet-500 focus:ring-violet-500/10"
    };

    const labelThemeClasses = {
        brand: "text-brand-600",
        rose: "text-rose-600",
        violet: "text-violet-600"
    };

    return (
        <div className={clsx(
            "relative group w-full flex flex-col items-start",
            label ? "space-y-1.5" : ""
        )}>
            {label && (
                <label className={clsx(
                    "text-[10px] font-semibold uppercase tracking-wide ml-0.5 transition-colors",
                    errorMessage ? "text-rose-600" : (isValidAndFilled ? "text-emerald-600" : (isFocused ? labelThemeClasses[colorTheme] : "text-slate-500"))
                )}>
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative w-full">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                        {icon}
                    </div>
                )}
                <input
                    required={required}
                    type={inputType}
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    onFocus={() => { setIsFocused(true); onFocus?.(); }}
                    onBlur={() => { setIsFocused(false); onBlur?.(); }}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={clsx(
                        "w-full rounded-lg border text-sm font-semibold transition-all outline-none",
                        icon ? "pl-9 pr-3.5 py-2.5" : "px-3.5 py-2.5",
                        errorMessage
                            ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-rose-50/50 text-rose-900 placeholder:text-rose-300"
                            : isValidAndFilled
                                ? "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-emerald-50/30 text-slate-900"
                                : `border-slate-200 hover:border-slate-300 focus:ring-2 bg-white text-slate-900 placeholder:text-slate-400 ${themeClasses[colorTheme]}`,
                        disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200 placeholder:text-slate-300",
                        className
                    )}
                />

                {!isPasswordType && !disabled && !icon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                        {errorMessage ? (
                            <AlertCircle size={16} className="text-rose-400" strokeWidth={2} />
                        ) : isValidAndFilled ? (
                            <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={2} />
                        ) : null}
                    </div>
                )}

                {isPasswordType && !disabled && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                    </button>
                )}
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
        </div>
    );
}
