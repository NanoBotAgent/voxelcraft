// Camera.js - First/third person camera, F5 toggle
import * as THREE from 'three';

export class Camera {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'first'; // 'first' | 'third-back' | 'third-front'
    this.thirdPersonDistance = 3.0;
    this.yaw = 0;
    this.pitch = 0;
    this.sensitivity = 0.002;
  }

  toggleCamera() {
    if (this.mode === 'first') this.mode = 'third-back';
    else if (this.mode === 'third-back') this.mode = 'third-front';
    else this.mode = 'first';
  }

  update(alpha) {
    // Camera is positioned by PlayerController which sets camera directly
  }

  applyMouse(dx, dy) {
    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  getForward() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
  }

  getRight() {
    return new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );
  }

  getLookDirection() {
    return new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
  }
}
