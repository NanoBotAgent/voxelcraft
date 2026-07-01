// ChunkMesher.js - Per-face meshing with bright vertex colors for MeshBasicMaterial
import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_MIN_Y } from '../core/Chunk.js';

const FACES = [
  { dir: [0, 1, 0], name: 'top', corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], shade: 1.0 },
  { dir: [0, -1, 0], name: 'bottom', corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], shade: 0.6 },
  { dir: [1, 0, 0], name: 'right', corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], shade: 0.85 },
  { dir: [-1, 0, 0], name: 'left', corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], shade: 0.85 },
  { dir: [0, 0, 1], name: 'front', corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], shade: 0.75 },
  { dir: [0, 0, -1], name: 'back', corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], shade: 0.75 },
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

    for (let y = CHUNK_MIN_Y; y < CHUNK_HEIGHT + CHUNK_MIN_Y; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const block = chunk.getBlock(x, y, z);
          if (block.id === 0) continue;

          for (const face of FACES) {
            const [nx, ny, nz] = face.dir;
            const adjX = x + nx;
            const adjY = y + ny;
            const adjZ = z + nz;

            let adjId = 0;
            if (adjX >= 0 && adjX < CHUNK_SIZE && adjY >= CHUNK_MIN_Y && adjY < CHUNK_HEIGHT + CHUNK_MIN_Y && adjZ >= 0 && adjZ < CHUNK_SIZE) {
              adjId = chunk.getBlock(adjX, adjY, adjZ).id;
            } else {
              adjId = world.getBlock(chunk.getWorldX(adjX), adjY, chunk.getWorldZ(adjZ)).id;
            }

            if (!this.shouldShowFace(world, block.id, adjId)) continue;

            vertexCount = this.emitFace(
              chunk, world, face, x, y, z, block.id,
              positions, normals, uvs, colors, indices, vertexCount
            );
          }
        }
      }
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

  shouldShowFace(world, blockId, adjId) {
    if (adjId === 0) return true;
    const adjBlock = world.game.blockRegistry.get(adjId);
    if (!adjBlock) return true;
    if (adjBlock.isOpaque && !adjBlock.isLiquid) return false;
    const curBlock = world.game.blockRegistry.get(blockId);
    if (curBlock && curBlock.isLiquid && adjBlock.isLiquid) return false;
    return true;
  }

  emitFace(chunk, world, face, x, y, z, blockId,
           positions, normals, uvs, colors, indices, vertexCount) {
    const blockDef = world.game.blockRegistry.get(blockId);
    if (!blockDef) return vertexCount;

    let texName;
    if (face.name === 'top') texName = blockDef.textureTop;
    else if (face.name === 'bottom') texName = blockDef.textureBottom;
    else texName = blockDef.textureSide;

    const uv = this.textureAtlas ? this.textureAtlas.getUV(texName) : { u0: 0, v0: 0, u1: 1, v1: 1 };

    // Brightness: face direction shading (MeshBasicMaterial uses vertex colors directly)
    const brightness = Math.max(0.6, face.shade);

    const [nx, ny, nz] = face.dir;

    for (let i = 0; i < 4; i++) {
      const corner = face.corners[i];
      const px = x + corner[0];
      const py = y + corner[1];
      const pz = z + corner[2];
      positions.push(px, py, pz);
      normals.push(nx, ny, nz);

      // UV: map 4 corners to the 4 UV corners of the tile
      // corners[0]=bottom-left, corners[1]=top-left, corners[2]=top-right, corners[3]=bottom-right
      const cu = (i === 0 || i === 3) ? uv.u0 : uv.u1;
      const cv = (i === 0 || i === 1) ? uv.v1 : uv.v0;
      uvs.push(cu, cv);

      colors.push(brightness, brightness, brightness);
    }

    indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
    indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
    vertexCount += 4;

    return vertexCount;
  }
}
