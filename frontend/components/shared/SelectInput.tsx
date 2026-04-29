'use client';

import { ChangeEvent, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, AlertCircle, CheckCircle2, Search, X } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
}

interface SelectInputProps {
    label: string;
    value: string | string[];
    onChange: (e: ChangeEvent<HTMLSelectElement> | { target: { value: string } }) => void;
    options: SelectOption[];
    disabled?: boolean;
    required?: boolean;
    errorMessage?: string;
    searchable?: boolean;
    mode?: 'single' | 'multi';
    placeholder?: string;
    onMultiChange?: (values: string[]) => void;
    colorTheme?: 'brand' | 'rose' | 'violet';
    className?: string;
}

export default function SelectInput({ 
    label, 
    value, 
    onChange, 
    options, 
    disabled = false, 
    required = false, 
    errorMessage,
    searchable = true,
    mode = 'single',
    placeholder,
    onMultiChange,
    colorTheme = 'brand',
    className = ''
}: SelectInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [positionReady, setPositionReady] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    
    const mounted = typeof window !== 'undefined';
    
    const useCustomDropdown = searchable || mode === 'multi';
    
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const isValidAndFilled = !errorMessage && selectedValues.length > 0;
    
    const themeClasses = {
        brand: {
            border: "focus:border-brand-400 focus:ring-brand-500/10",
            text: "text-brand-600",
            checkbox: "text-brand-600 focus:ring-brand-500",
            search: "focus:ring-brand-500/20 focus:border-brand-500"
        },
        rose: {
            border: "focus:border-rose-500 focus:ring-rose-500/10",
            text: "text-rose-600",
            checkbox: "text-rose-600 focus:ring-rose-500",
            search: "focus:ring-rose-500/20 focus:border-rose-500"
        },
        violet: {
            border: "focus:border-violet-400 focus:ring-violet-500/10",
            text: "text-violet-600",
            checkbox: "text-violet-600 focus:ring-violet-500",
            search: "focus:ring-violet-500/20 focus:border-violet-500"
        }
    };
    
    const theme = themeClasses[colorTheme];
    
    useEffect(() => {
        if (isOpen && triggerRef.current && useCustomDropdown) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
            setPositionReady(true);
        } else {
            setPositionReady(false);
        }
    }, [isOpen, useCustomDropdown]);
    
    useEffect(() => {
        if (!isOpen || !useCustomDropdown) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (
                panelRef.current &&
                !panelRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, useCustomDropdown]);
    
    const filteredOptions = searchTerm
        ? options.filter(opt => 
            opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opt.value.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : options;
    
    const handleOptionClick = (optionValue: string) => {
        if (mode === 'single') {
            onChange({ target: { value: optionValue } } as React.ChangeEvent<HTMLSelectElement>);
            setIsOpen(false);
            setSearchTerm('');
        } else {
            const newValues = selectedValues.includes(optionValue)
                ? selectedValues.filter(v => v !== optionValue)
                : [...selectedValues, optionValue];
            if (onMultiChange) {
                onMultiChange(newValues);
            }
        }
    };
    
    const getDisplayText = () => {
        if (selectedValues.length === 0) {
            return placeholder || 'Select...';
        }
        if (mode === 'single') {
            const selected = options.find(opt => opt.value === selectedValues[0]);
            return selected?.label || placeholder || 'Select...';
        }
        return `${selectedValues.length} selected`;
    };
    
    const isShowingPlaceholder = selectedValues.length === 0 || (mode === 'single' && selectedValues[0] === '');
    
    if (!useCustomDropdown) {
        return (
            <div className="relative group w-full space-y-1.5 flex flex-col items-start transition-all duration-300">
                <label className={clsx(
                    "text-[10px] font-black uppercase tracking-[0.15em] ml-1 transition-colors duration-300",
                    errorMessage ? "text-rose-500" : (isValidAndFilled ? "text-emerald-500" : "text-slate-400")
                )}>
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <div className="relative w-full transition-transform duration-300 origin-bottom hover:scale-[1.01]">
                    <select 
                        required={required}
                        disabled={disabled}
                        value={value as string}
                        onChange={onChange as (e: ChangeEvent<HTMLSelectElement>) => void}
                        className={clsx(
                            "w-full px-4 py-3 rounded-lg border-2 text-xs font-bold transition-all duration-300 outline-none appearance-none",
                            disabled 
                                ? "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none"
                                : errorMessage 
                                    ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50 border-rose-100 text-rose-900"
                                    : isValidAndFilled
                                        ? "border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-emerald-50/30 text-emerald-900"
                                        : `border-slate-100/80 hover:border-slate-200 focus:ring-4 bg-slate-50/50 focus:bg-white text-slate-800 cursor-pointer shadow-sm shadow-slate-100/50 ${theme.border}`
                        )}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
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
    
    const customPanel = isOpen && mounted && positionReady ? createPortal(
        <div
            ref={panelRef}
            style={{
                position: 'absolute',
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${position.width}px`,
                zIndex: 99999,
                maxHeight: 'min(400px, calc(100vh - ' + position.top + 'px - 20px))',
            }}
            className="bg-white rounded-lg shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col"
        >
            <div className="px-3 pb-2 border-b border-slate-100 shrink-0">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        autoFocus
                        className={clsx(
                            "w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2",
                            theme.search
                        )}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter' && filteredOptions.length > 0) {
                                handleOptionClick(filteredOptions[0].value);
                            }
                        }}
                    />
                </div>
            </div>
            
            {mode === 'multi' && selectedValues.length > 0 && (
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-xs font-medium text-slate-500">
                        {selectedValues.length} selected
                    </span>
                    <button
                        onClick={() => onMultiChange && onMultiChange([])}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                    >
                        <X size={12} /> Clear all
                    </button>
                </div>
            )}
            
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden select-dropdown-scroll" style={{ maxHeight: '240px' }}>
                {filteredOptions.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-slate-400">
                        No options found
                    </div>
                ) : (
                    filteredOptions.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        const isInactive = option.label.includes('(Inactive)');
                        const isDefaultOption = option.value === '' || option.label.startsWith('All ');
                        return (
                            <div
                                key={option.value}
                                onClick={() => !option.disabled && handleOptionClick(option.value)}
                                className={clsx(
                                    'w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2',
                                    !option.disabled && 'cursor-pointer',
                                    isSelected && (colorTheme === 'rose' ? 'bg-rose-50' : colorTheme === 'brand' ? 'bg-brand-50' : 'bg-violet-50'),
                                    option.disabled && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                {mode === 'multi' && (
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className={clsx(
                                            "w-4 h-4 border-slate-300 rounded focus:ring-2",
                                            theme.checkbox
                                        )}
                                        disabled={option.disabled}
                                    />
                                )}
                                <div className="flex-1">
                                    <div className={clsx(
                                        'font-medium',
                                        isSelected && mode === 'single' && theme.text,
                                        isInactive && !isSelected && 'text-slate-400',
                                        isDefaultOption && !isSelected && 'text-slate-500 font-normal italic'
                                    )}>
                                        {option.label}
                                    </div>
                                    {option.description && (
                                        <div className={clsx(
                                            'text-xs mt-0.5',
                                            isInactive ? 'text-slate-400' : 'text-slate-500'
                                        )}>
                                            {option.description}
                                        </div>
                                    )}
                                </div>
                                {mode === 'single' && isSelected && (
                                    <CheckCircle2 size={16} className={theme.text} strokeWidth={3} />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>,
        document.body
    ) : null;
    
    return (
        <div className={clsx(
            "relative group w-full flex flex-col items-start transition-all duration-300",
            label ? "space-y-1.5" : ""
        )}>
            {label && (
                <label className={clsx(
                    "text-[10px] font-black uppercase tracking-[0.15em] ml-1 transition-colors duration-300",
                    errorMessage ? "text-rose-500" : (isValidAndFilled ? "text-emerald-500" : "text-slate-400")
                )}>
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative w-full transition-transform duration-300 origin-bottom hover:scale-[1.01]">
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={clsx(
                        "w-full px-4 py-3 rounded-lg border-2 text-xs font-bold transition-all duration-300 outline-none text-left flex items-center justify-between",
                        disabled 
                            ? "bg-slate-100/50 text-slate-400 cursor-not-allowed border-transparent shadow-none"
                            : errorMessage 
                                ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50 text-rose-900"
                                : isValidAndFilled
                                    ? "border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-emerald-50/30 text-emerald-900"
                                    : `border-slate-100/80 hover:border-slate-200 focus:ring-4 bg-slate-50/50 focus:bg-white text-slate-800 cursor-pointer shadow-sm shadow-slate-100/50 ${theme.border}`,
                        className
                    )}
                >
                    <span className={clsx(
                        'truncate',
                        isShowingPlaceholder && 'text-slate-400 font-medium'
                    )}>
                        {getDisplayText()}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        {errorMessage ? (
                            <AlertCircle size={16} className="text-rose-500" strokeWidth={2.5} />
                        ) : isValidAndFilled ? (
                            <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={2.5} />
                        ) : null}
                        <ChevronDown 
                            size={14} 
                            strokeWidth={3} 
                            className={clsx(
                                'transition-transform duration-300',
                                isOpen && 'rotate-180',
                                errorMessage ? "text-rose-300" : isValidAndFilled ? "text-emerald-300" : "text-slate-400"
                            )} 
                        />
                    </div>
                </button>
            </div>
            {label && (
                <div className={clsx("h-4 flex items-start overflow-hidden w-full", errorMessage ? "opacity-100" : "opacity-0")}>
                    {errorMessage && (
                        <div className="flex items-center gap-1.5 ml-1 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200 w-full">
                            <AlertCircle size={10} strokeWidth={3} className="shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-wider truncate">{errorMessage}</span>
                        </div>
                    )}
                </div>
            )}
            {customPanel}
        </div>
    );
}
