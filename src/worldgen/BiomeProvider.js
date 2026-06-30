// BiomeProvider.js - 3D biome lookup at (x, y, z)
// Biome IDs: 0=ocean, 1=plains, 2=desert, 3=forest, 4=taiga,
// 5=swamp, 6=river, 7=frozen_ocean, 8=snowy_plains, 9=windswept_hills,
// 10=savanna, 11=jungle, 12=badlands, 13=mushroom_fields, 14=flower_forest,
// 15=sunflower_plains, 16=dark_forest, 17=birch_forest, 18=old_growth_forest,
// 19=snowy_taiga, 20=ice_spikes, 21=meadow, 22=grove, 23=snowy_slopes,
// 24=jagged_peaks, 25=frozen_peaks, 26=stony_peaks, 27=cherry_grove

export const BIOME_NAMES = [
  'ocean', 'plains', 'desert', 'forest', 'taiga',
  'swamp', 'river', 'frozen_ocean', 'snowy_plains', 'windswept_hills',
  'savanna', 'jungle', 'badlands', 'mushroom_fields', 'flower_forest',
  'sunflower_plains', 'dark_forest', 'birch_forest', 'old_growth_forest',
  'snowy_taiga', 'ice_spikes', 'meadow', 'grove', 'snowy_slopes',
  'jagged_peaks', 'frozen_peaks', 'stony_peaks', 'cherry_grove',
];

export class BiomeProvider {
  constructor(noiseGen) {
    this.noiseGen = noiseGen;
  }

  getBiome(x, z) {
    const climate = this.noiseGen.getClimateNoise(x, z);
    return this.classifyBiome(climate, x, z);
  }

  classifyBiome(c, x, z) {
    // Simplified multi-noise biome classification
    const temp = (c.temperature + 1) / 2; // 0-1
    const humid = (c.humidity + 1) / 2;    // 0-1
    const cont = (c.continentalness + 1) / 2; // 0-1
    const erosion = (c.erosion + 1) / 2;  // 0-1
    const weird = (c.weirdness + 1) / 2;   // 0-1

    // Ocean vs land
    if (cont < 0.25) {
      if (temp < 0.25) return 7; // frozen_ocean
      return 0; // ocean
    }

    // River
    if (cont > 0.35 && cont < 0.4 && humid > 0.4 && humid < 0.6) {
      return 6; // river
    }

    // Mountain biomes (high continentalness, low erosion)
    if (cont > 0.65 && erosion < 0.3) {
      if (temp < 0.2) return weird > 0.5 ? 25 : 24; // frozen_peaks / jagged_peaks
      if (temp < 0.4) return 23; // snowy_slopes
      return weird > 0.5 ? 26 : 9; // stony_peaks / windswept_hills
    }

    // Mid-elevation
    if (cont > 0.55) {
      if (temp < 0.2) return 22; // grove
      if (temp < 0.35) return 21; // meadow
    }

    // Cold biomes
    if (temp < 0.2) {
      if (humid > 0.6) return 19; // snowy_taiga
      if (humid < 0.2) return 20; // ice_spikes
      return 8; // snowy_plains
    }

    // Temperate biomes
    if (temp < 0.5) {
      if (humid > 0.7) return 4; // taiga
      if (humid > 0.5) return 3; // forest
      if (humid > 0.3) return weird > 0.6 ? 14 : 1; // flower_forest / plains
      return 15; // sunflower_plains
    }

    // Warm biomes
    if (temp < 0.75) {
      if (humid > 0.8) return 11; // jungle
      if (humid > 0.6) return 18; // old_growth_forest
      if (humid > 0.4) return 17; // birch_forest
      if (humid > 0.2) return 10; // savanna
      return 2; // desert
    }

    // Hot biomes
    if (humid > 0.5) return 5; // swamp
    if (humid < 0.15) return 12; // badlands
    return 2; // desert
  }

  getBiomeName(id) {
    return BIOME_NAMES[id] || 'unknown';
  }

