// Simple event emitter for React Native (no window object)
// Used for cross-module communication (e.g., token refresh events)

class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(
            (cb) => cb !== callback
        );
    }

    emit(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
            }
        });
    }

    once(eventName, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(eventName, onceWrapper);
        };
        this.on(eventName, onceWrapper);
    }
}

// Global singleton instance
const eventEmitter = new EventEmitter();

export default eventEmitter;
