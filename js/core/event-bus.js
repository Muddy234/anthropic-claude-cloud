// ============================================================================
// EVENT BUS - The Shifting Chasm
// ============================================================================
// Central event system for decoupled communication between game systems.
// Must be loaded before any system scripts in index.html.
// ============================================================================

const EventBus = {
    listeners: {},

    on(event, callback) {
        (this.listeners[event] = this.listeners[event] || []).push(callback);
    },

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    },

    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        this.on(event, wrapper);
    },

    emit(event, data) {
        (this.listeners[event] || []).forEach(cb => cb(data));
    },

    // Remove all listeners for an event, or all events if no event specified
    clear(event) {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
};

window.EventBus = EventBus;

console.log('[EventBus] Event bus initialized');
