// UIManager.js - HUD, crosshair, hotbar, menus
export class UIManager {
  constructor(game) {
    this.game = game;
    this.elements = {};
    this.visible = true;
    this.currentScreen = null; // null = gameplay, 'inventory', 'pause', etc.

    this.createHUD();
  }

  createHUD() {
    // Container
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'hud';
    this.hudContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100;font-family:"Courier New",monospace;';

    // Crosshair
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;';
    crosshair.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <line x1="12" y1="4" x2="12" y2="10" stroke="white" stroke-width="2" opacity="0.8"/>
        <line x1="12" y1="14" x2="12" y2="20" stroke="white" stroke-width="2" opacity="0.8"/>
        <line x1="4" y1="12" x2="10" y2="12" stroke="white" stroke-width="2" opacity="0.8"/>
        <line x1="14" y1="12" x2="20" y2="12" stroke="white" stroke-width="2" opacity="0.8"/>
      </svg>`;
    this.hudContainer.appendChild(crosshair);

    // Hotbar
    const hotbar = document.createElement('div');
    hotbar.id = 'hotbar';
    hotbar.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:2px;background:rgba(0,0,0,0.4);padding:2px;border:2px solid rgba(255,255,255,0.2);border-radius:2px;';
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.slot = i;
      slot.style.cssText = `width:44px;height:44px;background:rgba(0,0,0,0.5);border:1px solid ${i === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)'};display:flex;align-items:center;justify-content:center;position:relative;`;
      const num = document.createElement('span');
      num.style.cssText = 'position:absolute;top:1px;left:3px;font-size:9px;color:rgba(255,255,255,0.5);';
      num.textContent = i + 1;
      slot.appendChild(num);
      hotbar.appendChild(slot);
    }
    this.hudContainer.appendChild(hotbar);

    // Health bar
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.style.cssText = 'position:absolute;bottom:58px;left:50%;transform:translateX(-50%) translateX(-91px);display:flex;gap:1px;';
    for (let i = 0; i < 10; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.dataset.index = i;
      heart.style.cssText = 'font-size:14px;filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.8));';
      heart.textContent = '\u2764'; // ❤
      healthBar.appendChild(heart);
    }
    this.hudContainer.appendChild(healthBar);

    // Hunger bar
    const hungerBar = document.createElement('div');
    hungerBar.id = 'hunger-bar';
    hungerBar.style.cssText = 'position:absolute;bottom:58px;left:50%;transform:translateX(-50%) translateX(91px);display:flex;gap:1px;flex-direction:row-reverse;';
    for (let i = 0; i < 10; i++) {
      const drumstick = document.createElement('span');
      drumstick.className = 'hunger';
      drumstick.dataset.index = i;
      drumstick.style.cssText = 'font-size:14px;filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.8));';
      drumstick.textContent = '\uD83C\uDF57'; // 🍗
      hungerBar.appendChild(drumstick);
    }
    this.hudContainer.appendChild(hungerBar);

    // Debug info (F3)
    const debug = document.createElement('div');
    debug.id = 'debug-info';
    debug.style.cssText = 'position:absolute;top:4px;left:4px;font-size:11px;color:white;text-shadow:1px 1px 1px rgba(0,0,0,0.8);display:none;line-height:1.4;';
    this.hudContainer.appendChild(debug);

    // Pause overlay
    const pause = document.createElement('div');
    pause.id = 'pause-screen';
    pause.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px;pointer-events:auto;';
    pause.innerHTML = `
      <h2 style="margin:0;font-size:32px;letter-spacing:2px;">PAUSED</h2>
      <button id="btn-resume" style="padding:8px 32px;font-size:16px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);cursor:pointer;font-family:inherit;">Resume</button>
      <button id="btn-quit" style="padding:8px 32px;font-size:16px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);cursor:pointer;font-family:inherit;">Save & Quit</button>
    `;
    this.hudContainer.appendChild(pause);

    document.body.appendChild(this.hudContainer);

    // Pause button handlers
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.currentScreen = null;
      pause.style.display = 'none';
      this.game.renderer.getCanvas().requestPointerLock();
    });

    document.getElementById('btn-quit')?.addEventListener('click', () => {
      this.game.saveWorld();
      this.game.stop();
      // TODO: return to title screen
    });

    // ESC for pause
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.currentScreen === 'pause') {
          this.currentScreen = null;
          pause.style.display = 'none';
          this.game.renderer.getCanvas().requestPointerLock();
        } else if (!this.currentScreen) {
          this.currentScreen = 'pause';
          pause.style.display = 'flex';
          document.exitPointerLock();
        }
      }
      if (e.code === 'F3') {
        e.preventDefault();
        const d = document.getElementById('debug-info');
        d.style.display = d.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Hotbar scroll
    document.addEventListener('wheel', (e) => {
      if (this.game.player) {
        const dir = e.deltaY > 0 ? 1 : -1;
        this.game.player.hotbar = ((this.game.player.hotbar + dir) % 9 + 9) % 9;
        this.updateHotbar();
      }
    });

    // Number keys for hotbar
    document.addEventListener('keydown', (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && this.game.player) {
        this.game.player.hotbar = num - 1;
        this.updateHotbar();
      }
    });
  }

  updateHotbar() {
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((slot, i) => {
      slot.style.borderColor = i === this.game.player.hotbar
        ? 'rgba(255,255,255,0.8)'
        : 'rgba(255,255,255,0.15)';
    });
  }

  update() {
    if (!this.game.player) return;

    // Health
    const hearts = document.querySelectorAll('.heart');
    hearts.forEach((h, i) => {
      h.style.opacity = (i * 2 < this.game.player.health) ? 1 : 0.2;
    });

    // Hunger
    const hunger = document.querySelectorAll('.hunger');
    hunger.forEach((h, i) => {
      h.style.opacity = (i * 2 < this.game.player.hunger) ? 1 : 0.2;
    });

    // Debug info
    const debug = document.getElementById('debug-info');
    if (debug.style.display !== 'none') {
      const p = this.game.player.position;
      debug.innerHTML = `
        VoxelCraft ${__VERSION__}<br>
        FPS: ${this.game.fps}<br>
        XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}<br>
        Block: ${Math.floor(p.x)} ${Math.floor(p.y)} ${Math.floor(p.z)}<br>
        Chunk: ${Math.floor(p.x / 16)} ${Math.floor(p.z / 16)}<br>
        Facing: ${this.getCardinalDirection()}<br>
        Chunks: ${this.game.world ? this.game.world.chunks.size : 0}<br>
        ${this.game.player.flying ? 'Flying' : ''} ${this.game.player.sprinting ? 'Sprinting' : ''}
      `;
    }
  }

  getCardinalDirection() {
    if (!this.game.player) return 'N';
    const yaw = this.game.player.rotation.yaw;
    const deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
    if (deg < 45 || deg >= 315) return 'S';
    if (deg < 135) return 'W';
    if (deg < 225) return 'N';
    return 'E';
  }
}
