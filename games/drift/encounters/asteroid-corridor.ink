// ============================================================================
// asteroid-corridor.ink — Sector 4: The Corridor
// ============================================================================
//
// No player choice. Purely crew-driven, like the nebula. Positioned fourth
// intentionally: the player now understands the mechanic and faces a
// high-stakes engines check on the final approach.
//
// Three-tier branching: two engineers for clean transit, one for minor
// contact, none for significant damage before the finale.
//
// VARIABLES (set by the game before calling continue())
//   crew_in_engines  — active crew in the Engines room
//   (all seven standard variables declared below for setVar safety)
//
// EXTERNALS called
//   damage_hull(1)  — glancing contact with one engineer
//   damage_hull(3)  — rough transit with no engineers
//
// BRANCHING
//   crew_in_engines >= 2  → clean transit, no damage
//   crew_in_engines == 1  → minor contact, damage_hull(1)
//   crew_in_engines == 0  → rough transit, damage_hull(3)
//
// ============================================================================

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
