// Chunk.js - 16x16x384 chunk data structure
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 384;
export const CHUNK_MIN_Y = -64;
export const SEA_LEVEL = 63;

export class Chunk {
  constructor(cx, cz, dimension = 'overworld') {
    this.cx = cx;
    this.cz = cz;
    this.dimension = dimension;

    // Block storage: 16*16*384 = 98,304 blocks per chunk
    this.blockIds = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    this.blockStates = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);

    // Light storage: 4 bits sky + 4 bits block = 1 byte per block
    this.light = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);

    // Mesh reference
    this.mesh = null;
    this.meshDirty = true;
    this.lightDirty = true;

    // Status
    this.status = 'empty'; // 'empty' | 'generating' | 'generated' | 'meshing' | 'ready'

    // Modification tracking
    this.modified = false;

    // Biome data (one per column, 16x16)
    this.biomes = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  }

  getIndex(x, y, z) {
    const yo = y - CHUNK_MIN_Y;
    return (yo * CHUNK_SIZE * CHUNK_SIZE) + (z * CHUNK_SIZE) + x;
  }

  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return { id: 0, state: 0 };
    const yo = y - CHUNK_MIN_Y;
    if (yo < 0 || yo >= CHUNK_HEIGHT) return { id: 0, state: 0 };
    const idx = this.getIndex(x, y, z);
    return { id: this.blockIds[idx], state: this.blockStates[idx] };
  }

  setBlock(x, y, z, id, state = 0) {
    const idx = this.getIndex(x, y, z);
    this.blockIds[idx] = id;
    this.blockStates[idx] = state;
    this.meshDirty = true;
    this.lightDirty = true;
    this.modified = true;
  }

  getSkyLight(x, y, z) {
    const idx = this.getIndex(x, y, z);
    return (this.light[idx] >> 4) & 0x0F;
  }

  getBlockLight(x, y, z) {
    const idx = this.getIndex(x, y, z);
    return this.light[idx] & 0x0F;
  }

  setLight(x, y, z, sky, block) {
    const idx = this.getIndex(x, y, z);
    this.light[idx] = (sky << 4) | block;
  }

  getBiome(x, z) {
    return this.biomes[z * CHUNK_SIZE + x];
  }

  setBiome(x, z, biomeId) {
    this.biomes[z * CHUNK_SIZE + x] = biomeId;
  }

  // Get world coordinates from chunk-local
  getWorldX(x) { return this.cx * CHUNK_SIZE + x; }
  getWorldZ(z) { return this.cz * CHUNK_SIZE + z; }
}
