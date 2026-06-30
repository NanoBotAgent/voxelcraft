// WorldGenerator.js - Orchestrates the 10-stage chunk pipeline
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_MIN_Y, SEA_LEVEL } from '../core/Chunk.js';

export class WorldGenerator {
  constructor(noiseGen, biomeProvider, blockRegistry) {
    this.noiseGen = noiseGen;
    this.biomeProvider = biomeProvider;
    this.blockRegistry = blockRegistry;
  }

  generateChunk(cx, cz, dimension = 'overworld') {
    const chunk = new Chunk(cx, cz, dimension);
    chunk.status = 'generating';

    switch (dimension) {
      case 'overworld':
        this.generateOverworld(chunk);
        break;
      case 'nether':
        this.generateNether(chunk);
        break;
      case 'end':
        this.generateEnd(chunk);
        break;
    }

    // Stage 7: Initial lighting
    this.computeSkyLight(chunk);

    chunk.status = 'generated';
    chunk.meshDirty = true;
    return chunk;
  }

  generateOverworld(chunk) {
    // Stage 1: Noise - basic terrain heightmap
    // Stage 2: Biome - sample biome at each (x, z)
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = chunk.getWorldX(x);
        const wz = chunk.getWorldZ(z);

        // Get biome
        const biomeId = this.biomeProvider.getBiome(wx, wz);
        chunk.setBiome(x, z, biomeId);
        const biomeProps = this.biomeProvider.getBiomeProperties(biomeId);

        // Generate height using multi-octave noise
        const baseHeight = this.getTerrainHeight(wx, wz, biomeId);

        // Stage 3: Surface - fill blocks based on height and biome
        for (let y = CHUNK_MIN_Y; y < CHUNK_HEIGHT + CHUNK_MIN_Y; y++) {
          const yo = y - CHUNK_MIN_Y;

          if (y < CHUNK_MIN_Y + 1) {
            // Bedrock layer
            chunk.setBlock(x, y, z, 10); // bedrock
          } else if (y < CHUNK_MIN_Y + 5) {
            // Deepslate layer
            if (Math.random() < 0.5) chunk.setBlock(x, y, z, 34); // deepslate
            else chunk.setBlock(x, y, z, 1); // stone
          } else if (y < baseHeight - 4) {
            // Stone layer
            chunk.setBlock(x, y, z, 1); // stone

            // Ore generation
            this.placeOres(chunk, x, y, z, wx, wz);
          } else if (y < baseHeight - 1) {
            // Filler layer
            chunk.setBlock(x, y, z, biomeProps.fillerBlock);
          } else if (y < baseHeight) {
            // Top block
            chunk.setBlock(x, y, z, biomeProps.topBlock);
          } else if (y <= SEA_LEVEL && biomeProps.isOcean) {
            // Water in oceans
            chunk.setBlock(x, y, z, 9); // water
          } else if (y <= SEA_LEVEL && y > baseHeight) {
            // Water fill for rivers and low areas
            chunk.setBlock(x, y, z, 9); // water
          }
          // Above surface = air (default)
        }
      }
    }

    // Stage 4: Carving - caves
    this.carveCaves(chunk);

    // Stage 5: Features - trees
    this.placeTrees(chunk);
  }

  getTerrainHeight(wx, wz, biomeId) {
    // Base terrain using octave noise
    const baseScale = 0.003;
    const base = this.noiseGen.octave2D(wx, wz, 6, 0.5, baseScale);

    // Height varies by biome
    let height = SEA_LEVEL + 10;

    // Continentalness affects base height
    const climate = this.noiseGen.getClimateNoise(wx, wz);
    const cont = (climate.continentalness + 1) / 2;

    if (cont < 0.25) {
      // Ocean
      height = SEA_LEVEL - 10;
    } else if (cont < 0.4) {
      // Coast
      height = SEA_LEVEL;
    } else {
      // Land - scale by continentalness
      height = SEA_LEVEL + 5 + (cont - 0.4) * 40;
    }

    // Add noise variation
    height += base * 15;

    // Mountain biomes get extra height
    if (biomeId >= 22 && biomeId <= 26) {
      height += 20 + base * 30;
    }

    // Swamp is flat and low
    if (biomeId === 5) {
      height = SEA_LEVEL + 1;
    }

    return Math.floor(Math.max(CHUNK_MIN_Y + 5, Math.min(CHUNK_HEIGHT + CHUNK_MIN_Y - 5, height)));
  }

  placeOres(chunk, x, y, z, wx, wz) {
    // Coal: Y 0-127, common
    if (y < 128 && this.noiseGen.noise3(wx, y, wz, 0.1) > 0.7) {
      chunk.setBlock(x, y, z, 11); // coal_ore
      return;
    }
    // Iron: Y -64-64, moderate
    if (y < 64 && this.noiseGen.noise3(wx + 100, y, wz, 0.12) > 0.75) {
      chunk.setBlock(x, y, z, 12); // iron_ore
      return;
    }
    // Gold: Y -64-32, rare
    if (y < 32 && this.noiseGen.noise3(wx + 200, y, wz, 0.15) > 0.82) {
      chunk.setBlock(x, y, z, 13); // gold_ore
      return;
    }
    // Diamond: Y -64-16, very rare
    if (y < 16 && this.noiseGen.noise3(wx + 300, y, wz, 0.2) > 0.88) {
      chunk.setBlock(x, y, z, 14); // diamond_ore
      return;
    }
    // Copper: Y -16-112
    if (y < 112 && this.noiseGen.noise3(wx + 400, y, wz, 0.12) > 0.78) {
      chunk.setBlock(x, y, z, 35); // copper_ore
      return;
    }
    // Lapis: Y -64-64
    if (y < 64 && this.noiseGen.noise3(wx + 500, y, wz, 0.13) > 0.83) {
      chunk.setBlock(x, y, z, 36); // lapis_ore
      return;
    }
    // Redstone: Y -64-15
    if (y < 16 && this.noiseGen.noise3(wx + 600, y, wz, 0.15) > 0.75) {
      chunk.setBlock(x, y, z, 38); // redstone_ore
      return;
    }
  }

  carveCaves(chunk) {
    const cx = chunk.cx * CHUNK_SIZE;
    const cz = chunk.cz * CHUNK_SIZE;

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = cx + x;
        const wz = cz + z;

        for (let y = CHUNK_MIN_Y + 10; y < SEA_LEVEL + 20; y++) {
          // Cave noise - 3D noise creates cave-like shapes
          const cave1 = this.noiseGen.noise3(wx, y, wz, 0.05);
          const cave2 = this.noiseGen.noise3(wx + 1000, y, wz + 1000, 0.05);

          // Carve where both noise values are high (creates spaghetti caves)
          if (cave1 > 0.6 && cave2 > 0.6) {
            const block = chunk.getBlock(x, y, z);
            if (block.id !== 10 && block.id !== 9) { // not bedrock or water
              chunk.setBlock(x, y, z, 0); // air
            }
          }
        }
      }
    }
  }

  placeTrees(chunk) {
    const cx = chunk.cx * CHUNK_SIZE;
    const cz = chunk.cz * CHUNK_SIZE;

    for (let x = 2; x < CHUNK_SIZE - 2; x++) {
      for (let z = 2; z < CHUNK_SIZE - 2; z++) {
        const wx = cx + x;
        const wz = cz + z;
        const biomeId = chunk.getBiome(x, z);

        // Tree density based on biome
        let treeChance = 0;
        let logBlock = 6; // oak_log
        let leavesBlock = 7; // oak_leaves

        if (biomeId === 3 || biomeId === 14 || biomeId === 16) { // forest variants
          treeChance = 0.02;
        } else if (biomeId === 1 || biomeId === 15 || biomeId === 21 || biomeId === 27) { // plains variants
          treeChance = 0.003;
        } else if (biomeId === 4 || biomeId === 19) { // taiga
          treeChance = 0.015;
          logBlock = 30; // spruce_log
          leavesBlock = 32; // spruce_leaves
        } else if (biomeId === 17) { // birch_forest
          treeChance = 0.015;
          logBlock = 31; // birch_log
          leavesBlock = 33; // birch_leaves
        } else if (biomeId === 11) { // jungle
          treeChance = 0.025;
        }

        // Use deterministic noise for tree placement
        const treeNoise = this.noiseGen.noise2(wx * 0.5, wz * 0.5, 0.5);
        if (treeNoise > (1 - treeChance * 100)) {
          const surfaceY = this.findSurface(chunk, x, z);
          if (surfaceY > SEA_LEVEL && surfaceY < CHUNK_HEIGHT + CHUNK_MIN_Y - 10) {
            this.placeTree(chunk, x, surfaceY + 1, z, logBlock, leavesBlock, biomeId);
          }
        }
      }
    }
  }

  findSurface(chunk, x, z) {
    for (let y = CHUNK_HEIGHT + CHUNK_MIN_Y - 1; y >= CHUNK_MIN_Y; y--) {
      const block = chunk.getBlock(x, y, z);
      if (block.id !== 0 && block.id !== 9) { // not air or water
        return y;
      }
    }
    return CHUNK_MIN_Y;
  }

  placeTree(chunk, x, y, z, logBlock, leavesBlock, biomeId) {
    const trunkHeight = biomeId === 4 || biomeId === 19 ? 6 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 2);

    // Trunk
    for (let dy = 0; dy < trunkHeight; dy++) {
      if (y + dy < CHUNK_HEIGHT + CHUNK_MIN_Y) {
        chunk.setBlock(x, y + dy, z, logBlock);
      }
    }

    // Leaves (canopy)
    const leafStart = trunkHeight - 2;
    if (biomeId === 4 || biomeId === 19) {
      // Spruce tree - conical shape
      for (let dy = leafStart; dy <= trunkHeight + 1; dy++) {
        const radius = Math.max(0, Math.floor((trunkHeight + 1 - dy) / 2));
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            if (dx === 0 && dz === 0 && dy < trunkHeight) continue; // trunk
            const lx = x + dx;
            const lz = z + dz;
            if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
              const ly = y + dy;
              if (ly < CHUNK_HEIGHT + CHUNK_MIN_Y) {
                const existing = chunk.getBlock(lx, ly, lz);
                if (existing.id === 0) {
                  chunk.setBlock(lx, ly, lz, leavesBlock);
                }
              }
            }
          }
        }
      }
    } else {
      // Oak/birch - round canopy
      for (let dy = leafStart; dy <= trunkHeight + 1; dy++) {
        const radius = dy < trunkHeight ? 2 : 1;
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            if (dx === 0 && dz === 0 && dy < trunkHeight) continue;
            // Round shape
            if (Math.abs(dx) === radius && Math.abs(dz) === radius) continue;
            const lx = x + dx;
            const lz = z + dz;
            if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
              const ly = y + dy;
              if (ly < CHUNK_HEIGHT + CHUNK_MIN_Y) {
                const existing = chunk.getBlock(lx, ly, lz);
                if (existing.id === 0) {
                  chunk.setBlock(lx, ly, lz, leavesBlock);
                }
              }
            }
          }
        }
      }
    }
  }

  computeSkyLight(chunk) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        let skyLight = 15;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          const worldY = y + CHUNK_MIN_Y;
          const block = chunk.getBlock(x, worldY, z);
          if (this.blockRegistry.isOpaque(block.id)) {
            skyLight = 0;
          } else if (this.blockRegistry.isTransparent(block.id) && block.id !== 0) {
            skyLight = Math.max(0, skyLight - 1);
          }
          chunk.setLight(x, worldY, z, skyLight, 0);
        }
      }
    }
  }

  generateNether(chunk) {
    // TODO: Phase 3
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let y = 0; y < 128; y++) {
          chunk.setBlock(x, y, z, 23); // netherrack
        }
      }
    }
  }

  generateEnd(chunk) {
    // TODO: Phase 4
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        chunk.setBlock(x, 0, z, 15); // end stone at bottom
      }
    }
  }
}
