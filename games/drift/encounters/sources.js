// ============================================================================
// games/drift/encounters/sources.js
// ============================================================================
//
// Build-ready ink encounter sources for Drift v1.
//
// Contains the raw .ink source for each encounter as a JavaScript string
// constant. The canonical authoring source is the matching .ink file in the
// same directory. If you edit a .ink file directly, update the corresponding
// string in DRIFT_ENCOUNTER_SOURCES below to keep them in sync.
//
// Included in the build before match.js so that DRIFT_ENCOUNTER_SOURCES is
// defined when DriftMatchScene references it.
//
// ==========================================================================
// AUTHORING GUIDE — Adding or editing encounters
// ==========================================================================
//
// Each encounter is a self-contained ink story. The game sets ink variables
// before running the story, and the story calls EXTERNAL functions to apply
// outcomes to the game state. Variable values set by the game override the
// defaults declared with VAR in the ink source.
//
// Standard variables (always declared with VAR; set by the game via setVar
// before calling continue() for the first time on each encounter):
//
//   crew_in_helm     — active crew count in the Helm room
//   crew_in_weapons  — active crew count in the Weapons room
//   crew_in_shields  — active crew count in the Shields room
//   crew_in_medical  — active crew count in the Medical Bay
//   crew_in_engines  — active crew count in the Engines room
//   hull             — current hull integrity (integer 0–10)
//   crew_total       — total active crew count
//
// External functions (bound by the game; callable from ink with ~):
//
//   damage_hull(amount)    — reduces hull by amount (integer)
//   heal_hull(amount)      — restores hull by amount (capped at max 10)
//   lose_crew(room_name)   — incapacitates a crew member in that room.
//                            Pass the room id string: "helm", "weapons",
//                            "shields", "medical", or "engines".
//                            If the named room is empty, the game picks
//                            from the nearest occupied room instead.
//   gain_crew()            — adds one crew member to the Medical Bay.
//
// Ink syntax quick reference:
//
//   VAR x = 0                     declare a variable (set defaults here;
//                                 game overrides via setVar before running)
//   EXTERNAL fn(arg)              declare an external function
//   ~ fn(value)                   call an external function
//   ~ x = 5                       assign a variable inline
//   { x >= 2: text | other }      inline conditional
//   { x >= 2:                     block conditional (multi-branch)
//       text A
//   - x == 1:
//       text B
//   - else:
//       text C
//   }
//   * [Choice label]              player choice (label in buttons, NOT
//                                 echoed into the story output)
//     text shown after choosing
//   -> END                        end the story
//   // comment                    ink comment (not shown to the player)
//   and / or / not                logical operators (use these, not &&)
//
// Adding a new encounter:
//   1. Write the .ink file under games/drift/encounters/.
//   2. Add an entry to DRIFT_ENCOUNTER_SOURCES in this file.
//   3. Add the entry to the correct position in the array (sectors are
//      0-indexed; position in the array = sector index).
//   4. Reassemble build/drift.html and upload.
//
// ============================================================================

