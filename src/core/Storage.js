// Storage.js - IndexedDB wrapper for world saves
import { openDB } from 'idb';

const DB_NAME = 'voxelcraft-worlds';
const DB_VERSION = 1;

export class Storage {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('worlds')) {
          db.createObjectStore('worlds', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('player')) {
          db.createObjectStore('player', { keyPath: 'worldId' });
        }
      },
    });
  }

  async saveWorld(world) {
    if (!this.db) await this.init();
    const worldData = {
      id: world.name,
      name: world.name,
      seed: world.seed,
      gamemode: world.gamemode,
      difficulty: world.difficulty,
      time: world.time,
      weather: world.weather,
      spawnPoint: { ...world.spawnPoint },
      created: Date.now(),
      lastPlayed: Date.now(),
    };
    await this.db.put('worlds', worldData);
  }

  async loadWorld(name) {
    if (!this.db) await this.init();
    return this.db.get('worlds', name);
  }

  async listWorlds() {
    if (!this.db) await this.init();
    return this.db.getAll('worlds');
  }

  async deleteWorld(name) {
    if (!this.db) await this.init();
    await this.db.delete('worlds', name);
  }

  async saveChunk(worldName, cx, cz, chunkData) {
    if (!this.db) await this.init();
    await this.db.put('chunks', {
      key: `${worldName}:${cx}:${cz}`,
      data: chunkData,
    });
  }

  async loadChunk(worldName, cx, cz) {
    if (!this.db) await this.init();
    return this.db.get('chunks', `${worldName}:${cx}:${cz}`);
  }

  async savePlayer(worldName, playerData) {
    if (!this.db) await this.init();
    await this.db.put('player', { worldId: worldName, ...playerData });
  }

  async loadPlayer(worldName) {
    if (!this.db) await this.init();
    return this.db.get('player', worldName);
  }
}
