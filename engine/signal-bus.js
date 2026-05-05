// engine/signal-bus.js
// Global pub/sub for decoupled engine and game events.
// Depends on: nothing.
// Used by: any module that needs to emit or listen for named events.

var Engine = Engine || {};

class SignalBus {
  constructor() {
    this._listeners = new Map();
  }

  /** Fire a named signal with an optional payload. */
  emit(name, payload) {
    const handlers = this._listeners.get(name);
    if (!handlers) return;
    // Snapshot so handlers that unregister during dispatch do not corrupt iteration.
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }

  /** Register a listener for a named signal. Returns an unregister function. */
  on(name, handler) {
    if (!this._listeners.has(name)) {
      this._listeners.set(name, new Set());
    }
    this._listeners.get(name).add(handler);
    return () => this.off(name, handler);
  }

  /** Remove a listener for a named signal. */
  off(name, handler) {
    const handlers = this._listeners.get(name);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this._listeners.delete(name);
    }
  }
}

Engine.SignalBus = SignalBus;
Engine.signals = new SignalBus();
