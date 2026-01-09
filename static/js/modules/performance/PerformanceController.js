import { EVENTS } from '../../config.js';
import { globalEventBus } from '../../core/Events.js';

export class PerformanceController {
    constructor(chartManager) {
        this.charts = chartManager;

        this.dom = {
            latency: document.getElementById('stat-latency'),
            jitter: document.getElementById('stat-jitter'),
            loss: document.getElementById('stat-loss')
        };

        this.init();
    }

    init() {
        this.setupEventSubscribers();
    }

    setupEventSubscribers() {
        // Listen ke update performa (dari Socket -> State -> EventBus)
        globalEventBus.on(EVENTS.STATE.PERFORMANCE_UPDATED, (perf) => {
            this.updateUI(perf);
        });
    }

    updateUI(perf) {
        // Update Text
        if (this.dom.latency) this.dom.latency.textContent = perf.latency + " ms";
        if (this.dom.jitter) this.dom.jitter.textContent = perf.jitter + " ms";
        if (this.dom.loss) this.dom.loss.textContent = perf.loss + "%";

        // Update Charts
        if (this.charts) {
            this.charts.updatePerformance(perf.latency, perf.jitter);
        }
    }
}