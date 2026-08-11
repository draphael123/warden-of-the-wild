# Warden of the Wild art reference

This folder is the non-runtime archive for the authored character and tower sheets used by the vertical slice. The game continues to load optimized production copies from `public/assets`; files here are preserved so future levels, animation passes, and redesigns have a stable visual reference.

## Current production sheets

### Towers

| Sheet | Runtime status | Visual role |
| --- | --- | --- |
| `sprite-sheets/towers/ember-forge-l1-v3.png` | Current | Human Ember keeper, chunky forge silhouette, flat gouache fire treatment |
| `sprite-sheets/towers/frost-spire-l1.png` | Current | Ice-grown tower, crystalline crown, cold blue-green palette |
| `sprite-sheets/towers/storm-bastion-l1-v2.png` | Current | Conductive rods, exaggerated lightning silhouette, violet storm palette |
| `sprite-sheets/towers/wild-lodge-l1.png` | Current | Root-grown lodge, leaves and spores, cultivated living architecture |

### Enemies

| Sheet | Runtime status | Visual role |
| --- | --- | --- |
| `sprite-sheets/enemies/hollow-scout.png` | Current | Fast light infantry silhouette |
| `sprite-sheets/enemies/briar-brute.png` | Current | Heavy armored woodland brute |
| `sprite-sheets/enemies/lifebloom-wisp.png` | Current | Floating regenerative support creature |
| `sprite-sheets/enemies/ashen-warden.png` | Current | Large two-phase boss silhouette |

## Preserved Ember iterations

- `ember-forge-l1.png` — earliest realistic prototype; retained only for comparison.
- `ember-forge-l1-v2.png` — intermediate style correction.
- `ember-forge-l1-v3.png` — current human keeper and approved production direction.

## Art-direction rules

- Chunky inked silhouettes with readable shapes at game scale.
- Flat gouache-like shading rather than realistic rendering.
- Consistent elevated three-quarter perspective and grounded footprints.
- Element-first construction: flame and cracked forge stone, grown ice, conducting rods and arcs, living roots and foliage.
- Keepers are human where present; do not reintroduce the discarded fire-lizard concept.
- Prefer a few large readable forms over noisy micro-detail or generic colored glows.
- New animation frames should preserve the subject's scale and anchor point so they can be swapped without visible jumping.

## Recommended future animation layout

For true frame-by-frame animation, create a new versioned sheet rather than overwriting these references. Use rows for `idle`, `attack`, `hit`, and `death`; keep a consistent cell size, transparent background, ground contact point, and facing direction. Record frame timing and crop coordinates in a neighboring manifest file.

