// ============================================================================
// final-beacon.ink — Sector 5: Threshold Station
// ============================================================================
//
// The win encounter. No choices, no damage. Flavor text branches on final
// hull and crew state to color the arrival appropriately. Three tones:
//   hull >= 8 and crew_total >= 3  → clean arrival
//   hull >= 4 (but not the above)  → weathered arrival
//   otherwise                      → barely made it
//
// No EXTERNAL calls. The game detects the win condition after this
// encounter ends (sectorsCompleted reaches 5 with hull > 0 and crew > 0).
//
// ============================================================================

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
