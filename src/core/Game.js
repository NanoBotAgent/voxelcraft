// Game.js - Main game orchestrator
import { World } from './World.js';
import { BlockRegistry } from './BlockRegistry.js';
import { ItemRegistry } from './ItemRegistry.js';
import { Scheduler } from './Scheduler.js';
import { EventBus } from './EventBus.js';
import { Storage } from './Storage.js';
import { Renderer } from '../render/Renderer.js';
import { Camera } from '../render/Camera.js';
import { Sky } from '../render/Sky.js';
import { Player } from '../player/Player.js';
import { PlayerController } from '../player/PlayerController.js';
import { InputManager } from '../input/InputManager.js';
import { UIManager } from '../ui/UIManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { TextureAtlas } from '../render/TextureAtlas.js';
import { ChunkMesher } from '../render/ChunkMesher.js';

export class Game {
  constructor() {
    this.world = null;
    this.player = null;
    this.renderer = null;
    this.camera = null;
    this.sky = null;
    this.input = null;
    this.ui = null;
    this.audio = null;
    this.scheduler = new Scheduler();
    this.events = new EventBus();
    this.storage = new Storage();
    this.blockRegistry = new BlockRegistry();
    this.itemRegistry = new ItemRegistry();
    this.textureAtlas = null;
    this.running = false;
    this.lastTime = 0;
    this.simAccumulator = 0;
    this.SIM_TICK_MS = 50; // 20 TPS
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
  }

  async loadRegistries() {
    this.blockRegistry.registerDefaults();
    this.itemRegistry.registerDefaults();
  }

  async generateTextures() {
    this.textureAtlas = new TextureAtlas(16, 16);
    this.textureAtlas.generateDefaults();
  }

  async initRenderer() {
    const app = document.getElementById('app');
    this.renderer = new Renderer(app, this.textureAtlas);
    this.camera = new Camera(this.renderer.getCamera());
    this.sky = new Sky(this.renderer.getScene());
  }

  initInput() {
    this.input = new InputManager(this.renderer.getCanvas());
    this.player = new Player(this);
    this.playerController = new PlayerController(this.player, this.input);
    this.ui = new UIManager(this);
    this.audio = new AudioManager();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.events.emit('game:start');
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
    this.events.emit('game:stop');
  }

  loop(now) {
    if (!this.running) return;

    const delta = now - this.lastTime;
    this.lastTime = now;

    // FPS counter
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Fixed timestep simulation (20 TPS)
    this.simAccumulator += delta;
    const maxAccum = this.SIM_TICK_MS * 5; // prevent spiral of death
    if (this.simAccumulator > maxAccum) this.simAccumulator = maxAccum;

    while (this.simAccumulator >= this.SIM_TICK_MS) {
      this.simUpdate(this.SIM_TICK_MS / 1000);
      this.simAccumulator -= this.SIM_TICK_MS;
    }

    const alpha = this.simAccumulator / this.SIM_TICK_MS;
    this.render(alpha);

    requestAnimationFrame((t) => this.loop(t));
  }

  simUpdate(dt) {
    this.scheduler.tick();
    if (this.world) this.world.tick(dt);
    if (this.player) this.player.tick(dt);
    if (this.playerController) this.playerController.tick(dt);
    // Update chunks around player
    if (this.world && this.player) {
      this.world.updateChunks(this.player.position.x, this.player.position.z);
    }
  }

  render(alpha) {
    if (this.camera) this.camera.update(alpha);
    if (this.sky && this.world) {
      const skyColor = this.sky.updateFromWorldTime(this.world.time);
      if (skyColor && this.renderer) this.renderer.setFogColor(skyColor);
    }
    if (this.renderer && this.world) this.renderer.updateChunkMeshes(this.world);
    if (this.renderer) this.renderer.render();
    if (this.ui) this.ui.update();
  }

  createWorld(name, seed, gamemode, difficulty) {
    this.world = new World(this, name, seed, gamemode, difficulty);
    this.world.generateSpawn();
    this.player.spawn(this.world);
    this.events.emit('world:create', { name, seed });
  }

  loadWorld(id) {
    // TODO: load from IndexedDB
  }

  saveWorld() {
    if (this.world) this.storage.saveWorld(this.world);
  }
}
