'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';
import { useToast, Toast } from '@/hooks/useToast';

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: () => void }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div 
            className={clsx(
                "pointer-events-auto transform transition-all duration-500 ease-out flex items-start gap-3 p-4 rounded-xl border shadow-2xl max-w-sm w-full min-w-[320px]",
                toast.type === 'error' ? "bg-white border-rose-100 text-rose-700" :
                toast.type === 'warning' ? "bg-white border-amber-100 text-amber-700" :
                "bg-white border-emerald-100 text-emerald-700",
                isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            )}
        >
            <div className="shrink-0 mt-0.5">
                {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> :
                 toast.type === 'warning' ? <Info className="w-5 h-5 text-amber-500" /> :
                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                }
            </div>
            <div className="text-sm font-bold tracking-tight pr-4">
                {toast.message}
            </div>
            <button 
                onClick={onRemove}
                className="ml-auto p-1 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-500 transition-all shrink-0"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const { toasts, remove } = useToast();

    return (
        <div className="fixed top-6 right-6 z-[200] flex flex-col items-end pointer-events-none gap-3 overflow-visible">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => remove(toast.id)} />
            ))}
        </div>
    );
}
