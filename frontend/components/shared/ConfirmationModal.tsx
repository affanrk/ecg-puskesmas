'use client';

import { AlertTriangle, Check } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    isDestructive = false,
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col items-center">
                <div className="p-6 text-center w-full">
                    <div className={clsx(
                        "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4",
                        isDestructive ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    )}>
                        <AlertTriangle size={28} />
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-8 px-2">
                        {message}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={onClose}
                            disabled={isLoading}
                            className="order-2 sm:order-1 flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={clsx(
                                "order-1 sm:order-2 flex-[1.5] px-4 py-3 rounded-xl text-white text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap",
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
