# Asset Sources

Curated list of free or freely-licensed sources for game art, audio, and fonts. The goal is breadth (cover most needs) without sprawl. Prefer CC0 / public domain where available, since it eliminates the per-asset attribution-tracking overhead.

## All-in-one

### Kenney.nl

- **URL**: https://kenney.nl/assets
- **License**: CC0 (public domain) for nearly all assets.
- **Coverage**: 2D sprites, 3D models, UI elements, fonts, audio (sound effects and music).
- **Style**: Clean, consistent across packs. Mix-and-match friendly.
- **Why this is first**: One person has produced over 40,000 CC0 assets. The art style is consistent enough that combining packs from different categories looks intentional rather than stitched together. Best single source for prototypes.
- **Notable packs**: Game Assets All-in-1, multiple Audio packs, UI Pack, 1-Bit Pack.

### Itch.io free game assets

- **URL**: https://itch.io/game-assets/free, or filter to public domain only via https://itch.io/game-assets/assets-cc0
- **License**: Varies per pack. Filter by `tag-cc0` or `assets-cc0` for public domain only.
- **Coverage**: Everything: 2D, 3D, audio, complete game kits.
- **Why it is here**: Active community, recent releases, large variety. New packs appear weekly.
- **Caveat**: Per-pack licensing must be checked. The platform mixes CC0, CC-BY, custom-permissive, and paid-with-free-tier under one filter system.

### OpenGameArt.org

- **URL**: https://opengameart.org/
- **License**: Each asset specifies its own. Site accepts CC0, OGA-BY, CC-BY, CC-BY-SA, WTFPL, public domain.
- **Coverage**: 2D and 3D art, audio, music, fonts.
- **Why it is here**: Long-running community-driven repository with a deep back catalog.
- **Caveat**: Quality varies. Some packs are dated. Check the license per asset, not per uploader.

## 2D and pixel art

### CraftPix.net (free section)

- **URL**: https://craftpix.net/freebies/
- **License**: Custom permissive: free for commercial use, no attribution required, but you cannot redistribute the assets themselves as a separate pack.
- **Coverage**: Tilesets, character sprites, backgrounds, GUI, icons.
- **Why it is here**: Higher production polish than most CC0 packs. The free section is a curated subset of their paid catalog.

### Pixel Frog

- **URL**: https://pixelfrog-assets.itch.io/
- **License**: CC0 for many packs. Per-pack check required.
- **Coverage**: Pixel-art platformer assets, characters, environments. Particularly known for the "Treasure Hunters" and "Pixel Adventure" series.

### Lospec Palette List

- **URL**: https://lospec.com/palette-list
- **License**: Most palettes are public domain or CC0.
- **Use case**: When making your own pixel art (or recoloring), start from a curated palette rather than picking colors freehand. The aesthetic improvement is disproportionate to the effort.

## 3D models (low priority for our 2D Canvas focus)

### Quaternius

- **URL**: https://quaternius.com/
- **License**: CC0.
- **Coverage**: Stylized low-poly 3D models (characters, vehicles, environments, weapons).
- **Note**: Filed here for completeness. Our framework targets 2D Canvas; these would only be relevant if a future game uses three.js.

### Poly Haven

- **URL**: https://polyhaven.com/
- **License**: CC0.
- **Coverage**: 3D models, HDRIs, textures.

## Sound effects

### Freesound

- **URL**: https://freesound.org/
- **License**: Per-sound. Filter by CC0 for public domain. CC-BY also common.
- **Coverage**: 600,000+ sounds. Field recordings, foley, synth, vocal.
- **Why it is first**: Largest CC-licensed sound library on the web. Searchable, taggable, with detailed metadata.
- **Caveat**: License is per-clip. Always check before downloading.

### Zapsplat

