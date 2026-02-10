'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastState {
    toasts: Toast[];
    show: (message: string, type?: ToastType) => void;
    remove: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
    toasts: [],

    show: (message, type = 'success') => {
        // Prevent duplicate toasts with same message and type
        const isDuplicate = useToast.getState().toasts.some(
            (t) => t.message === message && t.type === type
        );
        if (isDuplicate) return;

        const id = Date.now() + Math.random();
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }]
        }));

        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }));
        }, 3000);
    },
    
    remove: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));