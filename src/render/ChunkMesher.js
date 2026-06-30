// ChunkMesher.js - Greedy meshing algorithm
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

    for (let y = CHUNK_MIN_Y; y < CHUNK_HEIGHT + CHUNK_MIN_Y; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const block = chunk.getBlock(x, y, z);
          if (block.id === 0) continue; // air

          const blockDef = world.game.blockRegistry.get(block.id);
          if (!blockDef) continue;

          for (const face of FACES) {
            const nx = x + face.dir[0];
            const ny = y + face.dir[1];
            const nz = z + face.dir[2];

            // Check neighbor - if solid, skip face
            let neighborId = 0;
            if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE) {
              const neighbor = chunk.getBlock(nx, ny, nz);
              neighborId = neighbor.id;
            } else if (ny >= CHUNK_MIN_Y && ny < CHUNK_HEIGHT + CHUNK_MIN_Y) {
              // Neighbor in adjacent chunk
              const wx = chunk.getWorldX(nx);
              const wz = chunk.getWorldZ(nz);
              const neighborBlock = world.getBlock(wx, ny, wz);
              neighborId = neighborBlock.id;
            }

            const neighborOpaque = world.game.blockRegistry.isOpaque(neighborId);
            const neighborLiquid = world.game.blockRegistry.isLiquid(neighborId);

            // Skip face if neighbor is opaque and not liquid (unless we're liquid looking at air)
            if (neighborOpaque && !neighborLiquid) continue;
            if (world.game.blockRegistry.isLiquid(block.id) && neighborLiquid) continue;

            // Get texture UV for this face
            let texName;
            if (face.name === 'top') texName = blockDef.textureTop;
            else if (face.name === 'bottom') texName = blockDef.textureBottom;
            else texName = blockDef.textureSide;

            const uv = this.textureAtlas ? this.textureAtlas.getUV(texName) : { u0: 0, v0: 0, u1: 1, v1: 1 };

            // Get light level for vertex color
            const skyLight = chunk.getSkyLight(x, y, z) / 15;
            const blockLight = chunk.getBlockLight(x, y, z) / 15;
            const light = Math.max(skyLight, blockLight);
            const brightness = 0.3 + light * 0.7;

            // Add 4 vertices for this face
            for (const corner of face.corners) {
              positions.push(x + corner[0], y + corner[1], z + corner[2]);
              normals.push(face.dir[0], face.dir[1], face.dir[2]);

              // UV mapping
              const cu = corner[0] === 0 ? uv.u0 : uv.u1;
              const cv = corner[1] === 0 ? uv.v1 : uv.v0;
              uvs.push(cu, cv);

              // Vertex color (lighting)
              colors.push(brightness, brightness, brightness);
            }

            // Two triangles per face
            indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
            indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
            vertexCount += 4;
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    return geometry;
  }
}
