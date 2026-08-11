# Warden of the Wild

A compact elemental tower-defense game built for the browser. Defend the Heartstone through six escalating waves by combining Fire, Frost, Storm, and Nature towers.

## Elemental reactions

- **Thermal Shock:** Fire detonates Frost and permanently cracks armor.
- **Overgrowth Arc:** Storm chains farther through rooted enemies.
- **Toxic Flame:** Fire spreads burning poison through nearby targets.
- **Permafrost:** Frost locks poisoned enemies in place.
- **Superconduct:** Storm arcs farther through frozen groups.
- **Wildfire:** Nature spreads burning growth across nearby enemies.

The game includes ten tower sites, three-level tower upgrades, per-tower target priorities, three regular enemy archetypes, a two-phase boss, reaction combo scoring, the active Wild Surge battlefield power, persistent best scores, responsive touch controls, automatic wave timing, pause/fast-forward controls, and full restart support. A contextual first-battle briefing teaches placement, wave control, and reactions without stopping play. The campaign shell includes a level map, tower guide, bestiary, and settings folio.

Sound, difficulty, speed, automatic waves, screen shake, and damage-number preferences persist between sessions. Veteran mode makes enemies tougher and awards a 50% score bonus for replay runs.

The original visual direction uses a bright illustrated woodland, chunky stone-and-timber tower silhouettes, animated water and vegetation, weighted enemy movement, distinct reaction silhouettes, exaggerated impact effects, and carved wood-and-parchment controls. The level-one Ember Forge uses the first production raster asset; the remaining towers and enemies currently combine authored direction with procedural animation while the asset pipeline expands.

## Run locally

```bash
npm install
npm run dev
```

Then open the local address shown in the terminal. Use `npm test` for the production build and render check.
