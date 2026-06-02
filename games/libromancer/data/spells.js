// games/libromancer/data/spells.js
// ----------------------------------------------------------------
// Spell definitions for Libromancer.
// Depends on: nothing
// Used by: LibromancerCombatScene.js
//
// Each spell:
//   id          string  unique identifier (also the key in the object)
//   name        string  display name (keep under 14 chars for card legibility)
//   starter     bool    part of the base set; in the deck from run one
//   description string  1-2 lines of effect text (newline-separated)
//   effect      function(state) => result
//
// state = {
//   playerHp, playerMaxHp, playerBlock,
//   enemyHp, enemyMaxHp, enemyBlock,
//   cardsPlayedThisCombat
// }
//
// result (all fields optional, omit means 0 / no effect) = {
//   damage       number  dealt to enemy before their block is applied
//   block        number  added to player block this turn
//   heal         number  restored to player HP (capped at maxHp)
//   stripBlock   number  strip this many points from enemy block immediately
//   applyFray    number  add this many stacks of Fray to enemy
//   drawBonus    number  draw this many extra cards at the start of next turn
// }
// ----------------------------------------------------------------

var LIBROMANCER_SPELLS = {

  // --- Starter spells (always in the deck) ---

  quill_strike: {
    id: 'quill_strike',
    name: 'Quill Strike',
    starter: true,
    description: 'Deal 4 damage.',
    effect: function(state) { return { damage: 4 }; }
  },

  vellum_shield: {
    id: 'vellum_shield',
    name: 'Vellum Shield',
    starter: true,
    description: 'Gain 5 block.',
    effect: function(state) { return { block: 5 }; }
  },

  ink_splash: {
    id: 'ink_splash',
    name: 'Ink Splash',
    starter: true,
    description: 'Deal 3 damage.\nStrip 3 enemy block.',
    effect: function(state) { return { damage: 3, stripBlock: 3 }; }
  },

  dog_ear: {
    id: 'dog_ear',
    name: 'Dog-Ear',
    starter: true,
    description: 'Deal 2 damage.\nGain 3 block.',
    effect: function(state) { return { damage: 2, block: 3 }; }
  },

  studied: {
    id: 'studied',
    name: 'Studied',
    starter: true,
    description: 'Restore 4 HP.',
    effect: function(state) { return { heal: 4 }; }
  },

  // --- Unlockable spells (gained permanently through encounter clears) ---

  illuminate: {
    id: 'illuminate',
    name: 'Illuminate',
    starter: false,
    description: 'Deal 8 damage.',
    effect: function(state) { return { damage: 8 }; }
  },

  foxed_pages: {
    id: 'foxed_pages',
    name: 'Foxed Pages',
    starter: false,
    description: 'Deal 3 damage.\nFray: +1 dmg/turn, 3 turns.',
    effect: function(state) { return { damage: 3, applyFray: 3 }; }
  },

  gilt_binding: {
    id: 'gilt_binding',
    name: 'Gilt Binding',
    starter: false,
    description: 'Gain 12 block.',
    effect: function(state) { return { block: 12 }; }
  },

  palimpsest: {
    id: 'palimpsest',
    name: 'Palimpsest',
    starter: false,
    description: '2 damage per card\nplayed this combat.',
    effect: function(state) {
      return { damage: Math.max(2, state.cardsPlayedThisCombat * 2) };
    }
  },

  marginalia: {
    id: 'marginalia',
    name: 'Marginalia',
    starter: false,
    description: 'Deal 2 damage.\nDraw +1 next turn.',
    effect: function(state) { return { damage: 2, drawBonus: 1 }; }
  }

};
