// BlockInteraction.js - Raycasting, block breaking, block placing
import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_MIN_Y, CHUNK_HEIGHT } from '../core/Chunk.js';

export class BlockInteraction {
  constructor(game) {
    this.game = game;
    this.reachDistance = 5.0;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.reachDistance;
    this.targetBlock = null;     // { x, y, z, face }
    this.placementBlock = null;  // { x, y, z } - where the new block would go
    this.isBreaking = false;
    this.breakProgress = 0;
    this.breakTarget = null;
    this.breakTime = 0;
    this.highlightMesh = null;

    this.setupEvents();
    this.createHighlight();
  }

  createHighlight() {
    // Wireframe cube to highlight targeted block
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2, transparent: true, opacity: 0.4 });
    this.highlightMesh = new THREE.LineSegments(edges, mat);
    this.highlightMesh.visible = false;
    this.game.renderer.getScene().add(this.highlightMesh);
  }

  setupEvents() {
    const input = this.game.input;

    input.on('mousedown', (e) => {
      if (!input.isPointerLocked) return;

      if (e.button === 0) {
        // Left click - break block
        this.startBreaking();
      } else if (e.button === 2) {
        // Right click - place block
        this.placeBlock();
      }
    });

    input.on('mouseup', (e) => {
      if (e.button === 0) {
        this.stopBreaking();
      }
    });

    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => {
      if (input.isPointerLocked) e.preventDefault();
    });
  }

  update(dt) {
    this.updateTarget();
    this.updateBreaking(dt);
    this.updateHighlight();
  }

  updateTarget() {
    if (!this.game.player || !this.game.world || !this.game.camera) {
      this.targetBlock = null;
      this.placementBlock = null;
      return;
    }

    const eyePos = this.game.player.getEyePosition();
    const forward = this.game.camera.getForward();

    // DDA raycast through voxel grid
    const result = this.voxelRaycast(
      eyePos.x, eyePos.y, eyePos.z,
      forward.x, forward.y, forward.z,
      this.reachDistance
    );

    if (result) {
      this.targetBlock = { x: result.x, y: result.y, z: result.z, face: result.face };
      this.placementBlock = {
        x: result.x + result.face[0],
        y: result.y + result.face[1],
        z: result.z + result.face[2],
      };
    } else {
      this.targetBlock = null;
      this.placementBlock = null;
    }
  }

  // DDA (Digital Differential Analyzer) voxel raycast
  voxelRaycast(ox, oy, oz, dx, dy, dz, maxDist) {
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

    let tMaxX = dx !== 0 ? ((dx > 0 ? (x + 1 - ox) : (ox - x)) * tDeltaX) : Infinity;
    let tMaxY = dy !== 0 ? ((dy > 0 ? (y + 1 - oy) : (oy - y)) * tDeltaY) : Infinity;
    let tMaxZ = dz !== 0 ? ((dz > 0 ? (z + 1 - oz) : (oz - z)) * tDeltaZ) : Infinity;

    let face = [0, 0, 0];
    let dist = 0;

    for (let i = 0; i < maxDist * 3; i++) {
      // Check current voxel
      if (y >= CHUNK_MIN_Y && y < CHUNK_HEIGHT + CHUNK_MIN_Y) {
        const block = this.game.world.getBlock(x, y, z);
        if (block.id !== 0 && block.id !== 9) { // not air or water
          return { x, y, z, face };
        }
      }

      // Step to next voxel
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          dist = tMaxX;
          if (dist > maxDist) return null;
          x += stepX;
          tMaxX += tDeltaX;
          face = [-stepX, 0, 0];
        } else {
          dist = tMaxZ;
          if (dist > maxDist) return null;
          z += stepZ;
          tMaxZ += tDeltaZ;
          face = [0, 0, -stepZ];
        }
      } else {
        if (tMaxY < tMaxZ) {
          dist = tMaxY;
          if (dist > maxDist) return null;
          y += stepY;
          tMaxY += tDeltaY;
          face = [0, -stepY, 0];
        } else {
          dist = tMaxZ;
          if (dist > maxDist) return null;
          z += stepZ;
          tMaxZ += tDeltaZ;
          face = [0, 0, -stepZ];
        }
      }
    }

    return null;
  }

  startBreaking() {
    if (!this.targetBlock) return;
    this.isBreaking = true;
    this.breakTarget = { ...this.targetBlock };
    this.breakProgress = 0;

    const block = this.game.world.getBlock(this.targetBlock.x, this.targetBlock.y, this.targetBlock.z);
    const blockDef = this.game.blockRegistry.get(block.id);
    if (!blockDef) return;

    // Instant break in creative, or calculate break time
    if (this.game.player.gamemode === 'creative') {
      this.breakBlock();
      return;
    }

    // Break time in seconds: hardness * 1.5 for correct tool, hardness * 5 for wrong tool
    let breakTime = blockDef.hardness;
    if (breakTime < 0) return; // unbreakable (bedrock)

    // Check if player has correct tool
    const heldItem = this.game.player.inventory[this.game.player.hotbar + 36];
    if (heldItem && heldItem.toolType === blockDef.toolType) {
      breakTime *= 1.5;
    } else {
      breakTime *= 5.0;
    }

    this.breakTime = breakTime;
  }

  stopBreaking() {
    this.isBreaking = false;
    this.breakProgress = 0;
    this.breakTarget = null;
  }

  updateBreaking(dt) {
    if (!this.isBreaking || !this.breakTarget) return;

    // Check if still targeting the same block
    if (!this.targetBlock ||
        this.targetBlock.x !== this.breakTarget.x ||
        this.targetBlock.y !== this.breakTarget.y ||
        this.targetBlock.z !== this.breakTarget.z) {
      this.stopBreaking();
      return;
    }

    this.breakProgress += dt;

    if (this.breakProgress >= this.breakTime) {
      this.breakBlock();
    }
  }

  breakBlock() {
    if (!this.targetBlock) return;

    const { x, y, z } = this.targetBlock;
    const block = this.game.world.getBlock(x, y, z);
    const blockDef = this.game.blockRegistry.get(block.id);

    // Don't break bedrock or air
    if (!blockDef || block.id === 0 || blockDef.hardness < 0) return;

    // Set to air
    this.game.world.setBlock(x, y, z, 0);

    // Play sound
    if (this.game.audio) {
      this.game.audio.playBlockBreak();
    }

    // TODO: Drop item

    this.stopBreaking();
  }

  placeBlock() {
    if (!this.placementBlock) return;

    const { x, y, z } = this.placementBlock;

    // Don't place outside world bounds
    if (y < CHUNK_MIN_Y || y >= CHUNK_HEIGHT + CHUNK_MIN_Y) return;

    // Don't place inside the player
    const playerAABB = this.game.player.getAABB();
    if (x + 1 > playerAABB.minX && x < playerAABB.maxX &&
        y + 1 > playerAABB.minY && y < playerAABB.maxY &&
        z + 1 > playerAABB.minZ && z < playerAABB.maxZ) {
      return;
    }

    // Check if there's already a block there
    const existing = this.game.world.getBlock(x, y, z);
    if (existing.id !== 0 && existing.id !== 9) return; // not air or water

    // Get the block to place from hotbar
    const hotbarSlot = this.game.player.hotbar;
    const heldItem = this.game.player.inventory[hotbarSlot];

    // Default to stone if no item selected (for now, until inventory is implemented)
    let blockId = 1; // stone
    if (heldItem && heldItem.isBlock) {
      blockId = heldItem.blockId;
    }

    this.game.world.setBlock(x, y, z, blockId);

    // Play sound
    if (this.game.audio) {
      this.game.audio.playBlockPlace();
    }
  }

  updateHighlight() {
    if (this.targetBlock) {
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(
        this.targetBlock.x + 0.5,
        this.targetBlock.y + 0.5,
        this.targetBlock.z + 0.5
      );
    } else {
      this.highlightMesh.visible = false;
    }
  }
}
