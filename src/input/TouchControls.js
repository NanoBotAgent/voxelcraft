// TouchControls.js - Mobile touch input (virtual joystick + look + action buttons)
import { EventBus } from '../core/EventBus.js';

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.events = new EventBus();
    this.isMobile = this.detectMobile();
    this.active = false;

    // Movement joystick state
    this.moveJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, touchId: null };
    // Look state
    this.lookTouch = { active: false, lastX: 0, lastY: 0, touchId: null };
    // Button states
    this.jumpPressed = false;
    this.breakPressed = false;
    this.placePressed = false;

    // DOM elements
    this.container = null;
    this.moveJoystickEl = null;
    this.moveKnobEl = null;
    this.jumpBtn = null;
    this.breakBtn = null;
    this.placeBtn = null;
    this.flyBtn = null;
    this.sneakBtn = null;

    if (this.isMobile) {
      this.createUI();
      this.bindEvents();
      this.active = true;
      this.injectIntoPlayerController();
    }
  }

  detectMobile() {
    return ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.userAgent.match(/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i) !== null);
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    this.container.style.cssText = `
      position: fixed; inset: 0; z-index: 200;
      pointer-events: none; display: flex;
      justify-content: space-between; align-items: flex-end;
      padding: 12px; gap: 8px;
    `;

    // Left side: movement joystick
    const leftSide = document.createElement('div');
    leftSide.style.cssText = 'position:relative; width:140px; height:140px; pointer-events:auto;';

    this.moveJoystickEl = document.createElement('div');
    this.moveJoystickEl.style.cssText = `
      position: absolute; bottom: 0; left: 0;
      width: 140px; height: 140px;
      background: rgba(255,255,255,0.08);
      border: 2px solid rgba(255,255,255,0.15);
      border-radius: 50%;
    `;

    this.moveKnobEl = document.createElement('div');
    this.moveKnobEl.style.cssText = `
      position: absolute;
      width: 56px; height: 56px;
      background: rgba(255,255,255,0.25);
      border: 2px solid rgba(255,255,255,0.35);
      border-radius: 50%;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      transition: none;
    `;

    this.moveJoystickEl.appendChild(this.moveKnobEl);
    leftSide.appendChild(this.moveJoystickEl);
    this.container.appendChild(leftSide);

    // Right side: action buttons
    const rightSide = document.createElement('div');
    rightSide.style.cssText = `
      display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
      pointer-events: auto;
    `;

    // Top-right row: fly + sneak
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; gap: 8px;';

    this.flyBtn = this.createButton('Fly', 48, 48, 'rgba(100,180,255,0.2)');
    this.sneakBtn = this.createButton('Snk', 48, 48, 'rgba(255,200,100,0.2)');
    topRow.appendChild(this.flyBtn);
    topRow.appendChild(this.sneakBtn);
    rightSide.appendChild(topRow);

    // Bottom-right: jump + break/place
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'display: flex; gap: 8px; align-items: flex-end;';

    this.jumpBtn = this.createButton('Jump', 64, 64, 'rgba(255,255,255,0.12)');
    this.breakBtn = this.createButton('Break', 56, 56, 'rgba(255,80,80,0.2)');
    this.placeBtn = this.createButton('Place', 56, 56, 'rgba(80,255,80,0.2)');

    bottomRow.appendChild(this.breakBtn);
    bottomRow.appendChild(this.jumpBtn);
    bottomRow.appendChild(this.placeBtn);
    rightSide.appendChild(bottomRow);

    this.container.appendChild(rightSide);

    // Center area for look (transparent, covers most of screen)
    this.lookArea = document.createElement('div');
    this.lookArea.style.cssText = `
      position: fixed; top: 0; left: 160px; right: 180px; bottom: 160px;
      z-index: 199; pointer-events: auto;
    `;
    this.container.appendChild(this.lookArea);

    document.body.appendChild(this.container);
  }

  createButton(label, w, h, bg) {
    const btn = document.createElement('div');
    btn.textContent = label;
    btn.style.cssText = `
      width: ${w}px; height: ${h}px;
      background: ${bg};
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: rgba(255,255,255,0.7);
      font-family: 'Courier New', monospace;
      user-select: none; -webkit-user-select: none;
      touch-action: none;
    `;
    return btn;
  }

  bindEvents() {
    // Movement joystick
    this.moveJoystickEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.moveJoystick.active = true;
      this.moveJoystick.touchId = t.identifier;
      const rect = this.moveJoystickEl.getBoundingClientRect();
      this.moveJoystick.startX = rect.left + rect.width / 2;
      this.moveJoystick.startY = rect.top + rect.height / 2;
    }, { passive: false });

    this.moveJoystickEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.moveJoystick.touchId) {
          this.updateJoystick(t);
        }
      }
    }, { passive: false });

    this.moveJoystickEl.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.moveJoystick.touchId) {
          this.moveJoystick.active = false;
          this.moveJoystick.dx = 0;
          this.moveJoystick.dy = 0;
          this.moveKnobEl.style.transform = 'translate(-50%, -50%)';
        }
      }
    });

    this.moveJoystickEl.addEventListener('touchcancel', (e) => {
      this.moveJoystick.active = false;
      this.moveJoystick.dx = 0;
      this.moveJoystick.dy = 0;
      this.moveKnobEl.style.transform = 'translate(-50%, -50%)';
    });

    // Look area
    this.lookArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.lookTouch.active = true;
      this.lookTouch.touchId = t.identifier;
      this.lookTouch.lastX = t.clientX;
      this.lookTouch.lastY = t.clientY;
    }, { passive: false });

    this.lookArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouch.touchId) {
          const dx = t.clientX - this.lookTouch.lastX;
          const dy = t.clientY - this.lookTouch.lastY;
          this.lookTouch.lastX = t.clientX;
          this.lookTouch.lastY = t.clientY;

          // Apply look rotation
          if (this.game.player) {
            this.game.player.rotation.yaw -= dx * 0.004;
            this.game.player.rotation.pitch -= dy * 0.004;
            this.game.player.rotation.pitch = Math.max(
              -Math.PI / 2 + 0.01,
              Math.min(Math.PI / 2 - 0.01, this.game.player.rotation.pitch)
            );
          }
        }
      }
    }, { passive: false });

    this.lookArea.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouch.touchId) {
          this.lookTouch.active = false;
        }
      }
    });

    // Jump button
    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.jumpPressed = true;
      this.jumpBtn.style.background = 'rgba(255,255,255,0.3)';
    }, { passive: false });
    this.jumpBtn.addEventListener('touchend', () => {
      this.jumpPressed = false;
      this.jumpBtn.style.background = 'rgba(255,255,255,0.12)';
    });

    // Break button
    this.breakBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.breakPressed = true;
      this.breakBtn.style.background = 'rgba(255,80,80,0.5)';
      if (this.game.blockInteraction) {
        this.game.blockInteraction.startBreaking();
      }
    }, { passive: false });
    this.breakBtn.addEventListener('touchend', () => {
      this.breakPressed = false;
      this.breakBtn.style.background = 'rgba(255,80,80,0.2)';
      if (this.game.blockInteraction) {
        this.game.blockInteraction.stopBreaking();
      }
    });

    // Place button
    this.placeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.placePressed = true;
      this.placeBtn.style.background = 'rgba(80,255,80,0.5)';
      if (this.game.blockInteraction) {
        this.game.blockInteraction.placeBlock();
      }
    }, { passive: false });
    this.placeBtn.addEventListener('touchend', () => {
      this.placePressed = false;
      this.placeBtn.style.background = 'rgba(80,255,80,0.2)';
    });

    // Fly button
    this.flyBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.game.player) {
        this.game.player.flying = !this.game.player.flying;
        this.game.player.velocity.y = 0;
        this.flyBtn.style.background = this.game.player.flying
          ? 'rgba(100,180,255,0.5)' : 'rgba(100,180,255,0.2)';
      }
    }, { passive: false });

    // Sneak button
    this.sneakBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.sneakActive = true;
      this.sneakBtn.style.background = 'rgba(255,200,100,0.5)';
    }, { passive: false });
    this.sneakBtn.addEventListener('touchend', () => {
      this.sneakActive = false;
      this.sneakBtn.style.background = 'rgba(255,200,100,0.2)';
    });

    // Prevent default touch behaviors on the whole page
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
  }

  updateJoystick(touch) {
    const dx = touch.clientX - this.moveJoystick.startX;
    const dy = touch.clientY - this.moveJoystick.startY;
    const maxDist = 50;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    const nx = (clampedDist / maxDist) * Math.cos(angle);
    const ny = (clampedDist / maxDist) * Math.sin(angle);

    this.moveJoystick.dx = nx; // -1 to 1 (left/right)
    this.moveJoystick.dy = ny; // -1 to 1 (forward/back)

    // Move knob visually
    const knobX = nx * maxDist;
    const knobY = ny * maxDist;
    this.moveKnobEl.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  // Inject touch input into PlayerController
  injectIntoPlayerController() {
    const game = this.game;
    const self = this;

    // Override PlayerController.tick to add touch input
    const origTick = game.playerController.tick.bind(game.playerController);
    game.playerController.tick = function(dt) {
      if (self.active && self.moveJoystick.active) {
        // Touch movement overrides keyboard
        const speed = this.getSpeed();
        const forward = this.getForward();
        const right = this.getRight();

        // dx = left/right (A/D), dy = forward/back (W/S)
        // dy negative = forward (joystick pushed up), dy positive = backward
        this.player.velocity.x = 0;
        this.player.velocity.z = 0;

        this.player.velocity.x += forward.x * (-self.moveJoystick.dy) * speed;
        this.player.velocity.z += forward.z * (-self.moveJoystick.dy) * speed;
        this.player.velocity.x += right.x * self.moveJoystick.dx * speed;
        this.player.velocity.z += right.z * self.moveJoystick.dx * speed;

        // Jump from touch
        if (self.jumpPressed) {
          if (this.player.flying) {
            this.player.velocity.y = speed;
          } else if (this.player.onGround) {
            this.player.velocity.y = this.player.jumpVelocity;
            this.player.onGround = false;
          }
        }

        // Sneak/descend from touch
        if (self.sneakActive) {
          if (this.player.flying) {
            this.player.velocity.y = -speed;
          }
          this.player.sneaking = true;
        } else {
          this.player.sneaking = false;
        }

        this.updateCamera();
      } else {
        // Fall back to keyboard controls
        origTick(dt);
      }
    };
  }

  show() {
    if (this.container) this.container.style.display = 'flex';
    if (this.lookArea) this.lookArea.style.display = 'block';
    this.active = true;
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
    if (this.lookArea) this.lookArea.style.display = 'none';
    this.active = false;
  }
}
