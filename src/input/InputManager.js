// InputManager.js - Keyboard, mouse, pointer lock
import { EventBus } from '../core/EventBus.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.events = new EventBus();
    this.isPointerLocked = false;

    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.events.emit('keydown', e);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.events.emit('keyup', e);
    });

    // Mouse
    document.addEventListener('mousemove', (e) => {
      this.events.emit('mousemove', e);
    });

    document.addEventListener('mousedown', (e) => {
      this.events.emit('mousedown', e);
    });

    document.addEventListener('mouseup', (e) => {
      this.events.emit('mouseup', e);
    });

    document.addEventListener('wheel', (e) => {
      this.events.emit('wheel', e);
    });

    // Pointer lock
    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
      if (this.isPointerLocked) {
        this.events.emit('lock');
      } else {
        this.events.emit('unlock');
      }
    });
  }

  isKeyDown(code) {
    return this.keys.has(code);
  }

  on(event, callback) {
    return this.events.on(event, callback);
  }
}
