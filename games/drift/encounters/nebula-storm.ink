// ============================================================================
// nebula-storm.ink — Sector 1: The Sable Drift Nebula
// ============================================================================
//
// No player choice. Outcome is determined entirely by Shields crew count.
// Serves as the tutorial encounter: the player learns that crew placement
// determines results before any choice is asked of them.
//
// VARIABLES (set by the game before calling continue())
//   crew_in_shields  — active crew in the Shields room
//   (all seven standard variables declared below for setVar safety)
//
// EXTERNALS called
//   damage_hull(2)  — when shields are unmanned
//
// BRANCHING
//   crew_in_shields >= 1  → shields hold, no damage
//   crew_in_shields == 0  → deflectors cold, take 2 hull damage
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
