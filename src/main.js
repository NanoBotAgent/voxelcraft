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
    setProgress(10, 'Checking browser support...');

    // WebGL2 check
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    if (!gl) {
      showError('WebGL2 is not supported. Please use a modern browser (Chrome 110+, Firefox 110+, Safari 16+).');
      return;
    }

    setProgress(20, 'Initializing game engine...');
    const game = new Game();

    setProgress(40, 'Loading block registry...');
    await game.loadRegistries();

    setProgress(60, 'Generating textures...');
    await game.generateTextures();

    setProgress(80, 'Initializing renderer...');
    await game.initRenderer();

    setProgress(90, 'Setting up input...');
    game.initInput();

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
