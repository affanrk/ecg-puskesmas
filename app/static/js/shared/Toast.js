import { CONFIG } from '../config.js';

export class Toast {
    static show(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        let bgClass = type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700';
        let icon = type === 'error'
            ? `<svg class="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`
            : `<svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;

        const toast = document.createElement('div');
        toast.className = `${bgClass} border shadow-lg rounded-xl p-4 flex items-start gap-3 transform transition-all duration-300 translate-x-10 opacity-0 pointer-events-auto mb-3`;
        toast.innerHTML = `<div class="shrink-0 mt-0.5">${icon}</div><div class="text-sm font-semibold">${message}</div>`;

        container.appendChild(toast);

        // Animasi Masuk
        requestAnimationFrame(() => toast.classList.remove('translate-x-10', 'opacity-0'));

        // Animasi Keluar & Hapus
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-10');
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }
}