// World.js - World manager (chunks, dimensions)
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_MIN_Y, SEA_LEVEL } from './Chunk.js';
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
    this.chunks = new Map();
    this.dimension = 'overworld';
    this.time = 6000; // start at morning (6000 = noon-ish)
    this.weather = 'clear';
    this.weatherTimer = 0;
    this.spawnPoint = { x: 0, y: 80, z: 0 };
    this.noiseGen = new NoiseGenerator(seed);
    this.biomeProvider = new BiomeProvider(this.noiseGen);
    this.worldGen = new WorldGenerator(this.noiseGen, this.biomeProvider, game.blockRegistry);
    this.renderDistance = 6; // start smaller for faster initial load
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

  getBlock(x, y, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return { id: 0, state: 0 };
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getBlock(lx, y, lz);
  }

  setBlock(x, y, z, id, state = 0) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(lx, y, lz, id, state);

    if (lx === 0) this.markChunkDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.markChunkDirty(cx + 1, cz);
    if (lz === 0) this.markChunkDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markChunkDirty(cx, cz + 1);
  }

  markChunkDirty(cx, cz) {
    const chunk = this.getChunk(cx, cz);
    if (chunk) chunk.meshDirty = true;
  }

  getHeight(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return SEA_LEVEL;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    for (let y = CHUNK_HEIGHT - 1 + CHUNK_MIN_Y; y >= CHUNK_MIN_Y; y--) {
      const block = chunk.getBlock(lx, y, lz);
      if (block.id !== 0) return y;
    }
    return SEA_LEVEL;
  }

  // Generate only a small 3x3 area for initial spawn
  generateSpawnArea() {
    const pcx = Math.floor(this.spawnPoint.x / CHUNK_SIZE);
    const pcz = Math.floor(this.spawnPoint.z / CHUNK_SIZE);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        if (!this.getChunk(cx, cz)) {
          const chunk = this.worldGen.generateChunk(cx, cz, this.dimension);
          this.setChunk(cx, cz, chunk);
        }
      }
    }

    this.spawnPoint.y = this.getHeight(this.spawnPoint.x, this.spawnPoint.z) + 2;
  }

  // Incremental chunk loading around player
  updateChunks(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    const rd = this.renderDistance;

    let loaded = 0;
    const maxLoadPerFrame = 2;

    // Spiral outward from player for better loading order
    for (let ring = 0; ring <= rd && loaded < maxLoadPerFrame; ring++) {
      for (let dx = -ring; dx <= ring && loaded < maxLoadPerFrame; dx++) {
        for (let dz = -ring; dz <= ring && loaded < maxLoadPerFrame; dz++) {
          if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue; // only ring edge
          const cx = pcx + dx;
          const cz = pcz + dz;
          if (!this.getChunk(cx, cz)) {
            const chunk = this.worldGen.generateChunk(cx, cz, this.dimension);
            this.setChunk(cx, cz, chunk);
            loaded++;
          }
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
    this.time += dt * 20;
    if (this.time >= 24000) this.time -= 24000;

    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      if (this.weather === 'clear') {
        this.weather = Math.random() < 0.2 ? 'rain' : 'clear';
        this.weatherTimer = 120 + Math.random() * 360;
      } else {
        this.weather = 'clear';
        this.weatherTimer = 60 + Math.random() * 300;
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
