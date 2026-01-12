class EventBus {
    constructor() {
        this.listeners = {};
    }

    // Subscribe ke event
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    // Unsubscribe (opsional, untuk cleanup)
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    // Emit (Kirim event ke semua subscriber)
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
}

// Export singleton instance agar semua file pakai bus yang sama
export const globalEventBus = new EventBus();