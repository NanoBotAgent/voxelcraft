// VoxelCraft - Main Entry Point
import { Game } from './core/Game.js';

const progressFill = document.getElementById('progress-fill');
const loadingStatus = document.getElementById('loading-status');
const loadingError = document.getElementById('loading-error');

function setProgress(pct, msg) {
  progressFill.style.width = pct + '%';
  loadingStatus.textContent = msg;
}

function showError(msg) {
  loadingError.textContent = msg;
  loadingError.style.display = 'block';
}

async function boot() {
  try {
    setProgress(5, 'Checking browser support...');

    // WebGL2 check
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    if (!gl) {
      showError('WebGL2 is not supported. Please use a modern browser (Chrome 110+, Firefox 110+, Safari 16+).');
      return;
    }

    setProgress(10, 'Initializing game engine...');
    const game = new Game();

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
    // Generate a random seed for the world
    const seed = Math.floor(Math.random() * 2147483647);
    game.createWorld('World', seed, 'survival', 'normal');

    setProgress(100, 'Ready!');

    // Hide loading, show game
    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      game.start();
    }, 300);
  } catch (err) {
    console.error('Boot failed:', err);
    showError('Failed to start: ' + err.message);
  }
}

boot();
