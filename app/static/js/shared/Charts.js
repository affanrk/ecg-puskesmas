import { CONFIG } from '../config.js';

export class ChartManager {
    constructor() {
        this.ecgChart = null;
        this.latencyChart = null;
        this.jitterChart = null;

        this.currentCursor = 0;
        this.totalPoints = CONFIG.MAX_DATA_POINTS || 100;

        this.initCommonOptions();
    }

    initCommonOptions() {
        this.commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'none' },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: {
                    type: 'linear',
                    display: false,
                    min: 0,
                    max: this.totalPoints
                },
                y: {
                    display: true,
                    grid: { color: CONFIG.COLORS.grid, drawBorder: false },
                    ticks: { color: CONFIG.COLORS.text, font: { size: 10, family: "'JetBrains Mono', monospace" } }
                }
            },
            elements: { point: { radius: 0 }, line: { borderWidth: 1.5, tension: 0.3 } }
        };
    }

    init() {
        this.initECGChart();
        this.initPerformanceCharts();
    }

    initECGChart() {
        const elECG = document.getElementById('ecgChart');
        if (!elECG) return;

        const ctxECG = elECG.getContext('2d');
        const initialData = new Array(this.totalPoints).fill(null);

        this.ecgChart = new Chart(ctxECG, {
            type: 'line',
            data: {
                labels: Array.from({ length: this.totalPoints }, (_, i) => i),
                datasets: [
                    { label: 'Lead I', data: [...initialData], borderColor: CONFIG.COLORS.leadI, borderWidth: 1.5 },
                    { label: 'Lead II', data: [...initialData], borderColor: CONFIG.COLORS.leadII, borderWidth: 1.5 },
                    { label: 'V1', data: [...initialData], borderColor: CONFIG.COLORS.v1, borderWidth: 1.5 }
                ]
            },
            options: {
                ...this.commonOptions,
                scales: {
                    ...this.commonOptions.scales,
                    y: { ...this.commonOptions.scales.y, min: -2, max: 2 }
                }
            }
        });
    }

    initPerformanceCharts() {
        const elLat = document.getElementById('latencyChart');
        const elJit = document.getElementById('jitterChart');

        if (elLat) {
            this.latencyChart = new Chart(elLat.getContext('2d'), {
                type: 'line',
                data: {
                    labels: Array(50).fill(''),
                    datasets: [{ label: 'Latency', data: [], borderColor: CONFIG.COLORS.leadI, backgroundColor: CONFIG.COLORS.leadI + '20', fill: true }]
                },
                options: { ...this.commonOptions, scales: { ...this.commonOptions.scales, x: { display: false }, y: { beginAtZero: true, suggestedMax: 100 } } }
            });
        }

        if (elJit) {
            this.jitterChart = new Chart(elJit.getContext('2d'), {
                type: 'line',
                data: {
                    labels: Array(50).fill(''),
                    datasets: [{ label: 'Jitter', data: [], borderColor: CONFIG.COLORS.v1, backgroundColor: CONFIG.COLORS.v1 + '20', fill: true }]
                },
                options: { ...this.commonOptions, scales: { ...this.commonOptions.scales, x: { display: false }, y: { beginAtZero: true, suggestedMax: 50 } } }
            });
        }
    }

    updateECG(data) {
        if (!this.ecgChart) return;

        // Destructure data: { leadI, leadII, v1 }
        const { leadI, leadII, v1 } = data;

        this.ecgChart.data.datasets[0].data[this.currentCursor] = leadI;
        this.ecgChart.data.datasets[1].data[this.currentCursor] = leadII;
        this.ecgChart.data.datasets[2].data[this.currentCursor] = v1;

        // Erase bar (efek visual seperti monitor rumah sakit)
        const gap = CONFIG.ERASE_GAP || 20;
        for (let i = 1; i <= gap; i++) {
            const eraseIdx = (this.currentCursor + i) % this.totalPoints;
            this.ecgChart.data.datasets[0].data[eraseIdx] = null;
            this.ecgChart.data.datasets[1].data[eraseIdx] = null;
            this.ecgChart.data.datasets[2].data[eraseIdx] = null;
        }

        this.currentCursor = (this.currentCursor + 1) % this.totalPoints;

        // Auto-scale setiap 10 frame
        if (this.currentCursor % 10 === 0) this.adjustScale();

        this.ecgChart.update('none');
    }

    updatePerformance(latency, jitter) {
        if (this.latencyChart) {
            this.latencyChart.data.datasets[0].data.push(latency);
            if (this.latencyChart.data.datasets[0].data.length > 50) this.latencyChart.data.datasets[0].data.shift();
            this.latencyChart.update('none');
        }
        if (this.jitterChart) {
            this.jitterChart.data.datasets[0].data.push(jitter);
            if (this.jitterChart.data.datasets[0].data.length > 50) this.jitterChart.data.datasets[0].data.shift();
            this.jitterChart.update('none');
        }
    }

    toggleLead(index, isVisible) {
        if (!this.ecgChart) return;
        this.ecgChart.setDatasetVisibility(index, isVisible);
        this.ecgChart.update('none');
    }

    clear() {
        if (this.ecgChart) {
            this.currentCursor = 0;
            this.ecgChart.data.datasets.forEach(ds => ds.data.fill(null));
            this.ecgChart.options.scales.y.min = -2;
            this.ecgChart.options.scales.y.max = 2;
            this.ecgChart.update();
        }
        if (this.latencyChart) {
            this.latencyChart.data.datasets[0].data = [];
            this.latencyChart.update();
        }
        if (this.jitterChart) {
            this.jitterChart.data.datasets[0].data = [];
            this.jitterChart.update();
        }
    }

    adjustScale() {
        if (!this.ecgChart) return;
        let maxVal = 0;

        // Cari nilai maksimum absolut di semua dataset yang aktif
        this.ecgChart.data.datasets.forEach((ds, i) => {
            if (this.ecgChart.isDatasetVisible(i)) {
                for (let j = 0; j < ds.data.length; j++) {
                    const v = ds.data[j];
                    if (v !== null && v !== undefined) {
                        const abs = Math.abs(v);
                        if (abs > maxVal) maxVal = abs;
                    }
                }
            }
        });

        if (maxVal < 1.0) maxVal = 1.0;
        const limit = maxVal * 1.1;
        const currentMax = this.ecgChart.options.scales.y.max;

        if (Math.abs(currentMax - limit) > 0.1) {
            this.ecgChart.options.scales.y.min = -limit;
            this.ecgChart.options.scales.y.max = limit;
        }
    }
}