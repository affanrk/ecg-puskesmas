'use client';

import { useEffect, useState } from 'react';

import clsx from 'clsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

import { useToast } from '@/hooks/useToast';
import { Toast } from '@/types/models';

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: () => void }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div 
            className={clsx(
                "pointer-events-auto transform transition-all duration-300 ease-out flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm max-w-sm w-full",
                toast.type === 'error' ? "bg-white/95 border-rose-200/50 text-rose-700 shadow-lg shadow-rose-100/50" :
                toast.type === 'warning' ? "bg-white/95 border-amber-200/50 text-amber-700 shadow-lg shadow-amber-100/50" :
                "bg-white/95 border-emerald-200/50 text-emerald-700 shadow-lg shadow-emerald-100/50",
                isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
            )}
        >
            <div className="shrink-0 mt-0.5">
                {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-500" strokeWidth={2} /> :
                 toast.type === 'warning' ? <Info className="w-4 h-4 text-amber-500" strokeWidth={2} /> :
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                }
            </div>
            <div className="text-sm font-medium pr-4 leading-relaxed">
                {toast.message}
            </div>
            <button 
                onClick={onRemove}
                className="ml-auto p-1 hover:bg-slate-100/80 rounded text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const { toasts, remove } = useToast();

    return (
        <div className="fixed top-6 right-6 z-[200] flex flex-col items-end pointer-events-none gap-2.5 overflow-visible">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => remove(toast.id)} />
            ))}
        </div>
    );
}