  // Biome properties for world gen
  getBiomeProperties(id) {
    const props = {
      0:  { temperature: 0.5,  rainfall: 0.5,  topBlock: 8,  fillerBlock: 8,  isOcean: true },   // ocean -> sand
      1:  { temperature: 0.5,  rainfall: 0.4,  topBlock: 3,  fillerBlock: 2 },   // plains -> grass/dirt
      2:  { temperature: 2.0,  rainfall: 0.0,  topBlock: 8,  fillerBlock: 8 },   // desert -> sand
      3:  { temperature: 0.5,  rainfall: 0.7,  topBlock: 3,  fillerBlock: 2 },   // forest -> grass/dirt
      4:  { temperature: 0.25, rainfall: 0.8,  topBlock: 3,  fillerBlock: 2 },   // taiga -> grass/dirt
      5:  { temperature: 0.8,  rainfall: 0.9,  topBlock: 3,  fillerBlock: 2 },   // swamp -> grass/dirt
      6:  { temperature: 0.5,  rainfall: 0.5,  topBlock: 8,  fillerBlock: 8,  isRiver: true },   // river -> sand
      7:  { temperature: 0.0,  rainfall: 0.5,  topBlock: 16, fillerBlock: 8 },  // frozen_ocean -> snow/sand
      8:  { temperature: 0.0,  rainfall: 0.5,  topBlock: 16, fillerBlock: 2 },   // snowy_plains -> snow/dirt
      9:  { temperature: 0.2,  rainfall: 0.3,  topBlock: 1,  fillerBlock: 1 },   // windswept_hills -> stone
      10: { temperature: 1.2,  rainfall: 0.0,  topBlock: 3,  fillerBlock: 2 },   // savanna -> grass/dirt
      11: { temperature: 0.95, rainfall: 0.9,  topBlock: 3,  fillerBlock: 2 },   // jungle -> grass/dirt
      12: { temperature: 2.0,  rainfall: 0.0,  topBlock: 20, fillerBlock: 20 }, // badlands -> sandstone
      13: { temperature: 0.5,  rainfall: 1.0,  topBlock: 3,  fillerBlock: 2 },   // mushroom_fields
      14: { temperature: 0.5,  rainfall: 0.7,  topBlock: 3,  fillerBlock: 2 },   // flower_forest
      15: { temperature: 0.5,  rainfall: 0.4,  topBlock: 3,  fillerBlock: 2 },   // sunflower_plains
      16: { temperature: 0.5,  rainfall: 0.8,  topBlock: 3,  fillerBlock: 2 },   // dark_forest
      17: { temperature: 0.5,  rainfall: 0.6,  topBlock: 3,  fillerBlock: 2 },   // birch_forest
      18: { temperature: 0.5,  rainfall: 0.8,  topBlock: 3,  fillerBlock: 2 },   // old_growth_forest
      19: { temperature: -0.5, rainfall: 0.8,  topBlock: 16, fillerBlock: 2 },   // snowy_taiga
      20: { temperature: 0.0,  rainfall: 0.5,  topBlock: 16, fillerBlock: 8 },   // ice_spikes
      21: { temperature: 0.5,  rainfall: 0.4,  topBlock: 3,  fillerBlock: 2 },   // meadow
      22: { temperature: -0.2, rainfall: 0.8,  topBlock: 16, fillerBlock: 1 },   // grove
      23: { temperature: -0.3, rainfall: 0.5,  topBlock: 16, fillerBlock: 1 },   // snowy_slopes
      24: { temperature: -0.7, rainfall: 0.5,  topBlock: 1,  fillerBlock: 1 },   // jagged_peaks
      25: { temperature: -0.5, rainfall: 0.5,  topBlock: 16, fillerBlock: 1 },   // frozen_peaks
      26: { temperature: 0.2,  rainfall: 0.3,  topBlock: 1,  fillerBlock: 1 },   // stony_peaks
      27: { temperature: 0.5,  rainfall: 0.7,  topBlock: 3,  fillerBlock: 2 },   // cherry_grove
    };
    return props[id] || props[1]; // default to plains
  }
}
