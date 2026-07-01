// Renderer.js - WebGLRenderer with WebGL1 fallback and MeshBasicMaterial
import * as THREE from 'three';
import { TextureAtlas } from './TextureAtlas.js';
import { ChunkMesher } from './ChunkMesher.js';

export class Renderer {
  constructor(container, textureAtlas, isWebGL2 = true) {
    this.container = container;
    this.textureAtlas = textureAtlas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 80, 0);

    // Renderer - use WebGL1 if WebGL2 not available
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      forceWebGL1: !isWebGL2,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x87CEEB);
    container.appendChild(this.renderer.domElement);

    // Fog
    this.scene.fog = new THREE.Fog(0x87CEEB, 60, 160);

    // MeshBasicMaterial - doesn't need lights, vertex colors control brightness directly
    const tex = textureAtlas ? textureAtlas.toTexture() : null;
    this.chunkMaterial = new THREE.MeshBasicMaterial({
      map: tex,
      vertexColors: true,
      side: THREE.FrontSide,
    });

    // Lights for future day/night cycle (MeshBasicMaterial ignores them)
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sunLight.position.set(100, 200, 100);
    this.scene.add(this.sunLight);

    // Chunk mesh group
    this.chunkGroup = new THREE.Group();
    this.scene.add(this.chunkGroup);

    // Handle resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Mesher
    this.mesher = new ChunkMesher(textureAtlas);
  }

  getCamera() { return this.camera; }
  getScene() { return this.scene; }
  getCanvas() { return this.renderer.domElement; }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  updateChunkMeshes(world) {
    let meshed = 0;
    const maxPerFrame = 4;

    for (const [key, chunk] of world.chunks) {
      if (chunk.meshDirty && chunk.status === 'generated' && meshed < maxPerFrame) {
        if (chunk.mesh) {
          this.chunkGroup.remove(chunk.mesh);
          chunk.mesh.geometry.dispose();
          chunk.mesh = null;
        }

        const geometry = this.mesher.buildMesh(chunk, world);
        if (geometry) {
          const mesh = new THREE.Mesh(geometry, this.chunkMaterial);
          mesh.position.set(chunk.cx * 16, 0, chunk.cz * 16);
          this.chunkGroup.add(mesh);
          chunk.mesh = mesh;
        }
        chunk.meshDirty = false;
        chunk.status = 'ready';
        meshed++;
      }
    }
  }

  setFogColor(color) {
    if (!color) return;
    this.scene.fog.color.copy(color);
    this.scene.background.copy(color);
    this.renderer.setClearColor(color);
  }

  setSunDirection(x, y, z) {
    this.sunLight.position.set(x, y, z);
  }
}
