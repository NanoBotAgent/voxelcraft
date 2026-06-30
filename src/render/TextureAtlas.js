// TextureAtlas.js - Texture atlas builder (16x16 tiles)
import * as THREE from 'three';

export class TextureAtlas {
  constructor(tileSize = 16, tilesPerRow = 16) {
    this.tileSize = tileSize;
    this.tilesPerRow = tilesPerRow;
    this.atlasSize = tileSize * tilesPerRow; // 256x256 for 256 tiles
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.atlasSize;
    this.canvas.height = this.atlasSize;
    this.ctx = this.canvas.getContext('2d');
    this.tileMap = new Map();
    this.nextIdx = 0;
    this.texture = null;
  }

  addTexture(name, drawFn) {
    const idx = this.nextIdx++;
    const x = (idx % this.tilesPerRow) * this.tileSize;
    const y = Math.floor(idx / this.tilesPerRow) * this.tileSize;
    this.ctx.save();
    this.ctx.translate(x, y);
    drawFn(this.ctx, this.tileSize);
    this.ctx.restore();
    this.tileMap.set(name, { x, y, idx });
    return idx;
  }

  getUV(name) {
    const info = this.tileMap.get(name);
    if (!info) return { u0: 0, v0: 0, u1: 1, v1: 1 }; // fallback
    return {
      u0: info.x / this.atlasSize,
      v0: info.y / this.atlasSize,
      u1: (info.x + this.tileSize) / this.atlasSize,
      v1: (info.y + this.tileSize) / this.atlasSize,
    };
  }

  toTexture() {
    if (this.texture) return this.texture;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestMipmapNearestFilter;
    this.texture.generateMipmaps = true;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    return this.texture;
  }

  // Procedural texture generation
  generateDefaults() {
    // Helper: draw a pixel at (x, y) in tile-local coords
    const px = (ctx, x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    };

    // Helper: fill entire tile with base color
    const fill = (ctx, size, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size, size);
    };

