import { connectWebSocket } from './services/Socket.js';
import { MonitorController } from './modules/monitor/MonitorController.js';
import { HistoryController } from './modules/history/HistoryController.js';
import { PerformanceController } from './modules/performance/PerformanceController.js';
import { AuthController } from './modules/auth/AuthController.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Global Auth Controller (Handles Logout, Auth Checks)
    new AuthController();

    // 2. Inisialisasi Modules/Controllers (Only for Operator Dashboard)
    // We check for a unique element on the operator dashboard to avoid errors on other panels
    if (document.getElementById('bpm-value')) {
        const monitor = new MonitorController();
        const history = new HistoryController();
        const performance = new PerformanceController(monitor.charts);

        // 3. Setup Navigasi Tab (Single Page Application logic sederhana)
        setupNavigation();

        // 4. Mulai Koneksi WebSocket
        connectWebSocket();
    }
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');

            // 1. Update State Tombol Navigasi
            navItems.forEach(b => {
                b.classList.remove('bg-brand-50', 'text-brand-700', 'ring-1', 'ring-brand-200');
                b.classList.add('text-slate-400', 'hover:bg-slate-50', 'hover:text-brand-600');
            });
            e.currentTarget.classList.remove('text-slate-400', 'hover:bg-slate-50', 'hover:text-brand-600');
            e.currentTarget.classList.add('bg-brand-50', 'text-brand-700', 'ring-1', 'ring-brand-200');

            // 2. Sembunyikan semua konten tab
            tabContents.forEach(c => c.classList.add('hidden'));

            // 3. Tampilkan konten tab yang dipilih
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
        });
    });
}