// main.js - VoxelCraft entry point with robust error handling
import { Game } from './core/Game.js';

const progressFill = document.getElementById('progress-fill');
const loadingStatus = document.getElementById('loading-status');
const loadingError = document.getElementById('loading-error');

function setProgress(pct, msg) {
  if (progressFill) progressFill.style.width = pct + '%';
  if (loadingStatus) loadingStatus.textContent = msg;
}

function showError(msg) {
  if (loadingError) {
    loadingError.textContent = msg;
    loadingError.style.display = 'block';
  }
  console.error('VoxelCraft:', msg);
}

async function boot() {
  try {
    setProgress(5, 'Checking browser support...');

    // Try WebGL2 first, fall back to WebGL1
    const testCanvas = document.createElement('canvas');
    let gl = testCanvas.getContext('webgl2');
    let isWebGL2 = !!gl;

    if (!gl) {
      gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    }

    if (!gl) {
      showError('WebGL is not supported. Please use a modern browser (Chrome 110+, Firefox 110+, Safari 16+).');
      return;
    }

    const rendererInfo = gl.getParameter(gl.RENDERER) || 'unknown';
    console.log(`WebGL: ${isWebGL2 ? 'WebGL2' : 'WebGL1 (fallback)'} - Renderer: ${rendererInfo}`);

    setProgress(10, 'Initializing game engine...');
    const game = new Game(isWebGL2);

    setProgress(25, 'Loading block registry...');
    await game.loadRegistries();
    console.log(`Block registry: ${game.blockRegistry.blocks.size} blocks loaded`);

    setProgress(40, 'Generating textures...');
    await game.generateTextures();
    console.log(`Texture atlas: ${game.textureAtlas.nextIdx} tiles generated`);

    setProgress(60, 'Initializing renderer...');
    await game.initRenderer();
    console.log('Renderer initialized, canvas size:', game.renderer.renderer.domElement.width, 'x', game.renderer.renderer.domElement.height);

    setProgress(75, 'Setting up input & player...');
    game.initInput();

    setProgress(85, 'Initializing audio...');
    game.initAudio();

    setProgress(90, 'Creating world...');
    const seed = Math.floor(Math.random() * 2147483647);
    game.createWorld('World', seed, 'survival', 'normal');
    console.log(`World created: seed=${seed}, chunks=${game.world.chunks.size}, spawn=(${game.world.spawnPoint.x}, ${game.world.spawnPoint.y}, ${game.world.spawnPoint.z})`);

    // Log chunk content stats
    let totalBlocks = 0;
    let nonAirBlocks = 0;
    for (const [key, chunk] of game.world.chunks) {
      for (let i = 0; i < chunk.blockIds.length; i++) {
        totalBlocks++;
        if (chunk.blockIds[i] !== 0) nonAirBlocks++;
      }
    }
    console.log(`Chunk data: ${nonAirBlocks}/${totalBlocks} non-air blocks (${(nonAirBlocks/totalBlocks*100).toFixed(1)}%)`);

    setProgress(100, 'Ready! Click to play');

    // Hide loading, show game
    setTimeout(() => {
      const loading = document.getElementById('loading');
      const app = document.getElementById('app');
      if (loading) loading.style.display = 'none';
      if (app) app.style.display = 'block';
      game.start();
      console.log('Game started - rendering loop active');
    }, 300);
  } catch (err) {
    console.error('Boot failed:', err);
    showError('Failed to start: ' + err.message + '\n' + err.stack);
  }
}

boot();
