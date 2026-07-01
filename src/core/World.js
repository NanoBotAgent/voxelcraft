// World.js - World manager (chunks, dimensions)
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_MIN_Y } from './Chunk.js';
import { BlockRegistry } from './BlockRegistry.js';
import { NoiseGenerator } from '../worldgen/NoiseGenerator.js';
import { BiomeProvider } from '../worldgen/BiomeProvider.js';
import { WorldGenerator } from '../worldgen/WorldGenerator.js';

export class World {
  constructor(game, name, seed, gamemode = 'survival', difficulty = 'normal') {
    this.game = game;
    this.name = name;
    this.seed = seed;
    this.gamemode = gamemode;
    this.difficulty = difficulty;
    this.chunks = new Map(); // key: "cx,cz" -> Chunk
    this.dimension = 'overworld';
    this.time = 0; // game ticks (0-24000)
    this.weather = 'clear';
    this.weatherTimer = 0;
    this.spawnPoint = { x: 0, y: 80, z: 0 };
    this.noiseGen = new NoiseGenerator(seed);
    this.biomeProvider = new BiomeProvider(this.noiseGen);
    this.worldGen = new WorldGenerator(this.noiseGen, this.biomeProvider, game.blockRegistry);
    this.renderDistance = 8; // reduced from 12 for performance
    this.entities = [];
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getChunk(cx, cz) {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  setChunk(cx, cz, chunk) {
    this.chunks.set(this.getChunkKey(cx, cz), chunk);
  }

  removeChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (chunk && chunk.mesh) {
      chunk.mesh.geometry.dispose();
      chunk.mesh.material.dispose();
    }
    this.chunks.delete(key);
  }

  // Get block at world coordinates
  getBlock(x, y, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return { id: 0, state: 0 };
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getBlock(lx, y, lz);
  }

  // Set block at world coordinates
  setBlock(x, y, z, id, state = 0) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(lx, y, lz, id, state);

    // Mark neighbor chunks dirty if on edge
    if (lx === 0) this.markChunkDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markChunkDirty(cx + 1, cz);
    if (lz === 0) this.markChunkDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markChunkDirty(cx, cz + 1);
  }

  markChunkDirty(cx, cz) {
    const chunk = this.getChunk(cx, cz);
    if (chunk) chunk.meshDirty = true;
  }

  // Get highest non-air block at (x, z)
  getHeight(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return CHUNK_MIN_Y;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    for (let y = CHUNK_HEIGHT - 1 + CHUNK_MIN_Y; y >= CHUNK_MIN_Y; y--) {
      const block = chunk.getBlock(lx, y, lz);
      if (block.id !== 0) return y;
    }
    return CHUNK_MIN_Y;
  }

  // Generate spawn area
  generateSpawn() {
    const rd = this.renderDistance;
    const pcx = Math.floor(this.spawnPoint.x / CHUNK_SIZE);
    const pcz = Math.floor(this.spawnPoint.z / CHUNK_SIZE);

    for (let dx = -rd; dx <= rd; dx++) {
      for (let dz = -rd; dz <= rd; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        if (!this.getChunk(cx, cz)) {
          const chunk = this.worldGen.generateChunk(cx, cz, this.dimension);
          this.setChunk(cx, cz, chunk);
        }
      }
    }

    // Find actual spawn height
    this.spawnPoint.y = this.getHeight(this.spawnPoint.x, this.spawnPoint.z) + 1;
  }

  // Update chunks around player - incremental loading
  updateChunks(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    const rd = this.renderDistance;

    // Load new chunks (limit per frame to avoid freezing)
    let loaded = 0;
    const maxLoadPerFrame = 2;

    for (let dx = -rd; dx <= rd && loaded < maxLoadPerFrame; dx++) {
      for (let dz = -rd; dz <= rd && loaded < maxLoadPerFrame; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        if (!this.getChunk(cx, cz)) {
          const chunk = this.worldGen.generateChunk(cx, cz, this.dimension);
          this.setChunk(cx, cz, chunk);
          loaded++;
        }
      }
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      const dx = chunk.cx - pcx;
      const dz = chunk.cz - pcz;
      if (Math.abs(dx) > rd + 2 || Math.abs(dz) > rd + 2) {
        this.removeChunk(chunk.cx, chunk.cz);
      }
    }
  }

  tick(dt) {
    this.time += dt * 20; // 20 TPS
    if (this.time >= 24000) this.time -= 24000;

    // Weather
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      if (this.weather === 'clear') {
        this.weather = Math.random() < 0.2 ? 'rain' : 'clear';
        this.weatherTimer = 120 + Math.random() * 360; // 6-24 min
      } else {
        this.weather = 'clear';
        this.weatherTimer = 60 + Math.random() * 300; // 3-18 min
      }
    }
  }

  isRaining() {
    return this.weather === 'rain' || this.weather === 'thunder';
  }

  isDaytime() {
    return this.time >= 0 && this.time < 12000;
  }

  getDayFraction() {
    return this.time / 24000;
  }
}
