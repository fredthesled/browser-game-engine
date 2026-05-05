# Attribution

Some licenses require crediting the author. Some don't. Either way, crediting third-party work is courteous and a small effort.

## License-by-license requirements

| License | Attribution required? | Notes |
|---------|----------------------|-------|
| CC0 / Public domain | No | Polite to mention regardless. |
| CC-BY 4.0 | Yes | Author + license + work title + link. |
| CC-BY-SA 4.0 | Yes | Same as CC-BY plus the derivative must be CC-BY-SA. |
| MIT / BSD / ISC / Apache 2.0 | Yes (for code) | Include the license text in the bundled output. |
| Open Font License (OFL) | Yes for redistribution | Including a font in your game counts as redistribution; bundle the OFL.txt. |
| Mixkit license | No | Free commercial use without attribution. |
| Pixabay Content License | No | Check terms; some assets restrict resale. |
| Custom permissive (Kenney, CraftPix free) | No | Read each site's terms once and verify it has not changed. |

When you cannot identify the license clearly, do not use the asset.

## Format for in-game credits

A `CreditsScene` should list:

1. Engine and framework (this repo, plus any libraries we use).
2. Art credits, grouped by source.
3. Audio credits, grouped by source.
4. Music credits.
5. Font credits.

Each entry follows: `Title - Author - Source link - License`.

Example layout:

```
ENGINE
  browser-game-engine framework  -  fredthesled

LIBRARIES
  jsfxr  -  Eric Fredricksen, Chris McCormick  -  github.com/chr15m/jsfxr  -  MIT
  Howler.js  -  James Simpson  -  howlerjs.com  -  MIT

ART
  Player sprite  -  Kenney  -  kenney.nl  -  CC0
  Tileset  -  Pixel Frog  -  pixelfrog-assets.itch.io  -  CC0

AUDIO
  Background music  -  Kevin MacLeod  -  incompetech.com  -  CC-BY 4.0
  UI sounds  -  generated with jsfxr (parameters in source)

FONTS
  Press Start 2P  -  CodeMan38  -  Google Fonts  -  OFL
```

## Manifest format (for a generic CreditsScene)

A future `CreditsScene` script will read a JSON manifest from each game's folder (`games/<name>/credits.json`) and render it as a scrolling list. Proposed schema:

```json
{
  "engine": [
    { "title": "browser-game-engine", "author": "fredthesled" }
  ],
  "libraries": [
    { "title": "jsfxr", "author": "Eric Fredricksen, Chris McCormick", "source": "https://github.com/chr15m/jsfxr", "license": "MIT" }
  ],
  "art": [
    { "title": "Player sprite", "author": "Kenney", "source": "https://kenney.nl", "license": "CC0" }
  ],
  "audio": [],
  "music": [],
  "fonts": []
}
```

The `CreditsScene` script renders this manifest. Each entry's `license` field can map to a small library of license summaries the scene also displays on demand. This is not yet implemented; the manifest format is the contract to design against when we build it.

## When you forgot to credit

If a game has shipped without proper attribution, you have two repair options:

1. Add the credit retroactively to the credits scene in the next release.
2. If the source is no longer reachable to confirm the license, replace the asset with a properly-licensed alternative.

Don't simply remove the credit and assume CC0. The original author's rights persist regardless of whether you advertise them.

## A note on AI-generated assets

Several asset sources host AI-generated content. Their licensing status is contested in some jurisdictions and varies by source platform. When in doubt, prefer human-authored CC0 work to avoid future legal ambiguity. If you do use AI-generated assets, document the generator and the prompt in the credits manifest under `notes` so the provenance is clear.
