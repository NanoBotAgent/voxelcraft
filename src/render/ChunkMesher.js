// ChunkMesher.js - Greedy meshing algorithm
// Merges adjacent same-block faces into larger quads for fewer draw calls
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

    for (const face of FACES) {
      vertexCount = this.greedyPass(chunk, world, face, positions, normals, uvs, colors, indices, vertexCount);
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

  greedyPass(chunk, world, face, positions, normals, uvs, colors, indices, vertexCount) {
    const [nx, ny, nz] = face.dir;

    // Determine the two tangent axes and the normal axis
    // For each face direction, we iterate slices along the normal axis
    // and within each slice, we merge quads in the two tangent directions

    if (ny !== 0) {
      // Top/bottom faces: slice along Y, merge in X-Z plane
      for (let y = CHUNK_MIN_Y; y < CHUNK_HEIGHT + CHUNK_MIN_Y; y++) {
        // Build visibility mask for this Y slice
        const mask = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
        for (let z = 0; z < CHUNK_SIZE; z++) {
          for (let x = 0; x < CHUNK_SIZE; x++) {
            const block = chunk.getBlock(x, y, z);
            if (block.id === 0) continue;

            const adjY = y + ny;
            let adjId = 0;
            if (adjY >= CHUNK_MIN_Y && adjY < CHUNK_HEIGHT + CHUNK_MIN_Y) {
              adjId = chunk.getBlock(x, adjY, z).id;
            }

            if (this.shouldShowFace(world, block.id, adjId)) {
              mask[z * CHUNK_SIZE + x] = block.id;
            }
          }
        }

        // Greedy merge the mask
        vertexCount = this.mergeMask(chunk, world, face, y, mask, CHUNK_SIZE, CHUNK_SIZE,
          (i) => ({ x: i % CHUNK_SIZE, y, z: Math.floor(i / CHUNK_SIZE) }),
          (x, z) => z * CHUNK_SIZE + x,
          positions, normals, uvs, colors, indices, vertexCount);
      }
    } else if (nx !== 0) {
      // Left/right faces: slice along X, merge in Z-Y plane
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const rows = CHUNK_SIZE;
        const cols = CHUNK_HEIGHT;
        const mask = new Int16Array(rows * cols);
        for (let z = 0; z < CHUNK_SIZE; z++) {
          for (let yi = 0; yi < CHUNK_HEIGHT; yi++) {
            const y = yi + CHUNK_MIN_Y;
            const block = chunk.getBlock(x, y, z);
            if (block.id === 0) continue;

            const adjX = x + nx;
            let adjId = 0;
            if (adjX >= 0 && adjX < CHUNK_SIZE) {
              adjId = chunk.getBlock(adjX, y, z).id;
            } else {
              adjId = world.getBlock(chunk.getWorldX(adjX), y, chunk.getWorldZ(z)).id;
            }

            if (this.shouldShowFace(world, block.id, adjId)) {
              mask[z * cols + yi] = block.id;
            }
          }
        }

        vertexCount = this.mergeMask(chunk, world, face, x, mask, rows, cols,
          (i) => ({ x, y: Math.floor(i / cols) + CHUNK_MIN_Y, z: i % cols }),
          (z, yi) => z * cols + yi,
          positions, normals, uvs, colors, indices, vertexCount);
      }
    } else {
      // Front/back faces: slice along Z, merge in X-Y plane
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const rows = CHUNK_SIZE;
        const cols = CHUNK_HEIGHT;
        const mask = new Int16Array(rows * cols);
        for (let x = 0; x < CHUNK_SIZE; x++) {
          for (let yi = 0; yi < CHUNK_HEIGHT; yi++) {
            const y = yi + CHUNK_MIN_Y;
            const block = chunk.getBlock(x, y, z);
            if (block.id === 0) continue;

            const adjZ = z + nz;
            let adjId = 0;
            if (adjZ >= 0 && adjZ < CHUNK_SIZE) {
              adjId = chunk.getBlock(x, y, adjZ).id;
            } else {
              adjId = world.getBlock(chunk.getWorldX(x), y, chunk.getWorldZ(adjZ)).id;
            }

            if (this.shouldShowFace(world, block.id, adjId)) {
              mask[x * cols + yi] = block.id;
            }
          }
        }

        vertexCount = this.mergeMask(chunk, world, face, z, mask, rows, cols,
          (i) => ({ x: i % cols, y: Math.floor(i / cols) + CHUNK_MIN_Y, z }),
          (x, yi) => x * cols + yi,
          positions, normals, uvs, colors, indices, vertexCount);
      }
    }

    return vertexCount;
  }

  shouldShowFace(world, blockId, adjId) {
    const adjOpaque = world.game.blockRegistry.isOpaque(adjId);
    const adjLiquid = world.game.blockRegistry.isLiquid(adjId);
    const curLiquid = world.game.blockRegistry.isLiquid(blockId);

    if (adjId === 0) return true; // adjacent to air
    if (adjOpaque && !adjLiquid) return false; // behind solid non-liquid
    if (curLiquid && adjLiquid) return false; // liquid-liquid boundary
    return true;
  }

  mergeMask(chunk, world, face, sliceVal, mask, rows, cols,
            idxToPos, posToIdx,
            positions, normals, uvs, colors, indices, vertexCount) {
    const visited = new Uint8Array(mask.length);

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 0 || visited[i]) continue;

      const blockId = mask[i];
      const pos = idxToPos(i);

      // Find max width (along cols axis)
      let w = 1;
      while (pos.w + w < cols) {
        const nextIdx = posToIdx(pos.x !== undefined ? pos.x : pos.z, (pos.y !== undefined ? (pos.y - CHUNK_MIN_Y) : pos.z) + w);
        if (mask[nextIdx] !== blockId || visited[nextIdx]) break;
        w++;
      }

      // Find max height (along rows axis)
      let h = 1;
      let canExtend = true;
      for (let dh = 1; dh < rows && canExtend; dh++) {
        for (let dw = 0; dw < w; dw++) {
          const checkIdx = posToIdx(
            (pos.x !== undefined ? pos.x : pos.z) + dh,
            (pos.y !== undefined ? (pos.y - CHUNK_MIN_Y) : pos.z) + dw
          );
          if (mask[checkIdx] !== blockId || visited[checkIdx]) {
            canExtend = false;
            break;
          }
        }
        if (canExtend) h++;
      }

      // Mark visited
      for (let dh = 0; dh < h; dh++) {
        for (let dw = 0; dw < w; dw++) {
          const vi = posToIdx(
            (pos.x !== undefined ? pos.x : pos.z) + dh,
            (pos.y !== undefined ? (pos.y - CHUNK_MIN_Y) : pos.z) + dw
          );
          visited[vi] = 1;
        }
      }

      // Emit the merged quad
      vertexCount = this.emitMergedQuad(
        chunk, world, face, sliceVal, pos, w, h, blockId,
        positions, normals, uvs, colors, indices, vertexCount
      );
    }

    return vertexCount;
  }

  emitMergedQuad(chunk, world, face, sliceVal, pos, w, h, blockId,
                 positions, normals, uvs, colors, indices, vertexCount) {
    const blockDef = world.game.blockRegistry.get(blockId);
    if (!blockDef) return vertexCount;

    let texName;
    if (face.name === 'top') texName = blockDef.textureTop;
    else if (face.name === 'bottom') texName = blockDef.textureBottom;
    else texName = blockDef.textureSide;

    const uv = this.textureAtlas ? this.textureAtlas.getUV(texName) : { u0: 0, v0: 0, u1: 1, v1: 1 };

    // Calculate quad bounds based on face direction
    let x0, y0, z0, x1, y1, z1;
    const [nx, ny, nz] = face.dir;

    if (ny !== 0) {
      // Top/bottom: pos = {x, y, z}, w = width in x, h = height in z
      x0 = pos.x; z0 = pos.z;
      x1 = pos.x + w; z1 = pos.z + h;
      y0 = sliceVal; y1 = sliceVal + 1;
    } else if (nx !== 0) {
      // Left/right: pos = {x, y, z}, w = width in y, h = height in z
      y0 = pos.y; z0 = pos.z;
      y1 = pos.y + w; z1 = pos.z + h;
      x0 = sliceVal; x1 = sliceVal + 1;
    } else {
      // Front/back: pos = {x, y, z}, w = width in y, h = height in x
      y0 = pos.y; x0 = pos.x;
      y1 = pos.y + w; x1 = pos.x + h;
      z0 = sliceVal; z1 = sliceVal + 1;
    }

    // Get light level at center
    const cx = Math.floor((x0 + x1) / 2);
    const cy = Math.floor((y0 + y1) / 2);
    const cz = Math.floor((z0 + z1) / 2);
    const lx = Math.max(0, Math.min(CHUNK_SIZE - 1, cx));
    const ly = Math.max(CHUNK_MIN_Y, Math.min(CHUNK_HEIGHT + CHUNK_MIN_Y - 1, cy));
    const lz = Math.max(0, Math.min(CHUNK_SIZE - 1, cz));
    const skyLight = chunk.getSkyLight(lx, ly, lz) / 15;
    const blockLight = chunk.getBlockLight(lx, ly, lz) / 15;
    const light = Math.max(skyLight, blockLight);
    const brightness = 0.3 + light * 0.7;

    // Emit 4 vertices
    for (const corner of face.corners) {
      const px = corner[0] === 0 ? x0 : x1;
      const py = corner[1] === 0 ? y0 : y1;
      const pz = corner[2] === 0 ? z0 : z1;
      positions.push(px, py, pz);
      normals.push(nx, ny, nz);

      const cu = corner[0] === 0 ? uv.u0 : uv.u1;
      const cv = corner[1] === 0 ? uv.v1 : uv.v0;
      uvs.push(cu, cv);

      colors.push(brightness, brightness, brightness);
    }

    indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
    indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
    vertexCount += 4;

    return vertexCount;
  }
}
