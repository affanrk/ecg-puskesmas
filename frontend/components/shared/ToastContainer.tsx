'use client';

import React from 'react';
import { useToast } from '@/hooks/useToast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

export default function ToastContainer() {
    const { toasts, remove } = useToast();

    return (
        <div className="fixed top-6 right-6 z-[200] flex flex-col items-end pointer-events-none gap-3">
            {toasts.map((toast) => (
                <div 
                    key={toast.id}
                    className={clsx(
                        "pointer-events-auto transform transition-all duration-300 animate-in slide-in-from-right-10 fade-in flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm",
                        toast.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-700" :
                        toast.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-700" :
                        "bg-emerald-50 border-emerald-100 text-emerald-700"
                    )}
                >
                    <div className="shrink-0 mt-0.5">
                        {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> :
                         toast.type === 'warning' ? <Info className="w-5 h-5 text-amber-500" /> :
                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        }
                    </div>
                    <div className="text-sm font-bold tracking-tight">
                        {toast.message}
                    </div>
                    <button 
                        onClick={() => remove(toast.id)}
                        className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
