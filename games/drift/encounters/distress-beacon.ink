// ============================================================================
// distress-beacon.ink — Sector 2: The Yelena's Wake
// ============================================================================
//
// First encounter with player choice. Investigating costs hull if Engines
// are unmanned but always yields a crew gain. Passing is safe but forgoes
// the gain. Demonstrates the risk/reward tradeoff of crew allocation.
//
// VARIABLES (set by the game before calling continue())
//   crew_in_engines  — active crew in the Engines room
//   (all seven standard variables declared below for setVar safety)
//
// EXTERNALS called
//   damage_hull(1)  — rough burn from unmanned engines
//   gain_crew()     — survivor rescued, added to Medical Bay
//
// BRANCHING
//   Investigate + crew_in_engines >= 1  → clean burn, gain crew
//   Investigate + crew_in_engines == 0  → rough burn, gain crew, take 1 hull
//   Pass                                → no cost, no gain
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
