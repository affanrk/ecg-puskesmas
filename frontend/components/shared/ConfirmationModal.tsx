'use client';

import { ReactNode } from 'react';

import clsx from 'clsx';
import { AlertTriangle, Check } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: ReactNode;
    confirmText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    warningLevel?: 'standard' | 'high';
    affectedItems?: string[];
    icon?: ReactNode;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    isDestructive = false,
    isLoading = false,
    warningLevel = 'standard',
    affectedItems,
    icon
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const isHighWarning = warningLevel === 'high';
    const iconSize = isHighWarning ? 40 : 28;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={clsx(
                "bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col items-center",
                isHighWarning && isDestructive && "ring-2 ring-rose-500/20"
            )}>
                <div className="p-6 text-center w-full flex flex-col items-center">
                    <div className={clsx(
                        "rounded-full flex items-center justify-center mb-4 shrink-0 transition-all",
                        isHighWarning ? "w-20 h-20 animate-pulse" : "w-14 h-14",
                        isDestructive 
                            ? isHighWarning 
                                ? "bg-rose-100 text-rose-600 ring-8 ring-rose-50 shadow-lg shadow-rose-500/20" 
                                : "bg-rose-100 text-rose-600"
                            : "bg-amber-100 text-amber-600"
                    )}>
                        {icon || <AlertTriangle size={iconSize} strokeWidth={isHighWarning ? 2.5 : 2} />}
                    </div>
                    <h3 className={clsx(
                        "font-black text-slate-800 mb-2",
                        isHighWarning ? "text-2xl" : "text-xl"
                    )}>{title}</h3>
                    <div className={clsx(
                        "text-slate-500 leading-relaxed mb-4 px-2 w-full text-center",
                        isHighWarning ? "text-base font-medium" : "text-sm"
                    )}>
                        {message}
                    </div>
                    
                    {affectedItems && affectedItems.length > 0 && (
                        <div className="w-full mb-6 px-4">
                            <div className={clsx(
                                "rounded-lg p-4 text-left",
                                isDestructive 
                                    ? "bg-rose-50 border border-rose-200" 
                                    : "bg-amber-50 border border-amber-200"
                            )}>
                                <p className={clsx(
                                    "text-xs font-black uppercase tracking-wider mb-2",
                                    isDestructive ? "text-rose-700" : "text-amber-700"
                                )}>
                                    This will affect:
                                </p>
                                <ul className="space-y-1">
                                    {affectedItems.map((item, index) => (
                                        <li 
                                            key={index} 
                                            className={clsx(
                                                "text-xs font-medium flex items-start gap-2",
                                                isDestructive ? "text-rose-600" : "text-amber-600"
                                            )}
                                        >
                                            <span className="mt-1">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="order-2 sm:order-1 flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={clsx(
                                "order-1 sm:order-2 flex-[1.5] px-4 py-3 rounded-xl text-white text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
                                isDestructive
                                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                                    : "bg-brand-600 hover:bg-brand-700 shadow-brand-500/20",
                                isLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <Check size={14} className="shrink-0" />
                                    <span>{confirmText}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
