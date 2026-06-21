// ============================================================================
// engine/prng.js
// ============================================================================
//
// Engine.PRNG: seeded pseudo-random number generator.
//
// Algorithm: SFC32 (Small Fast Counting) by Chris Doty-Humphrey. 128-bit
// state (four 32-bit words); period ≥ 2^64; passes PractRand at 32 TB.
// String seeds are hashed to a 128-bit initial state by cyrb128 (bryc, CC0).
// See ADR-0026.
//
// Depends on: nothing.
// Depended on by: game scripts and scenes that need deterministic randomness
//   (procedural levels, daily seeds, replay systems). Not used by the engine
//   core; opt-in per game.
//
// Usage:
//   const rng = new Engine.PRNG('level-1');
//   rng.float()              // [0, 1), like Math.random()
//   rng.int(1, 6)            // integer in [1, 6] inclusive
//   rng.pick(['a','b','c'])  // random element from array
//   rng.shuffle(array)       // Fisher-Yates in place, returns array
// ============================================================================

var Engine = Engine || {};

class PRNG {
  constructor(seed) {
    let a, b, c, d;
    if (typeof seed === 'string') {
      [a, b, c, d] = PRNG._cyrb128(seed);
    } else {
      // Expand a single 32-bit integer to four words via a LCG.
      a = seed >>> 0;
      b = (a * 1664525 + 1013904223) >>> 0;
      c = (b * 1664525 + 1013904223) >>> 0;
      d = 1;
    }
    this._a = a; this._b = b; this._c = c; this._d = d;
    // Discard first 15 outputs so low-entropy seeds (e.g. 0) reach a
    // well-mixed state before callers draw values.
    for (let i = 0; i < 15; i++) this._step();
  }

  // [0, 1) float, the Math.random() analogue.
  float() {
    return (this._step() >>> 0) / 0x100000000;
  }

  // Integer in [min, max] inclusive.
  int(min, max) {
    return min + (this._step() % (max - min + 1));
  }

  // Random element from array. Throws if array is empty.
  pick(arr) {
    if (!arr.length) throw new Error('Engine.PRNG.pick: empty array');
    return arr[this._step() % arr.length];
  }

  // Fisher-Yates shuffle in place. Returns the same array.
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this._step() % (i + 1);
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // SFC32 step: updates state and returns a 32-bit unsigned integer.
  _step() {
    const t = (this._a + this._b + this._d++) >>> 0;
    this._a = (this._b ^ (this._b >>> 9)) >>> 0;
    this._b = (this._c + (this._c << 3)) >>> 0;
    this._c = ((this._c << 21) | (this._c >>> 11)) >>> 0;
    this._c = (this._c + t) >>> 0;
    return t;
  }

  // cyrb128 by bryc (CC0). Hashes a string to four 32-bit seed words.
  static _cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0; i < str.length; i++) {
      const k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }
}

Engine.PRNG = PRNG;
