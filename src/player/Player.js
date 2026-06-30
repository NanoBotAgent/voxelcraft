// Player.js - Player entity
import * as THREE from 'three';
import { CHUNK_MIN_Y, CHUNK_HEIGHT, SEA_LEVEL } from '../core/Chunk.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.position = new THREE.Vector3(0, 80, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = { yaw: 0, pitch: 0 };

    // Physics
    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.62;
    this.onGround = false;
    this.flying = false;
    this.sneaking = false;
    this.sprinting = false;
    this.swimming = false;

    // Survival stats
    this.health = 20;
    this.maxHealth = 20;
    this.hunger = 20;
    this.maxHunger = 20;
    this.air = 10;
    this.maxAir = 10;
    this.xp = 0;
    this.xpLevel = 0;

    // Movement speeds (blocks/sec)
    this.walkSpeed = 4.317;
    this.sprintSpeed = 5.612;
    this.sneakSpeed = 1.3;
    this.flySpeed = 11.0;
    this.sprintFlySpeed = 22.0;
    this.swimSpeed = 4.0;

    // Inventory
    this.inventory = new Array(36).fill(null);
    this.hotbar = 0; // selected hotbar slot (0-8)
    this.armor = [null, null, null, null]; // helmet, chestplate, leggings, boots
    this.offhand = null;

    // Gamemode
    this.gamemode = 'survival';
    this.difficulty = 'normal';

    // Gravity
    this.gravity = -32;
    this.terminalVelocity = -78;
    this.jumpVelocity = 8.4;

    // Fall damage tracking
    this.fallDistance = 0;
    this.wasOnGround = false;
  }

  spawn(world) {
    this.position.set(world.spawnPoint.x + 0.5, world.spawnPoint.y + 1, world.spawnPoint.z + 0.5);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.air = this.maxAir;
  }

  tick(dt) {
    // Gravity
    if (!this.flying && !this.swimming) {
      this.velocity.y += this.gravity * dt;
      if (this.velocity.y < this.terminalVelocity) {
        this.velocity.y = this.terminalVelocity;
      }
    }

    // Track fall distance
    if (!this.onGround && !this.flying) {
      this.fallDistance += Math.abs(this.velocity.y * dt);
    }

    // Apply velocity
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Simple ground check
    if (this.game.world) {
      const blockBelow = this.game.world.getBlock(
        Math.floor(this.position.x),
        Math.floor(this.position.y - 0.01),
        Math.floor(this.position.z)
      );
      const blockBelowSolid = this.game.blockRegistry.isSolid(blockBelow.id);

      if (blockBelowSolid && this.velocity.y < 0) {
        this.position.y = Math.floor(this.position.y) + 1;
        this.velocity.y = 0;
        this.onGround = true;

        // Fall damage
        if (this.fallDistance > 3 && this.gamemode === 'survival') {
          const damage = Math.floor(this.fallDistance - 3);
          if (damage > 0) this.takeDamage(damage);
        }
        this.fallDistance = 0;
      } else {
        this.onGround = false;
      }

      // Keep player above bedrock
      if (this.position.y < CHUNK_MIN_Y + 1) {
        this.position.y = CHUNK_MIN_Y + 1;
        this.velocity.y = 0;
      }
    }

    // Hunger
    if (this.gamemode === 'survival') {
      // Slow hunger depletion
      this.hunger = Math.max(0, this.hunger - dt * 0.01);
    }
  }

  takeDamage(amount) {
    if (this.gamemode === 'creative' || this.gamemode === 'spectator') return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    // TODO: death screen, drop items, respawn
    console.log('Player died');
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    if (this.game.world) {
      this.position.set(
        this.game.world.spawnPoint.x + 0.5,
        this.game.world.spawnPoint.y + 1,
        this.game.world.spawnPoint.z + 0.5
      );
    }
  }

  getAABB() {
    const hw = this.width / 2;
    return {
      minX: this.position.x - hw,
      minY: this.position.y,
      minZ: this.position.z - hw,
      maxX: this.position.x + hw,
      maxY: this.position.y + this.height,
      maxZ: this.position.z + hw,
    };
  }

  getEyePosition() {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
  }
}
