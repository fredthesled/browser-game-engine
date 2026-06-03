// games/libromancer/data/encounters.js
// ----------------------------------------------------------------
// Encounter definitions for Libromancer.
// Depends on: nothing
// Used by: LibromancerCombatScene.js
//
// Encounters are always presented in the order defined here (index 0-4).
// The last encounter is always The Archivist. Run variety comes from the
// growing spell pool across runs rather than encounter reordering.
//
// action.type values:
//   'attack'          deal .value damage to the player
//   'defend'          enemy gains .value block
//   'status_dust'     apply .statusStacks Dust to the player
//                     (each Dust stack = +1 incoming damage; depletes 1/player turn)
//   'attack_status'   attack (.value damage) and apply .statusType x .statusStacks
//   'attack_variable' damage = max(1, 10 - floor(playerHp / 2))
//                     (more dangerous when the player is already hurt)
//
// .intent   string  shown to the player before their turn as a warning
// .unlocks  string  spell ID permanently added to the player's pool on first clear
// ----------------------------------------------------------------

var LIBROMANCER_ENCOUNTERS = [

  {
    id: 'bookworm',
    name: 'The Bookworm',
    flavor: 'A pale worm winds through the stacks, trailing shredded pages. It has eaten most of the index.',
    hp: 18,
    maxHp: 18,
    unlocks: 'illuminate',
    actions: [
      { type: 'attack', value: 4, intent: 'Gnaw (4 dmg)' },
      { type: 'attack', value: 4, intent: 'Gnaw (4 dmg)' },
      { type: 'attack', value: 6, intent: 'Devour (6 dmg)' }
    ]
  },

  {
    id: 'dust_mite',
    name: 'The Dust Mite',
    flavor: 'An ancient thing. It pre-dates the library. It may pre-date paper.',
    hp: 22,
    maxHp: 22,
    unlocks: 'foxed_pages',
    actions: [
      { type: 'status_dust', statusStacks: 1, intent: 'Settle (Dust x1)' },
      { type: 'attack', value: 5, intent: 'Swarm (5 dmg)' },
      { type: 'status_dust', statusStacks: 2, intent: 'Choke (Dust x2)' },
      { type: 'attack', value: 5, intent: 'Swarm (5 dmg)' }
    ]
  },

  {
    id: 'shelf_spirit',
    name: 'The Shelf Spirit',
    flavor: 'It has organized and re-organized these shelves for a century. You are out of order.',
    hp: 24,
    maxHp: 24,
    unlocks: 'gilt_binding',
    actions: [
      { type: 'defend', value: 5, intent: 'Brace (5 block)' },
      { type: 'attack', value: 6, intent: 'Topple (6 dmg)' },
      { type: 'defend', value: 5, intent: 'Brace (5 block)' },
      { type: 'attack', value: 7, intent: 'Topple (7 dmg)' }
    ]
  },

  {
    id: 'forbidden_tome',
    name: 'The Forbidden Tome',
    flavor: 'The chains that once bound it lie open on the floor. Some books should have stayed shut.',
    hp: 22,
    maxHp: 22,
    unlocks: 'palimpsest',
    actions: [
      { type: 'attack_variable', intent: 'Reflect (10 - HP/2 dmg)' },
      { type: 'attack', value: 5, intent: 'Curse (5 dmg)' },
      { type: 'attack_variable', intent: 'Reflect (10 - HP/2 dmg)' }
    ]
  },

  {
    id: 'the_archivist',
    name: 'The Archivist',
    flavor: 'It was meant to preserve this collection forever. Forever is a long time to spend alone.',
    hp: 40,
    maxHp: 40,
    unlocks: 'marginalia',
    actions: [
      { type: 'attack', value: 7, intent: 'Catalogue (7 dmg)' },
      { type: 'defend', value: 5, intent: 'File (5 block)' },
      { type: 'attack', value: 7, intent: 'Catalogue (7 dmg)' },
      { type: 'attack_status', value: 5, statusType: 'fray', statusStacks: 2, intent: 'Redact (5 dmg + strip block)' },
      { type: 'defend', value: 8, intent: 'Seal (8 block)' },
      { type: 'attack', value: 10, intent: 'Overwrite (10 dmg)' }
    ]
  }

];