const DRIFT_ENCOUNTER_SOURCES = [

  // --------------------------------------------------------------------------
  // Sector 0 — Nebula Storm
  // No player choice. crew_in_shields determines outcome.
  // --------------------------------------------------------------------------
  {
    id:     'nebula-storm',
    label:  'Sable Drift Nebula',
    source: `
VAR crew_in_helm = 0
VAR crew_in_weapons = 0
VAR crew_in_shields = 0
VAR crew_in_medical = 0
VAR crew_in_engines = 0
VAR hull = 10
VAR crew_total = 4

EXTERNAL damage_hull(amount)

The Sable Drift nebula was not on the charts.

It materialises across the viewport like a slow bruise — violet and deep amber, beautiful in the way pressure is beautiful just before something gives. The ship's sensors flag ionised particle density at three times safe threshold. Your deflectors have seconds.

{ crew_in_shields >= 1:
    The Shields room responds. Deflectors climb to full, bleeding off the particle surge in a cascade of blue-white light along the hull. You pass through with nothing worse than a good story.

    Beyond the nebula, open space. The sensors clear.
    -> END
- else:
    No one answers from Shields. The deflectors stay cold.

    The nebula hits the hull like static amplified to violence. Lights flicker. Something in the starboard section groans. You make it through — barely — but the ship remembers.

    ~ damage_hull(2)

    Beyond the nebula, open space. The sensors clear, indifferent to what they cost you.
    -> END
}
`,
  },

  // --------------------------------------------------------------------------
  // Sector 1 — Distress Beacon
  // Player choice: investigate or pass.
  // crew_in_engines affects investigation cost. gain_crew() on investigate.
  // --------------------------------------------------------------------------
  {
    id:     'distress-beacon',
    label:  "Yelena's Wake",
    source: `
VAR crew_in_helm = 0
VAR crew_in_weapons = 0
VAR crew_in_shields = 0
VAR crew_in_medical = 0
VAR crew_in_engines = 0
VAR hull = 10
VAR crew_total = 4

EXTERNAL damage_hull(amount)
EXTERNAL gain_crew()

The signal is faint and old — a standard distress pulse running on a loop that has probably been broadcasting longer than anyone intended.

Long-range scan resolves the source: a battered hauler, the Yelena's Wake, drifting in a debris field four minutes off your heading. One life sign. Fading.

You have a window.

* [Alter course. Investigate the beacon.]
    You bring the ship around. Four minutes at sustained burn.

    { crew_in_engines >= 1:
        The Engines room runs it clean — steady thrust, efficient correction. The Yelena's Wake comes alongside without drama.

        The survivor is a field medic. Barely conscious, but mobile. She pulls herself through your docking collar and falls asleep on the deck of the Medical Bay.

        ~ gain_crew()
        -> END
    - else:
        No one is minding the engines. The burn runs hot and uneven — you make the distance, but the ship complains the whole way.

        The survivor is a field medic. She makes it aboard. Worth it, probably.

        ~ gain_crew()
        ~ damage_hull(1)
        -> END
    }

* [Maintain heading. You cannot afford the detour.]
    The signal fades behind you. The life sign goes with it.

    The crew does not comment. Neither do you.

    -> END
`,
  },

  // --------------------------------------------------------------------------
  // Sector 2 — Pirate Hail
  // Three choices. crew_in_weapons determines bluff and run outcomes.
  // Only encounter with crew loss as a possible cost.
  // --------------------------------------------------------------------------
  {
    id:     'pirate-hail',
    label:  'The Consolidated Compact',
    source: `
VAR crew_in_helm = 0
VAR crew_in_weapons = 0
VAR crew_in_shields = 0
VAR crew_in_medical = 0
VAR crew_in_engines = 0
VAR hull = 10
VAR crew_total = 4

EXTERNAL damage_hull(amount)
EXTERNAL lose_crew(room_name)

The hail comes in on an unencrypted channel, which is either careless or a deliberate insult.

"Unregistered vessel. You are transiting Consolidated interest space without a clearance bond. Standard bond is one crew transfer or equivalent. Comply and you will not be boarded. Resist and we will take what we came for anyway."

The sender's transponder reads: the Consolidated Salvage Compact. Pirates with a branding budget.

* [Bluff. Tell them your weapons are hot and your crew is bored.]
    You key the channel.

    "We appreciate the warning. Our weapons crew appreciates it more. They have not fired on anything in three days."

    { crew_in_weapons >= 2:
        A long pause.

        "Safe travels." The channel closes. The Compact vessel peels off.

        Your weapons crew did not fire a shot. But they were there, and that was enough.
        -> END
    - else:
        Another pause. Then: "Scan shows two life signs in your weapons bay. Ours shows none. Try again."

        They board fast and they know what they are doing. The fight is brief and goes against you.

        ~ lose_crew("weapons")
        ~ damage_hull(2)

        They leave with what they came for. The channel closes.
        -> END
    }

* [Comply. Give them what they asked for.]
    You do not like this. The calculus is simple and you do not like it anyway.

    "We will send someone across."

    ~ lose_crew("weapons")

    The Compact vessel docks, takes your crew member, and withdraws without a word. Professional.

    The docking collar reseals. You are one short.
    -> END

* [Run. Push the engines and do not look back.]
    You cut the channel and hit full burn.

    { crew_in_weapons >= 1:
        The Weapons room opens up on the Compact vessel's engines as you go — not to destroy, just to discourage pursuit. It works. By the time they recover, you are well outside their intercept window.
        -> END
    - else:
        The Compact vessel is faster than it looks. They rake your stern on the way out.

        ~ damage_hull(2)

        Eventually they break off. You are clear.
        -> END
    }
`,
  },

  // --------------------------------------------------------------------------
  // Sector 3 — Asteroid Corridor
  // No player choice. Three-tier crew_in_engines branch.
  // Highest potential damage in the run (3 hull on empty engines).
  // --------------------------------------------------------------------------
  {
    id:     'asteroid-corridor',
    label:  'The Corridor',
    source: `
VAR crew_in_helm = 0
VAR crew_in_weapons = 0
VAR crew_in_shields = 0
VAR crew_in_medical = 0
VAR crew_in_engines = 0
VAR hull = 10
VAR crew_total = 4

EXTERNAL damage_hull(amount)

The final approach corridor is not on the civilian charts because civilian ships do not come this way.

It is a belt of high-density debris — shattered moon material, the kind that takes centuries to settle and shows no sign of starting. There is a path through. The charts call it the Corridor. The charts do not editorialize, but if they did, they would note that it rewards precise thruster work.

{ crew_in_engines >= 2:
    The Engines room is ready. Thrust comes in controlled bursts — forty degrees, corrected, twenty degrees, corrected — a patient conversation between the ship and the rock.

    You emerge on the far side without a scratch. The debris field recedes behind you like a problem that decided not to be one.
    -> END
- crew_in_engines == 1:
    One crew member in Engines does what they can. It is almost enough.

    The ship threads the major hazards but catches a glancing contact near the midpoint — a tumbling fragment the size of a cargo container that a single engineer could not account for and correct in time.

    ~ damage_hull(1)

    You are through. Intact enough.
    -> END
- else:
    No one is running the engines. You go in on manual helm corrections alone, which is not how this is supposed to work.

    The Corridor is not forgiving of improvisation.

    ~ damage_hull(3)

    You come out the other side hull-stressed and slower than you went in. Through, but not fine.
    -> END
}
`,
  },

  // --------------------------------------------------------------------------
  // Sector 4 — Final Beacon (win encounter)
  // No choices, no damage. Branches on hull and crew_total for flavor only.
  // Win state is detected by the game after this encounter ends.
  // --------------------------------------------------------------------------
  {
    id:     'final-beacon',
    label:  'Threshold Station',
    source: `
VAR crew_in_helm = 0
VAR crew_in_weapons = 0
VAR crew_in_shields = 0
VAR crew_in_medical = 0
VAR crew_in_engines = 0
VAR hull = 10
VAR crew_total = 4

The beacon is real.

After everything — the nebula, the Compact, the Corridor — the station transponder is exactly where the charts said it would be. It answers your approach ping on the first try.

"Unregistered vessel, this is Threshold Station. You are cleared for docking bay seven. Welcome to the Rim."

{ hull >= 8 and crew_total >= 3:
    You bring the ship in clean. Full crew at stations, hull sound. The docking clamps take hold with a solidity that feels almost like relief.

    You made it, and you made it well.
- hull >= 4:
    You bring the ship in. The docking officer notes the hull scoring in her log without comment, which is its own kind of professionalism.

    You are short some integrity, possibly some crew. But you are here.
- else:
    You bring the ship in. Barely. The docking clamps take hold and you stay in the pilot's seat a moment longer than necessary.

    Whatever got you here — luck, the math of attrition, something you will not name — it was enough. Barely. Still enough.
}

The engines go quiet for the first time in a long time.

-> END
`,
  },

];
