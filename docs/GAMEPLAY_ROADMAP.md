# Warden of the Wild — Gameplay Foundation Roadmap

This document locks the mechanics that should be finalized before the remaining production art and animation are created.

## Element identities

| Element | Primary role | Applies | Core payoff |
| --- | --- | --- | --- |
| Ember | Pressure and finishing | Burn | Stacking damage, armor cracking, execution |
| Frost | Control | Chill, then Frozen | Slowing groups and creating brittle targets |
| Storm | Spread | Conductive | Chaining damage through prepared groups |
| Wild | Preparation | Poison and Root | Vulnerability, zone control and battlefield growth |

Elemental states must use both color and unique symbols so they remain readable without color perception.

## Reaction matrix

| Trigger | Reaction | Tactical result |
| --- | --- | --- |
| Ember → Frozen | Thermal Shock | Area burst, removes Frozen, breaks armor |
| Storm → Frozen | Superconduct | Extended chains and a brief stun |
| Storm → Rooted | Overgrowth Arc | Lightning propagates through nearby rooted enemies |
| Ember → Poisoned | Toxic Flame | Expanding damage cloud and burn spread |
| Frost → Poisoned | Permafrost | Damaging crystal prison |
| Wild → Burning | Wildfire | Burning spreads through nearby Wild growth |

Every reaction requires a unique icon, impact silhouette, sound cue, combat label and bestiary entry. Reactions should solve different tactical problems rather than only multiplying damage.

## Tower specialization branches

- **Ember Forge**
  - Blast Furnace: area damage and armor destruction
  - Cinderwatch: rapid burn stacking and execution damage
- **Frost Spire**
  - Glacial Keep: longer freezes and area control
  - Brittle Needle: focused damage against chilled targets
- **Storm Bastion**
  - Tempest Coil: more chains and group clearing
  - Thunder Judge: slower attacks, stuns and elite damage
- **Wild Lodge**
  - Briarheart: roots, poison zones and reaction setup
  - Grovekeeper: summoned guardians and sustained lane control

The first implementation may expose branch selection at level two and a defining branch upgrade at level three.

## First-battle onboarding

Tutorial steps are interactive and skippable:

1. Enter Hollow Road and identify the Heartstone.
2. Highlight one foundation and build Ember.
3. Defeat a small scout group.
4. Build Frost on a highlighted second foundation.
5. Freeze a target and trigger Thermal Shock.
6. Select a tower and explain targeting and upgrades.
7. Introduce Wild Surge.
8. Return full wave control to the player.

Tutorial prompts pause only when necessary, spotlight one action, preserve keyboard support and can be disabled permanently from settings.

## Wave controls

Three compatible behaviors:

- **Manual:** waves begin only when called.
- **Auto:** a visible ten-second countdown begins after combat clears.
- **Rush:** the player may overlap the next assault for a Sunstone reward.

Required controls and feedback:

- Pause, 1×, 2× and 3× speed
- Auto-wave toggle on the battle HUD
- Optional pause between waves
- Incoming-enemy preview with resistance icons
- Boss warning
- Optional early-wave confirmation
- Countdown can always be skipped by calling the wave immediately

## Persistent settings

### Gameplay

- Difficulty
- Auto waves
- Pause between waves
- Early-wave confirmation
- Tutorial prompts

### Audio

- Master, music, effects and voice volume

### Visual

- Screen shake
- Damage numbers
- Reaction labels
- Reduced effects

### Accessibility

- Reduced motion
- High-contrast status indicators
- Larger interface
- Color-independent elemental symbols

### Controls

- Keyboard shortcut reference
- Reset controls to defaults

Persist settings locally and apply them before the first battle renders.

## Implementation order

1. Extract elemental state and reaction resolution into testable functions.
2. Implement the six-reaction matrix and readable status indicators.
3. Add wave automation, countdown and persisted settings.
4. Build the tutorial state machine and skip path.
5. Add tower branches and update the field guide.
6. Balance all six waves in standard and veteran modes.
7. Lock mechanics before producing the remaining animated art families.

## Acceptance criteria

- A new player can complete wave one without consulting the field guide.
- Auto-wave and manual modes both complete the entire level without state errors.
- Every reaction can be deliberately produced and visually distinguished.
- Settings survive reload and affect the first rendered battle frame.
- The tutorial can be completed with mouse or keyboard and skipped safely.
- No single tower element is sufficient as the dominant strategy on veteran difficulty.