- **URL**: https://www.zapsplat.com/
- **License**: Custom. Free with basic account, attribution required for non-premium downloads. The CC0 subset (https://www.zapsplat.com/license-type/cc0-1-0-universal/) avoids the attribution requirement.
- **Coverage**: Over 150,000 sounds.
- **Caveat**: Free-tier attribution requirement is annoying to track. Prefer the CC0 subset.

### Mixkit (sound effects)

- **URL**: https://mixkit.co/free-sound-effects/
- **License**: Mixkit license. Free for commercial use, no attribution.
- **Coverage**: Curated, smaller library, polished UI and cinematic sounds.

### BBC Sound Effects archive

- **URL**: https://sound-effects.bbcrewind.co.uk/
- **License**: RemArc license. Free commercial and non-commercial with attribution.
- **Coverage**: Field recordings, foley, ambient. Less "gamey" than the others, more documentary-feel.

### Pixabay sound effects

- **URL**: https://pixabay.com/sound-effects/
- **License**: Pixabay Content License. Free for commercial use, no attribution required.
- **Coverage**: Curated, decent size.

### FilmCow Royalty Free Sound Effects Library

- **URL**: https://filmcow.itch.io/filmcow-sfx
- **License**: Royalty-free, free for commercial use without attribution.
- **Coverage**: Massive single download (multiple gigabytes) of varied SFX, often used in indie animation and game dev.

### Sonniss GDC bundles

- **URL**: https://sonniss.com/gameaudiogdc
- **License**: Royalty-free, free for commercial use.
- **Coverage**: Annual GDC bundle (40+ GB across years). Professional-quality recordings from many studios.

## Music

### Kenney audio packs

See the Kenney section above. Multiple music packs, all CC0.

### OpenGameArt music

- **URL**: https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=12
- **License**: Per-track. Plenty of CC0 and CC-BY.
- **Coverage**: Loops and full tracks across genres.

### Pixabay music

- **URL**: https://pixabay.com/music/
- **License**: Pixabay Content License.

### Incompetech (Kevin MacLeod)

- **URL**: https://incompetech.com/
- **License**: CC-BY 4.0 for free use, or paid royalty-free without attribution.
- **Coverage**: Large catalog across genres. Heavily used in indie games and YouTube content.
- **Note**: If using free, the CC-BY attribution must appear in the credits.

## Fonts

### Google Fonts

- **URL**: https://fonts.google.com/
- **License**: Open Font License (OFL) for nearly all fonts. Free commercial use, no attribution required.
- **Coverage**: Massive library, well-tagged.
- **Use case**: Most non-pixel UI text.

### Fontspace (Public Domain section)

- **URL**: https://www.fontspace.com/category/public-domain
- **License**: Public domain only when filtered.
- **Coverage**: Many novelty and display fonts.

### Pixel fonts

For pixel-art games where a TTF doesn't quite fit, several creators have CC0 pixel fonts with clean low-resolution renderings. Daniel Linssen has a useful set; one good entry point: https://managore.itch.io/m5x7

## Authoring tools (use to create your own assets)

These run in the browser and produce assets we can bundle. They are not assets themselves; they are how you make them.

### BeepBox / JummBox / UltraBox (chiptune music)

- **URLs**: https://www.beepbox.co/, https://jummb.us/, https://ultrabox.blog/
- **License**: Source code is MIT. Songs you make are yours; the tools claim no ownership.
- **What they do**: In-browser chiptune music sequencers. Songs are encoded into the URL hash, so you can share or save by copying the URL. Export to WAV or MP3.
- **Why this matters**: You can compose original game music in a browser, no install needed. Output is yours to use under any license you choose.
- **JummBox** is the most active fork with the deepest feature set. **UltraBox** is the maximalist option (32 channels, custom samples). **BeepBox** itself is the simplest and is plenty for most retro games.

### sfxr.me (jsfxr web UI)

- **URL**: https://sfxr.me/
- **What it does**: Browser-based sound effects designer. Tweak knobs, hear the result, copy the resulting JSON or short base58 string into your game's source.
- **Why this matters**: SFX live in code as small JSON, not as audio files. Zero asset management overhead. See the `jsfxr` entry in `libraries.md`.

### sfxr.me Pro / similar tools

A paid pro version of jsfxr exists with a bundle export feature. Not necessary for most games; the free web UI plus copying JSON works fine.

## Procedural alternatives

When you don't want to manage asset files at all:

- **Sound effects**: jsfxr or ZzFX (see `libraries.md`). Sounds live as small parameter blocks in source.
- **Sprite generation**: For prototyping, draw shapes via the Canvas API. Skip the sprite step entirely. Our `RectRenderer` is the start of this; a `CircleRenderer` and `PolygonRenderer` are easy follow-ups when needed.
- **Music**: Tone.js (see `libraries.md`) can compose chiptune-style music procedurally. Heavier, but no audio files.
