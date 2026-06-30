// PlayerController.js - Input -> player movement, camera, actions
import * as THREE from 'three';

export class PlayerController {
  constructor(player, input) {
    this.player = player;
    this.input = input;
    this.mouseSensitivity = 0.002;
    this.isPointerLocked = false;

    // Bind events
    this.input.on('lock', () => { this.isPointerLocked = true; });
    this.input.on('unlock', () => { this.isPointerLocked = false; });
    this.input.on('mousemove', (e) => this.onMouseMove(e));
    this.input.on('keydown', (e) => this.onKeyDown(e));
  }

  onMouseMove(e) {
    if (!this.isPointerLocked) return;

    this.player.rotation.yaw -= e.movementX * this.mouseSensitivity;
    this.player.rotation.pitch -= e.movementY * this.mouseSensitivity;
    this.player.rotation.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.player.rotation.pitch));
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyF':
        this.player.flying = !this.player.flying;
        this.player.velocity.y = 0;
        break;
    }
  }

  tick(dt) {
    if (!this.isPointerLocked) return;

    const speed = this.getSpeed();
    const forward = this.getForward();
    const right = this.getRight();

    // Reset horizontal velocity
    this.player.velocity.x = 0;
    this.player.velocity.z = 0;

    // Movement
    if (this.input.isKeyDown('KeyW')) {
      this.player.velocity.x += forward.x * speed;
      this.player.velocity.z += forward.z * speed;
    }
    if (this.input.isKeyDown('KeyS')) {
      this.player.velocity.x -= forward.x * speed;
      this.player.velocity.z -= forward.z * speed;
    }
    if (this.input.isKeyDown('KeyA')) {
      this.player.velocity.x -= right.x * speed;
      this.player.velocity.z -= right.z * speed;
    }
    if (this.input.isKeyDown('KeyD')) {
      this.player.velocity.x += right.x * speed;
      this.player.velocity.z += right.z * speed;
    }

    // Jump
    if (this.input.isKeyDown('Space')) {
      if (this.player.flying) {
        this.player.velocity.y = speed;
      } else if (this.player.onGround) {
        this.player.velocity.y = this.player.jumpVelocity;
        this.player.onGround = false;
      }
    }

    // Descend (flying)
    if (this.input.isKeyDown('ShiftLeft') && this.player.flying) {
      this.player.velocity.y = -speed;
    }

    // Sneak
    this.player.sneaking = this.input.isKeyDown('ShiftLeft') && !this.player.flying;

    // Sprint
    this.player.sprinting = this.input.isKeyDown('ControlLeft') && this.input.isKeyDown('KeyW') && !this.player.sneaking;

    // Update camera
    this.updateCamera();
  }

  getSpeed() {
    if (this.player.flying) {
      return this.player.sprinting ? this.player.sprintFlySpeed : this.player.flySpeed;
    }
    if (this.player.sneaking) return this.player.sneakSpeed;
    if (this.player.sprinting) return this.player.sprintSpeed;
    return this.player.walkSpeed;
  }

  getForward() {
    return new THREE.Vector3(
      -Math.sin(this.player.rotation.yaw),
      0,
      -Math.cos(this.player.rotation.yaw)
    ).normalize();
  }

  getRight() {
    return new THREE.Vector3(
      Math.cos(this.player.rotation.yaw),
      0,
      -Math.sin(this.player.rotation.yaw)
    ).normalize();
  }

  updateCamera() {
    const camera = this.player.game.camera;
    if (!camera) return;

    const eyePos = this.player.getEyePosition();

    if (camera.mode === 'first') {
      camera.camera.position.copy(eyePos);
      camera.yaw = this.player.rotation.yaw;
      camera.pitch = this.player.rotation.pitch;

      // Apply rotation
      const euler = new THREE.Euler(
        this.player.rotation.pitch,
        this.player.rotation.yaw,
        0,
        'YXZ'
      );
      camera.camera.quaternion.setFromEuler(euler);
    } else if (camera.mode === 'third-back') {
      const offset = new THREE.Vector3(0, 0, camera.thirdPersonDistance);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.yaw);
      offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), -this.player.rotation.pitch);
      camera.camera.position.copy(eyePos).add(offset);
      camera.camera.lookAt(eyePos);
    } else if (camera.mode === 'third-front') {
      const offset = new THREE.Vector3(0, 0, -camera.thirdPersonDistance);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.yaw);
      offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), -this.player.rotation.pitch);
      camera.camera.position.copy(eyePos).add(offset);
      camera.camera.lookAt(eyePos);
    }
  }
}
