// ChunkMesher.js - Greedy meshing algorithm for chunk geometry
// Based on the greedy meshing approach by Mikola Lysenko
import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_MIN_Y } from '../core/Chunk.js';

const FACES = [
  { dir: [0, 1, 0], name: 'top', corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dir: [0, -1, 0], name: 'bottom', corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dir: [1, 0, 0], name: 'right', corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], name: 'left', corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { dir: [0, 0, 1], name: 'front', corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { dir: [0, 0, -1], name: 'back', corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

export class ChunkMesher {
  constructor(textureAtlas) {
    this.textureAtlas = textureAtlas;
  }

  buildMesh(chunk, world) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    let vertexCount = 0;

    // For each face direction, do a greedy mesh pass
    for (const face of FACES) {
      vertexCount = this.greedyFacePass(chunk, world, face, positions, normals, uvs, colors, indices, vertexCount);
    }

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    return geometry;
  }

  greedyFacePass(chunk, world, face, positions, normals, uvs, colors, indices, vertexCount) {
    const [du, dv, dw] = this.getFaceAxes(face.name);
    const [u, v, w] = this.getFaceUVW(face.name);
    const dims = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];

    // Mask: stores block ID for each slice position
    const maskSize = CHUNK_SIZE * CHUNK_HEIGHT;
    const mask = new Int16Array(maskSize);

    // Iterate through each slice perpendicular to the face normal
    for (let d = 0; d < (face.name === 'top' || face.name === 'bottom' ? CHUNK_SIZE : CHUNK_HEIGHT + CHUNK_MIN_Y > 0 ? CHUNK_SIZE : CHUNK_SIZE); d++) {
      // Determine the range for d based on face direction
      let dMin, dMax;
      if (face.dir[1] !== 0) {
        // Top/bottom faces: d iterates over Y
        dMin = CHUNK_MIN_Y;
        dMax = CHUNK_HEIGHT + CHUNK_MIN_Y;
      } else {
        // Side faces: d iterates over the perpendicular horizontal axis
        dMin = 0;
        dMax = CHUNK_SIZE;
      }

      for (let dd = dMin; dd < dMax; dd++) {
        // Build mask for this slice
        this.buildMask(chunk, world, face, dd, mask);

        // Greedy merge the mask
        let i = 0;
        while (i < maskSize) {
          if (mask[i] === 0) {
            i++;
            continue;
          }

          // Find width of this run
          const blockId = mask[i];
          let width = 1;
          while (i + width < maskSize && mask[i + width] === blockId) {
            width++;
          }

          // Find height of this run
          const maxU = face.dir[1] !== 0 ? CHUNK_SIZE : CHUNK_SIZE;
          let height = 1;
          let canExtend = true;
          while (canExtend && i + height * maxU < maskSize) {
            for (let k = 0; k < width; k++) {
              if (mask[i + height * maxU + k] !== blockId) {
                canExtend = false;
                break;
              }
            }
            if (canExtend) height++;
          }

          // Emit quad for this merged region
          vertexCount = this.emitQuad(
            chunk, face, dd, i, width, height, blockId,
            positions, normals, uvs, colors, indices, vertexCount
          );

          // Clear the mask region
          for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
              mask[i + dy * maxU + dx] = 0;
            }
          }

          i += width;
        }
      }
    }

    return vertexCount;
  }

  buildMask(chunk, world, face, d, mask) {
    mask.fill(0);
    let idx = 0;

    if (face.dir[1] !== 0) {
      // Top/bottom: iterate over x,z
      const y = d;
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const block = chunk.getBlock(x, y, z);
          if (block.id === 0) { idx++; continue; }

          const ny = y + face.dir[1];
          let neighborId = 0;

          if (ny >= CHUNK_MIN_Y && ny < CHUNK_HEIGHT + CHUNK_MIN_Y) {
            neighborId = chunk.getBlock(x, ny, z).id;
          }

          const neighborOpaque = this.isOpaqueOrSolid(world, neighborId);
          const neighborLiquid = world.game.blockRegistry.isLiquid(neighborId);
          const currentLiquid = world.game.blockRegistry.isLiquid(block.id);

          if (neighborOpaque && !neighborLiquid) { idx++; continue; }
          if (currentLiquid && neighborLiquid) { idx++; continue; }

          mask[idx] = block.id;
          idx++;
        }
      }
    } else if (face.dir[0] !== 0) {
      // Left/right: iterate over y,z
      const x = d;
      for (let y = CHUNK_MIN_Y; y < CHUNK_HEIGHT + CHUNK_MIN_Y; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const block = chunk.getBlock(x, y, z);
          if (block.id === 0) { idx++; continue; }

          const nx = x + face.dir[0];
          let neighborId = 0;

          if (nx >= 0 && nx < CHUNK_SIZE) {
            neighborId = chunk.getBlock(nx, y, z).id;
          } else {
            const wx = chunk.getWorldX(nx);
            const wz = chunk.getWorldZ(z);
            neighborId = world.getBlock(wx, y, wz).id;
          }

          const neighborOpaque = this.isOpaqueOrSolid(world, neighborId);
          const neighborLiquid = world.game.blockRegistry.isLiquid(neighborId);
          const currentLiquid = world.game.blockRegistry.isLiquid(block.id);

          if (neighborOpaque && !neighborLiquid) { idx++; continue; }
          if (currentLiquid && neighborLiquid) { idx++; continue; }

          mask[idx] = block.id;
          idx++;
        }
      }
    } else {
      // Front/back: iterate over x,y
      const z = d;
      for (let y = CHUNK_MIN_Y; y < CHUNK_HEIGHT + CHUNK_MIN_Y; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const block = chunk.getBlock(x, y, z);
          if (block.id === 0) { idx++; continue; }

          const nz = z + face.dir[2];
          let neighborId = 0;

          if (nz >= 0 && nz < CHUNK_SIZE) {
            neighborId = chunk.getBlock(x, y, nz).id;
          } else {
            const wx = chunk.getWorldX(x);
            const wz = chunk.getWorldZ(nz);
            neighborId = world.getBlock(wx, y, wz).id;
          }

          const neighborOpaque = this.isOpaqueOrSolid(world, neighborId);
          const neighborLiquid = world.game.blockRegistry.isLiquid(neighborId);
          const currentLiquid = world.game.blockRegistry.isLiquid(block.id);

          if (neighborOpaque && !neighborLiquid) { idx++; continue; }
          if (currentLiquid && neighborLiquid) { idx++; continue; }

          mask[idx] = block.id;
          idx++;
        }
      }
    }
  }

  emitQuad(chunk, face, d, maskIdx, width, height, blockId,
            positions, normals, uvs, colors, indices, vertexCount) {
    const blockDef = chunk.game.blockRegistry.get(blockId);
    if (!blockDef) return vertexCount;

    // Get texture UV for this face
    let texName;
    if (face.name === 'top') texName = blockDef.textureTop;
    else if (face.name === 'bottom') texName = blockDef.textureBottom;
    else texName = blockDef.textureSide;

    const uv = this.textureAtlas ? this.textureAtlas.getUV(texName) : { u0: 0, v0: 0, u1: 1, v1: 1 };

    // Calculate world position of the quad
    let x0, y0, z0, x1, y1, z1;

    if (face.dir[1] !== 0) {
      // Top/bottom face
      const maxU = CHUNK_SIZE;
      const startZ = Math.floor(maskIdx / maxU);
      const startX = maskIdx % maxU;
      x0 = startX; z0 = startZ;
      x1 = startX + width; z1 = startZ + height;
      y0 = d; y1 = d + 1;
      if (face.dir[1] < 0) { y0 = d; y1 = d; } // bottom face at same level
    } else if (face.dir[0] !== 0) {
      // Left/right face
      const maxU = CHUNK_SIZE;
      const startY = Math.floor(maskIdx / maxU) + CHUNK_MIN_Y;
      const startZ = maskIdx % maxU;
      y0 = startY; z0 = startZ;
      y1 = startY + height; z1 = startZ + width;
      x0 = d; x1 = d + 1;
      if (face.dir[0] < 0) { x0 = d; x1 = d; }
    } else {
      // Front/back face
      const maxU = CHUNK_SIZE;
      const startY = Math.floor(maskIdx / maxU) + CHUNK_MIN_Y;
      const startX = maskIdx % maxU;
      y0 = startY; x0 = startX;
      y1 = startY + height; x1 = startX + width;
      z0 = d; z1 = d + 1;
      if (face.dir[2] < 0) { z0 = d; z1 = d; }
    }

    // Get light level at center of quad
    const cx = Math.floor((x0 + x1) / 2);
    const cy = Math.floor((y0 + y1) / 2);
    const cz = Math.floor((z0 + z1) / 2);
    const skyLight = chunk.getSkyLight(
      Math.max(0, Math.min(CHUNK_SIZE - 1, cx)),
      Math.max(CHUNK_MIN_Y, Math.min(CHUNK_HEIGHT + CHUNK_MIN_Y - 1, cy)),
      Math.max(0, Math.min(CHUNK_SIZE - 1, cz))
    ) / 15;
    const blockLight = chunk.getBlockLight(
      Math.max(0, Math.min(CHUNK_SIZE - 1, cx)),
      Math.max(CHUNK_MIN_Y, Math.min(CHUNK_HEIGHT + CHUNK_MIN_Y - 1, cy)),
      Math.max(0, Math.min(CHUNK_SIZE - 1, cz))
    ) / 15;
    const light = Math.max(skyLight, blockLight);
    const brightness = 0.3 + light * 0.7;

    // Emit 4 vertices for the merged quad
    for (const corner of face.corners) {
      const px = corner[0] === 0 ? x0 : x1;
      const py = corner[1] === 0 ? y0 : y1;
      const pz = corner[2] === 0 ? z0 : z1;
      positions.push(px, py, pz);
      normals.push(face.dir[0], face.dir[1], face.dir[2]);

      // Scale UVs to cover the merged quad
      const uScale = (corner[0] === 0 ? x0 : x1) - x0 || (corner[2] === 0 ? z0 : z1) - z0 || width;
      const vScale = (corner[1] === 0 ? y0 : y1) - y0 || height;
      const cu = corner[0] === 0 ? uv.u0 : uv.u1;
      const cv = corner[1] === 0 ? uv.v1 : uv.v0;
      uvs.push(cu, cv);

      colors.push(brightness, brightness, brightness);
    }

    // Two triangles per quad
    indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
    indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
    vertexCount += 4;

    return vertexCount;
  }

  isOpaqueOrSolid(world, blockId) {
    const block = world.game.blockRegistry.get(blockId);
    return block ? (block.isOpaque || block.isSolid) : false;
  }

  getFaceAxes(faceName) {
    switch (faceName) {
      case 'top': case 'bottom': return [0, 0, 1]; // iterate z, then x
      case 'left': case 'right': return [0, 1, 0]; // iterate y, then z
      case 'front': case 'back': return [1, 0, 0]; // iterate x, then y
      default: return [0, 0, 1];
    }
  }

  getFaceUVW(faceName) {
    switch (faceName) {
      case 'top': case 'bottom': return [0, 1, 2]; // u=x, v=z, w=y
      case 'left': case 'right': return [2, 0, 1]; // u=z, v=y, w=x
      case 'front': case 'back': return [0, 1, 2]; // u=x, v=y, w=z
      default: return [0, 1, 2];
    }
  }
}
