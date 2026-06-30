// Renderer.js - WebGLRenderer setup, fog, postprocess
import * as THREE from 'three';
import { TextureAtlas } from './TextureAtlas.js';
import { ChunkMesher } from './ChunkMesher.js';

export class Renderer {
  constructor(container, textureAtlas) {
    this.container = container;
    this.textureAtlas = textureAtlas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // sky blue

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 80, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x87CEEB);
    container.appendChild(this.renderer.domElement);

    // Fog
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sunLight.position.set(100, 200, 100);
    this.scene.add(this.sunLight);

    // Hemisphere light
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B6240, 0.3);
    this.scene.add(hemi);

    // Chunk mesh group
    this.chunkGroup = new THREE.Group();
    this.scene.add(this.chunkGroup);

    // Material for chunks
    this.chunkMaterial = new THREE.MeshLambertMaterial({
      map: textureAtlas ? textureAtlas.toTexture() : null,
      vertexColors: true,
      side: THREE.FrontSide,
    });

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
    const maxPerFrame = 3;

    for (const [key, chunk] of world.chunks) {
      if (chunk.meshDirty && chunk.status === 'generated' && meshed < maxPerFrame) {
        // Remove old mesh
        if (chunk.mesh) {
          this.chunkGroup.remove(chunk.mesh);
          chunk.mesh.geometry.dispose();
        }

        // Build new mesh
        const geometry = this.mesher.buildMesh(chunk, world);
        const mesh = new THREE.Mesh(geometry, this.chunkMaterial);
        mesh.position.set(chunk.cx * 16, 0, chunk.cz * 16);
        this.chunkGroup.add(mesh);
        chunk.mesh = mesh;
        chunk.meshDirty = false;
        chunk.status = 'ready';
        meshed++;
      }
    }
  }

  setFogColor(color) {
    this.scene.fog.color.set(color);
    this.scene.background.set(color);
    this.renderer.setClearColor(color);
  }

  setSunDirection(x, y, z) {
    this.sunLight.position.set(x, y, z);
  }
}
