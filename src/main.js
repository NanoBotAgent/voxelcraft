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
      // Try WebGL1 as fallback
      gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    }

    if (!gl) {
      showError('WebGL is not supported. Please use a modern browser (Chrome 110+, Firefox 110+, Safari 16+).');
      return;
    }

    console.log(`WebGL: ${isWebGL2 ? 'WebGL2' : 'WebGL1 (fallback)'} detected`);

    setProgress(10, 'Initializing game engine...');
    const game = new Game(isWebGL2);

    setProgress(25, 'Loading block registry...');
    await game.loadRegistries();

    setProgress(40, 'Generating textures...');
    await game.generateTextures();

    setProgress(60, 'Initializing renderer...');
    await game.initRenderer();

    setProgress(75, 'Setting up input & player...');
    game.initInput();

    setProgress(85, 'Initializing audio...');
    game.initAudio();

    setProgress(90, 'Creating world...');
    const seed = Math.floor(Math.random() * 2147483647);
    game.createWorld('World', seed, 'survival', 'normal');

    setProgress(100, 'Ready! Click to play');

    // Hide loading, show game
    setTimeout(() => {
      const loading = document.getElementById('loading');
      const app = document.getElementById('app');
      if (loading) loading.style.display = 'none';
      if (app) app.style.display = 'block';
      game.start();
    }, 300);
  } catch (err) {
    console.error('Boot failed:', err);
    showError('Failed to start: ' + err.message + '\n' + err.stack);
  }
}

boot();
