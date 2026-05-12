// engine/storage.js
// localStorage-backed key/value persistence with optional per-game namespacing.
// Instantiated by Game as Engine.storage. The gameName option on the Game
// constructor becomes the namespace prefix; with no namespace, keys are stored
// as-is. Falls back to an in-memory Map if localStorage is unavailable
// (incognito mode, disabled by user, embedded contexts).
// Depends on: nothing (uses window.localStorage when available).
// Used by: game code via Engine.storage. The Game constructor instantiates it.

var Engine = Engine || {};

class EngineStorage {
  constructor(namespace) {
    this._namespace = namespace || '';
    this._prefix = this._namespace ? this._namespace + ':' : '';
    this._available = this._detectAvailable();
    this._fallback = this._available ? null : new Map();
  }

  _detectAvailable() {
    try {
      const probe = '__engine_storage_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** True if localStorage is usable; false if the in-memory fallback is in use. */
  isAvailable() { return this._available; }

  /** The configured namespace string (empty if none). */
  getNamespace() { return this._namespace; }

  _fullKey(key) { return this._prefix + key; }

  /** Persist a value. Returns true on success, false if serialization or write fails. */
  save(key, value) {
    if (value === undefined) {
      console.warn(`Engine.storage.save: refusing to save undefined for key '${key}'. Use clear(key) instead.`);
      return false;
    }
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (e) {
      console.warn(`Engine.storage.save: cannot serialize value for key '${key}':`, e);
      return false;
    }
    const fk = this._fullKey(key);
    if (!this._available) {
      this._fallback.set(fk, serialized);
      return true;
    }
    try {
      window.localStorage.setItem(fk, serialized);
      return true;
    } catch (e) {
      console.warn(`Engine.storage.save: localStorage.setItem failed for key '${key}':`, e);
      return false;
    }
  }

  /** Read a value. Returns defaultValue if missing or stored data cannot be parsed. */
  load(key, defaultValue = null) {
    const fk = this._fullKey(key);
    let raw;
    if (!this._available) {
      raw = this._fallback.has(fk) ? this._fallback.get(fk) : null;
    } else {
      raw = window.localStorage.getItem(fk);
    }
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`Engine.storage.load: cannot parse stored value for key '${key}':`, e);
      return defaultValue;
    }
  }

  /** Whether the key has a value. */
  has(key) {
    const fk = this._fullKey(key);
    if (!this._available) return this._fallback.has(fk);
    return window.localStorage.getItem(fk) !== null;
  }

  /** Remove a single key. Silent if it does not exist. */
  clear(key) {
    const fk = this._fullKey(key);
    if (!this._available) { this._fallback.delete(fk); return; }
    window.localStorage.removeItem(fk);
  }

  /**
   * Remove all keys in this namespace. With no namespace, removes every key on
   * the origin (use with care: this affects other apps sharing the origin).
   */
  clearAll() {
    if (!this._available) {
      if (!this._prefix) { this._fallback.clear(); return; }
      for (const k of [...this._fallback.keys()]) {
        if (k.startsWith(this._prefix)) this._fallback.delete(k);
      }
      return;
    }
    if (!this._prefix) {
      window.localStorage.clear();
      return;
    }
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(this._prefix)) toRemove.push(k);
    }
    for (const k of toRemove) window.localStorage.removeItem(k);
  }

  /** List unprefixed keys in this namespace. */
  keys() {
    const out = [];
    if (!this._available) {
      for (const k of this._fallback.keys()) {
        if (!this._prefix) { out.push(k); continue; }
        if (k.startsWith(this._prefix)) out.push(k.slice(this._prefix.length));
      }
      return out;
    }
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k === null) continue;
      if (!this._prefix) { out.push(k); continue; }
      if (k.startsWith(this._prefix)) out.push(k.slice(this._prefix.length));
    }
    return out;
  }
}

Engine.Storage = EngineStorage;
