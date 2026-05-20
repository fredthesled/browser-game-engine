// ============================================================================
// pirate-hail.ink — Sector 3: The Consolidated Compact
// ============================================================================
//
// First encounter with meaningful consequence divergence and three choices.
// Introduces crew loss as a possible outcome. Weapons crew determines whether
// bluffs hold and whether running is clean.
//
// VARIABLES (set by the game before calling continue())
//   crew_in_weapons  — active crew in the Weapons room
//   (all seven standard variables declared below for setVar safety)
//
// EXTERNALS called
//   damage_hull(amount)  — hull raked during failed bluff or clean run
//   lose_crew(room)      — crew member taken by boarders or compliance
//
// BRANCHING
//   Bluff + crew_in_weapons >= 2  → they back down, no cost
//   Bluff + crew_in_weapons < 2   → boarded, lose_crew("weapons") + damage_hull(2)
//   Comply                        → lose_crew("weapons"), no hull damage
//   Run + crew_in_weapons >= 1    → covering fire, clean escape
//   Run + crew_in_weapons == 0    → stern raked, damage_hull(2)
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
EXTERNAL lose_crew(room_name)

The hail comes in on an unencrypted channel, which is either careless or a deliberate insult.

"Unregistered vessel. You are transiting Consolidated interest space without a clearance bond. Standard bond is one crew transfer or equivalent. Comply and you will not be boarded. Resist and we will take what we came for anyway."

The sender's transponder reads: the Consolidated Salvage Compact. Pirates with a branding budget.

* [Bluff. Tell them your weapons are hot and your crew is bored.]
    You key the channel.

    "We appreciate the warning. Our weapons crew appreciates it more. They haven't fired on anything in three days."

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
