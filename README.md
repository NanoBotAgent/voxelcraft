# VoxelCraft

A vanilla-faithful Minecraft clone for the browser, built with Three.js and deployed on Vercel.

## Features

- Procedural terrain generation with 28 biomes (multi-noise climate system)
- 43 block types with procedural 16x16 pixel textures
- Greedy mesh chunk rendering (16x16x384)
- First/third person camera (F5 toggle)
- Player physics: gravity, jumping, sprinting, sneaking, flying (F)
- Day/night cycle with dynamic sky colors
- Cave generation (spaghetti caves)
- Ore distribution (coal, iron, gold, diamond, copper, lapis, emerald, redstone)
- Tree generation (oak, spruce, birch with biome-appropriate shapes)
- Survival mechanics: health, hunger, fall damage
- HUD: crosshair, hotbar, health/hunger bars, debug screen (F3)
- IndexedDB world save/load
- 20 TPS fixed-timestep simulation
- Keyboard + mouse + pointer lock controls

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Space | Jump / Fly up |
| Shift | Sneak / Fly down |
| Ctrl | Sprint |
| F | Toggle flying |
| F5 | Toggle camera view |
| F3 | Debug overlay |
| ESC | Pause menu |
| 1-9 / Scroll | Hotbar slot |
| Click | Lock cursor |

## Tech Stack

- **Three.js** - WebGL rendering
- **simplex-noise** - Terrain generation
- **idb** - IndexedDB persistence
- **Vite** - Build tooling
- **Vercel** - Deployment

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Architecture

```
src/
  core/       - Game, World, Chunk, Registries, Scheduler, EventBus, Storage
  worldgen/   - NoiseGenerator, BiomeProvider, WorldGenerator
  render/     - Renderer, Camera, Sky, TextureAtlas, ChunkMesher
  player/     - Player, PlayerController
  input/      - InputManager
  ui/         - UIManager
  audio/      - AudioManager
```

## License

MIT
