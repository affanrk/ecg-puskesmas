'use client';

import { create } from 'zustand';

// --- Types ---

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

// --- Store ---

export const useToast = create<ToastState>((set) => ({
    // State
    toasts: [],

    // Actions
    show: (message, type = 'success') => {
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
