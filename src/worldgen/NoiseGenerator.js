// NoiseGenerator.js - Perlin/Simplex + Multi-Noise climate
import { createNoise2D, createNoise3D } from 'simplex-noise';

export class NoiseGenerator {
  constructor(seed) {
    this.seed = seed;
    // Create seeded noise functions
    // simplex-noise uses a random function; we seed it with a simple LCG
    const rng = this.createRng(seed);
    this.noise2D = createNoise2D(rng);
    this.noise3D = createNoise3D(rng);
    this.noise2D_2 = createNoise2D(this.createRng(seed + 1));
    this.noise2D_3 = createNoise2D(this.createRng(seed + 2));
    this.noise2D_4 = createNoise2D(this.createRng(seed + 3));
  }

  createRng(seed) {
    let s = seed | 0;
    return () => {
      s = (s * 1664525 + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
  }

  // 2D noise at given scale
  noise2(x, z, scale = 0.01) {
    return this.noise2D(x * scale, z * scale);
  }

  // 3D noise at given scale
  noise3(x, y, z, scale = 0.01) {
    return this.noise3D(x * scale, y * scale, z * scale);
  }

  // Octave noise (multiple layers)
  octave2D(x, z, octaves = 4, persistence = 0.5, scale = 0.005) {
    let total = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }

  // Multi-noise for biome generation (temperature, humidity, continentalness, erosion, weirdness)
  getClimateNoise(x, z) {
    const scale = 0.001;
    const scale2 = 0.0025;
    return {
      temperature: this.noise2D(x * scale, z * scale),
      humidity: this.noise2D_2(x * scale, z * scale),
      continentalness: this.noise2D_3(x * scale2, z * scale2),
      erosion: this.noise2D_4(x * scale2, z * scale2),
      weirdness: this.noise2D(x * scale * 0.5, z * scale * 0.5),
    };
  }
}
