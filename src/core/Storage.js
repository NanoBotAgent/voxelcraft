// Storage.js - IndexedDB wrapper for world saves (no idb dependency)
const DB_NAME = 'voxelcraft-worlds';
const DB_VERSION = 1;

export class Storage {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('worlds')) {
          db.createObjectStore('worlds', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('player')) {
          db.createObjectStore('player', { keyPath: 'worldId' });
        }
      };
      
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      
      request.onerror = (e) => {
        console.error('IndexedDB open failed:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async saveWorld(world) {
    await this.init();
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
    return this.put('worlds', worldData);
  }

  async loadWorld(name) {
    await this.init();
    return this.get('worlds', name);
  }

  async listWorlds() {
    await this.init();
    return this.getAll('worlds');
  }

  async deleteWorld(name) {
    await this.init();
    return this.delete('worlds', name);
  }

  async saveChunk(worldName, cx, cz, chunkData) {
    await this.init();
    return this.put('chunks', {
      key: `${worldName}:${cx}:${cz}`,
      data: chunkData,
    });
  }

  async loadChunk(worldName, cx, cz) {
    await this.init();
    return this.get('chunks', `${worldName}:${cx}:${cz}`);
  }

  async savePlayer(worldName, playerData) {
    await this.init();
    return this.put('player', { worldId: worldName, ...playerData });
  }

  async loadPlayer(worldName) {
    await this.init();
    return this.get('player', worldName);
  }

  // Low-level IndexedDB helpers
  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
