# Warden of the Wild — Vertical Slice Art Bible

## North star

The production target is [`docs/concepts/hollow-road-target-frame.png`](concepts/hollow-road-target-frame.png). It is a direction reference, not a shippable background: every interactive object must become a separate, consistently scaled game asset.

The visual premise is **an enchanted field journal brought to life**. Hollow Road mixes charming woodland folklore with tactile elemental magic. It should feel illustrated and authored, never like a collection of geometric canvas primitives or unrelated generated assets.

## Visual language

- **Silhouette:** chunky, asymmetric shapes with a dark olive ink edge.
- **Surface:** gouache-like color variation, carved wood, mossy stone, tarnished brass, roots and foliage.
- **Value hierarchy:** background scenery is quiet; road and foundations are mid-contrast; towers and enemies carry the darkest outlines; attacks own the brightest values.
- **Scale:** ordinary enemies render around 44–56 px tall at a 1000×620 logical battlefield. Brutes are 64–76 px. The boss is 100–120 px. Level-one towers are approximately 82–96 px tall.
- **Perspective:** elevated three-quarter view. Vertical faces remain visible, while circular foundations read as shallow ellipses.
- **Humor:** small operators, expressive reactions, crooked construction and ambient wildlife prevent the Hollow from becoming grimdark.

## Palette

| Role | Color |
| --- | --- |
| Briar green | `#477345` |
| Moss light | `#83A95C` |
| Parchment path | `#D5AE68` |
| Charcoal ink | `#292B23` |
| Warden gold | `#E2BD58` |
| Hollow violet | `#694C79` |

Elemental effects may exceed this palette, but their cores should approach white and their outer glow should remain element-specific.

## Battlefield layers

Render from back to front:

1. Painted ground and distant canopy
2. Cliffs, water, ruins and non-interactive architecture
3. Road and roadside wear
4. Tower foundations and interactive markers
5. Towers, enemies and projectiles sorted by world Y
6. Status effects and reaction bursts
7. Foreground foliage and framing silhouettes
8. Illustrated HUD

The path must remain readable at a glance. Decorative assets may overlap its edge but never obscure its centerline or enemy silhouettes.

## Signature system: the living battlefield

Element use permanently marks the level during a battle:

- Ember scorches grass and leaves glowing cinders.
- Frost crystallizes stones and roadside plants.
- Storm wakes dormant runes and briefly lights nearby metal.
- Wild spreads roots, moss and small flowers.

These marks should accumulate subtly around active towers. This is Warden of the Wild's distinguishing visual system, not generic combat decoration.

## Vertical-slice asset list

### Environment

- Hollow Road painted base
- Hollow gate, Heartstone shrine and waterfall
- 3 ruin clusters, 4 fence clusters and 6 flower/mushroom clusters
- 3 foreground foliage silhouettes
- 10 foundation states: dormant, hovered, occupied and selected
- Elemental ground-mark decals for all four elements

### Towers

Each tower needs levels 1–3, an operator where appropriate, and idle, anticipation, attack, impact-response and upgrade animations.

- Ember Forge: furnace recoil, bellows operator and chimney embers
- Frost Spire: rotating crystal, charge compression and ice fracture
- Storm Observatory: conductor operator, coil wind-up and lightning release
- Wildwood Lodge: archer/druid operator, branch draw and seed launch

### Enemies

Each enemy needs walk, hit, status, attack/goal, death and portrait art.

- Hollow Scout: 8-frame walk, 2 hit poses, 6-frame tumble
- Briar Brute: 8-frame walk, armor-break overlay, 8-frame collapse
- Lifebloom Wisp: 8-frame float, heal pulse and dissipating death
- Ashen Warden: 10-frame walk, phase transition, attack and boss death

### Effects

- Ember projectile, impact, burn loop and scorched decal
- Frost projectile, impact, chill loop and frozen break
- Storm chain segments, impact flash and awakened-rune decal
- Wild seed, poison loop, root emergence and flower decal
- Thermal Shock, Toxic Flame and Overgrowth Arc hero effects

### Interface

- Carved top status rail
- Illustrated tower-selection tray
- Parchment tower card and upgrade branches
- Wave horn, speed, pause and spell controls
- Campaign map, bestiary plates and intro/victory panels

## Animation rules

- Every attack uses anticipation, release, impact and recovery.
- Enemies visibly recoil on meaningful hits; rapid damage-over-time ticks do not restart the full reaction.
- Towers briefly squash or recoil opposite the projectile direction.
- Deaths preserve momentum and direction instead of fading in place.
- Major reactions may use 2–4 px camera shake; ordinary hits should not shake the camera.
- Reduced-motion mode removes camera shake and large scaling, while retaining readable flashes.

## Definition of done for the first art slice

The new renderer is ready to expand only after one encounter containing Ember, Frost, Scouts and Brutes:

- matches the target frame's scale and value hierarchy;
- includes complete attack and hit choreography;
- remains readable with twelve enemies on screen;
- works at desktop and mobile aspect ratios;
- contains no procedural placeholder art in the playable focal area;
- passes a full wave without visual clipping or animation-state errors.