    // Helper: add noise variation
    const noise = (ctx, size, baseR, baseG, baseB, variation = 15) => {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = (Math.random() - 0.5) * variation;
          const r = Math.max(0, Math.min(255, baseR + v));
          const g = Math.max(0, Math.min(255, baseG + v));
          const b = Math.max(0, Math.min(255, baseB + v));
          px(ctx, x, y, `rgb(${r|0},${g|0},${b|0})`);
        }
      }
    };

    // Air (transparent) - index 0
    this.addTexture('air', (ctx, s) => { /* empty */ });

    // Stone
    this.addTexture('stone', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      // Add darker specks
      for (let i = 0; i < 20; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(100,100,100)');
      }
    });

    // Dirt
    this.addTexture('dirt', (ctx, s) => {
      noise(ctx, s, 139, 98, 64, 15);
      for (let i = 0; i < 15; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(100,70,45)');
      }
    });

    // Grass top
    this.addTexture('grass_top', (ctx, s) => {
      noise(ctx, s, 127, 178, 56, 12);
      for (let i = 0; i < 10; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(91,138,42)');
      }
    });

    // Grass side
    this.addTexture('grass_side', (ctx, s) => {
      // Top 3 pixels green
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 10;
          px(ctx, x, y, `rgb(${127+v|0},${178+v|0},${56+v|0})`);
        }
      }
      // Rest is dirt
      for (let y = 3; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 15;
          px(ctx, x, y, `rgb(${139+v|0},${98+v|0},${64+v|0})`);
        }
      }
    });

    // Cobblestone
    this.addTexture('cobblestone', (ctx, s) => {
      noise(ctx, s, 122, 122, 122, 20);
      for (let i = 0; i < 30; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(90,90,90)');
      }
      for (let i = 0; i < 10; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(150,150,150)');
      }
    });

    // Oak planks
    this.addTexture('oak_planks', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 10;
          // Horizontal grain
          const grain = Math.sin(y * 0.8) * 5;
          px(ctx, x, y, `rgb(${181+grain+v|0},${144+grain+v|0},${90+grain+v|0})`);
        }
      }
    });

    // Oak log top (rings)
    this.addTexture('oak_log_top', (ctx, s) => {
      fill(ctx, s, 'rgb(181,160,113)');
      const cx = s / 2, cy = s / 2;
      for (let r = 2; r < 7; r += 2) {
        ctx.strokeStyle = 'rgb(110,84,49)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Center dot
      px(ctx, 7, 7, 'rgb(110,84,49)');
      px(ctx, 8, 7, 'rgb(110,84,49)');
      px(ctx, 7, 8, 'rgb(110,84,49)');
      px(ctx, 8, 8, 'rgb(110,84,49)');
    });

    // Oak log side (bark)
    this.addTexture('oak_log_side', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 10;
          const bark = Math.sin(x * 1.5) * 8;
          px(ctx, x, y, `rgb(${110+bark+v|0},${84+bark+v|0},${49+bark+v|0})`);
        }
      }
    });

    // Oak leaves
    this.addTexture('oak_leaves', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 20;
          const alpha = Math.random() > 0.15 ? 1 : 0; // some holes
          if (alpha) {
            px(ctx, x, y, `rgb(${74+v|0},${107+v|0},${42+v|0})`);
          }
        }
      }
    });

    // Sand
    this.addTexture('sand', (ctx, s) => {
      noise(ctx, s, 230, 217, 165, 8);
    });

    // Water
    this.addTexture('water', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 10;
          px(ctx, x, y, `rgba(${63+v|0},${111+v|0},${192+v|0},0.7)`);
        }
      }
    });

    // Bedrock
    this.addTexture('bedrock', (ctx, s) => {
      noise(ctx, s, 68, 68, 68, 25);
      for (let i = 0; i < 20; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(40,40,40)');
      }
    });

    // Coal ore
    this.addTexture('coal_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 8; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(30,30,30)');
        px(ctx, ox + 1, oy, 'rgb(30,30,30)');
        px(ctx, ox, oy + 1, 'rgb(30,30,30)');
      }
    });

    // Iron ore
    this.addTexture('iron_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 6; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(200,180,150)');
        px(ctx, ox + 1, oy, 'rgb(190,170,140)');
        px(ctx, ox, oy + 1, 'rgb(195,175,145)');
      }
    });

    // Gold ore
    this.addTexture('gold_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 5; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(255,200,50)');
        px(ctx, ox + 1, oy, 'rgb(240,190,40)');
      }
    });

    // Diamond ore
    this.addTexture('diamond_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 4; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(80,230,230)');
        px(ctx, ox + 1, oy, 'rgb(60,210,210)');
      }
    });

    // Obsidian
    this.addTexture('obsidian', (ctx, s) => {
      noise(ctx, s, 20, 18, 31, 8);
      for (let i = 0; i < 5; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(80,40,120)');
      }
    });

    // Snow block
    this.addTexture('snow_block', (ctx, s) => {
      noise(ctx, s, 244, 244, 244, 3);
    });

    // Ice
    this.addTexture('ice', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 8;
          px(ctx, x, y, `rgba(${154+v|0},${192+v|0},${232+v|0},0.8)`);
        }
      }
    });

    // Gravel
    this.addTexture('gravel', (ctx, s) => {
      noise(ctx, s, 140, 140, 140, 25);
    });

    // Clay
    this.addTexture('clay', (ctx, s) => {
      noise(ctx, s, 164, 150, 140, 8);
    });

    // Sandstone
    this.addTexture('sandstone', (ctx, s) => {
      noise(ctx, s, 224, 216, 164, 6);
      // Horizontal lines
      for (let y = 3; y < s; y += 4) {
        for (let x = 0; x < s; x++) {
          px(ctx, x, y, 'rgb(200,192,140)');
        }
      }
    });

    // Glass
    this.addTexture('glass', (ctx, s) => {
      fill(ctx, s, 'rgba(200,220,255,0.3)');
      // Border
      ctx.strokeStyle = 'rgb(180,200,220)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
      // Cross
      ctx.beginPath();
      ctx.moveTo(s / 2, 0);
      ctx.lineTo(s / 2, s);
      ctx.moveTo(0, s / 2);
      ctx.lineTo(s, s / 2);
      ctx.stroke();
    });

    // Bricks
    this.addTexture('bricks', (ctx, s) => {
      fill(ctx, s, 'rgb(142,79,46)');
      // Mortar lines
      ctx.fillStyle = 'rgb(200,190,170)';
      for (let y = 0; y < s; y += 4) {
        ctx.fillRect(0, y, s, 1);
      }
      for (let y = 0; y < s; y += 8) {
        ctx.fillRect(0, y, s, 1);
        for (let x = 0; x < s; x += 8) {
          ctx.fillRect(x, y, 1, 4);
        }
      }
      for (let y = 4; y < s; y += 8) {
        for (let x = 4; x < s; x += 8) {
          ctx.fillRect(x, y, 1, 4);
        }
      }
    });

    // Netherrack
    this.addTexture('netherrack', (ctx, s) => {
      noise(ctx, s, 110, 46, 46, 20);
    });

    // Soul sand
    this.addTexture('soul_sand', (ctx, s) => {
      noise(ctx, s, 74, 63, 53, 12);
    });

    // Glowstone
    this.addTexture('glowstone', (ctx, s) => {
      noise(ctx, s, 154, 122, 74, 15);
      for (let i = 0; i < 10; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(255,208,128)');
      }
    });

    // Lava
    this.addTexture('lava', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 20;
          px(ctx, x, y, `rgb(${220+v|0},${100+v|0},${20+v|0})`);
        }
      }
    });

    // Oak slab
    this.addTexture('oak_slab', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 10;
          const grain = Math.sin(y * 0.8) * 5;
          px(ctx, x, y, `rgb(${181+grain+v|0},${144+grain+v|0},${90+grain+v|0})`);
        }
      }
    });

    // Spruce planks
    this.addTexture('spruce_planks', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 8;
          const grain = Math.sin(y * 0.8) * 5;
          px(ctx, x, y, `rgb(${130+grain+v|0},${100+grain+v|0},${70+grain+v|0})`);
        }
      }
    });

    // Birch planks
    this.addTexture('birch_planks', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 8;
          const grain = Math.sin(y * 0.8) * 3;
          px(ctx, x, y, `rgb(${210+grain+v|0},${200+grain+v|0},${170+grain+v|0})`);
        }
      }
    });

    // Spruce log top
    this.addTexture('spruce_log_top', (ctx, s) => {
      fill(ctx, s, 'rgb(160,130,90)');
      const cx = s / 2, cy = s / 2;
      for (let r = 2; r < 7; r += 2) {
        ctx.strokeStyle = 'rgb(90,70,45)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Spruce log side
    this.addTexture('spruce_log_side', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 8;
          const bark = Math.sin(x * 1.5) * 6;
          px(ctx, x, y, `rgb(${90+bark+v|0},${70+bark+v|0},${45+bark+v|0})`);
        }
      }
    });

    // Birch log top
    this.addTexture('birch_log_top', (ctx, s) => {
      fill(ctx, s, 'rgb(220,210,190)');
      const cx = s / 2, cy = s / 2;
      for (let r = 2; r < 7; r += 2) {
        ctx.strokeStyle = 'rgb(180,170,150)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Birch log side
    this.addTexture('birch_log_side', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 8;
          px(ctx, x, y, `rgb(${220+v|0},${210+v|0},${190+v|0})`);
        }
      }
      // Horizontal dashes (birch bark feature)
      for (let i = 0; i < 4; i++) {
        const y = 3 + Math.random() * 10 | 0;
        const x = Math.random() * 8 | 0;
        ctx.fillStyle = 'rgb(60,50,40)';
        ctx.fillRect(x, y, 4, 1);
      }
    });

    // Spruce leaves
    this.addTexture('spruce_leaves', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 15;
          if (Math.random() > 0.1) {
            px(ctx, x, y, `rgb(${50+v|0},${85+v|0},${35+v|0})`);
          }
        }
      }
    });

    // Birch leaves
    this.addTexture('birch_leaves', (ctx, s) => {
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = (Math.random() - 0.5) * 15;
          if (Math.random() > 0.1) {
            px(ctx, x, y, `rgb(${90+v|0},${140+v|0},${60+v|0})`);
          }
        }
      }
    });

    // Deepslate
    this.addTexture('deepslate', (ctx, s) => {
      noise(ctx, s, 80, 80, 80, 10);
    });

    // Copper ore
    this.addTexture('copper_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 5; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(180,120,60)');
        px(ctx, ox + 1, oy, 'rgb(170,110,50)');
      }
    });

    // Lapis ore
    this.addTexture('lapis_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 5; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(30,50,160)');
        px(ctx, ox + 1, oy, 'rgb(25,45,150)');
      }
    });

    // Emerald ore
    this.addTexture('emerald_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 3; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(30,180,60)');
        px(ctx, ox + 1, oy, 'rgb(25,170,55)');
      }
    });

    // Redstone ore
    this.addTexture('redstone_ore', (ctx, s) => {
      noise(ctx, s, 136, 136, 136, 12);
      for (let i = 0; i < 5; i++) {
        const ox = Math.random() * (s - 2) | 0;
        const oy = Math.random() * (s - 2) | 0;
        px(ctx, ox, oy, 'rgb(180,30,30)');
        px(ctx, ox + 1, oy, 'rgb(170,25,25)');
      }
    });

    // Calcite
    this.addTexture('calcite', (ctx, s) => {
      noise(ctx, s, 210, 200, 190, 6);
    });

    // Tuff
    this.addTexture('tuff', (ctx, s) => {
      noise(ctx, s, 120, 115, 110, 12);
    });

    // Diorite
    this.addTexture('diorite', (ctx, s) => {
      noise(ctx, s, 210, 210, 210, 10);
      for (let i = 0; i < 10; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(180,180,180)');
      }
    });

    // Granite
    this.addTexture('granite', (ctx, s) => {
      noise(ctx, s, 160, 110, 90, 15);
      for (let i = 0; i < 8; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(130,80,60)');
      }
    });

    // Andesite
    this.addTexture('andesite', (ctx, s) => {
      noise(ctx, s, 150, 145, 140, 10);
      for (let i = 0; i < 8; i++) {
        px(ctx, Math.random() * s | 0, Math.random() * s | 0, 'rgb(120,115,110)');
      }
    });
  }
}
