// BlockRegistry.js - Block ID <-> state lookup
// Block IDs: 0=air, 1=stone, 2=dirt, 3=grass, 4=cobblestone, 5=oak_planks,
// 6=oak_log, 7=oak_leaves, 8=sand, 9=water, 10=bedrock, 11=coal_ore,
// 12=iron_ore, 13=gold_ore, 14=diamond_ore, 15=obsidian, 16=snow,
// 17=ice, 18=gravel, 19=clay, 20=sandstone, 21=glass, 22=brick,
// 23=netherrack, 24=soul_sand, 25=glowstone, 26=lava, 27=oak_slab,
// 28=spruce_planks, 29=birch_planks, 30=spruce_log, 31=birch_log,
// 32=spruce_leaves, 33=birch_leaves, 34=deepslate, 35=copper_ore,
// 36=lapis_ore, 37=emerald_ore, 38=redstone_ore, 39=calcite,
// 40=tuff, 41=diorite, 42=granite, 43=andesite

export class BlockRegistry {
  constructor() {
    this.blocks = new Map();
    this.nameToId = new Map();
    this.nextId = 1;
  }

  register(name, properties = {}) {
    const id = this.nextId++;
    this.blocks.set(id, {
      id,
      name,
      hardness: properties.hardness ?? 1.0,
      lightLevel: properties.lightLevel ?? 0,
      isOpaque: properties.isOpaque ?? true,
      isSolid: properties.isSolid ?? true,
      isTransparent: properties.isTransparent ?? false,
      isLiquid: properties.isLiquid ?? false,
      toolType: properties.toolType ?? 'hand',
      dropId: properties.dropId ?? id,
      textureTop: properties.textureTop ?? name,
      textureSide: properties.textureSide ?? name,
      textureBottom: properties.textureBottom ?? name,
      ...properties,
    });
    this.nameToId.set(name, id);
    return id;
  }

  get(id) {
    return this.blocks.get(id) || null;
  }

  getByName(name) {
    const id = this.nameToId.get(name);
    return id ? this.blocks.get(id) : null;
  }

  getId(name) {
    return this.nameToId.get(name) || 0;
  }

  isOpaque(id) {
    const block = this.blocks.get(id);
    return block ? block.isOpaque : false;
  }

  isSolid(id) {
    const block = this.blocks.get(id);
    return block ? block.isSolid : false;
  }

  isTransparent(id) {
    const block = this.blocks.get(id);
    return block ? block.isTransparent : true; // air is transparent
  }

  isLiquid(id) {
    const block = this.blocks.get(id);
    return block ? block.isLiquid : false;
  }

  registerDefaults() {
    // Air is 0
    this.register('stone', { hardness: 1.5, toolType: 'pickaxe' });
    this.register('dirt', { hardness: 0.5, toolType: 'shovel' });
    this.register('grass_block', { hardness: 0.6, toolType: 'shovel', textureTop: 'grass_top', textureSide: 'grass_side', textureBottom: 'dirt' });
    this.register('cobblestone', { hardness: 2.0, toolType: 'pickaxe' });
    this.register('oak_planks', { hardness: 2.0, toolType: 'axe', textureTop: 'oak_planks', textureSide: 'oak_planks', textureBottom: 'oak_planks' });
    this.register('oak_log', { hardness: 2.0, toolType: 'axe', textureTop: 'oak_log_top', textureSide: 'oak_log_side', textureBottom: 'oak_log_top' });
    this.register('oak_leaves', { hardness: 0.2, isOpaque: false, isTransparent: true, toolType: 'hoe' });
    this.register('sand', { hardness: 0.5, toolType: 'shovel' });
    this.register('water', { hardness: 100, isOpaque: false, isSolid: false, isTransparent: true, isLiquid: true, lightLevel: 0 });
    this.register('bedrock', { hardness: -1, isOpaque: true, isSolid: true }); // -1 = unbreakable
    this.register('coal_ore', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('iron_ore', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('gold_ore', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('diamond_ore', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('obsidian', { hardness: 50.0, toolType: 'pickaxe' });
    this.register('snow_block', { hardness: 0.2, toolType: 'shovel' });
    this.register('ice', { hardness: 0.5, isOpaque: false, isTransparent: true, toolType: 'pickaxe' });
    this.register('gravel', { hardness: 0.6, toolType: 'shovel' });
    this.register('clay', { hardness: 0.6, toolType: 'shovel' });
    this.register('sandstone', { hardness: 0.8, toolType: 'pickaxe' });
    this.register('glass', { hardness: 0.3, isOpaque: false, isTransparent: true, toolType: 'any', dropId: 0 }); // drops nothing
    this.register('bricks', { hardness: 2.0, toolType: 'pickaxe' });
    this.register('netherrack', { hardness: 0.4, toolType: 'pickaxe' });
    this.register('soul_sand', { hardness: 0.5, toolType: 'shovel' });
    this.register('glowstone', { hardness: 0.3, lightLevel: 15, isOpaque: false, toolType: 'any' });
    this.register('lava', { hardness: 100, isOpaque: false, isSolid: false, isTransparent: true, isLiquid: true, lightLevel: 15 });
    this.register('oak_slab', { hardness: 2.0, toolType: 'axe' });
    this.register('spruce_planks', { hardness: 2.0, toolType: 'axe' });
    this.register('birch_planks', { hardness: 2.0, toolType: 'axe' });
    this.register('spruce_log', { hardness: 2.0, toolType: 'axe', textureTop: 'spruce_log_top', textureSide: 'spruce_log_side', textureBottom: 'spruce_log_top' });
    this.register('birch_log', { hardness: 2.0, toolType: 'axe', textureTop: 'birch_log_top', textureSide: 'birch_log_side', textureBottom: 'birch_log_top' });
    this.register('spruce_leaves', { hardness: 0.2, isOpaque: false, isTransparent: true, toolType: 'hoe' });
    this.register('birch_leaves', { hardness: 0.2, isOpaque: false, isTransparent: true, toolType: 'hoe' });
    this.register('deepslate', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('copper_ore', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('lapis_ore', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('emerald_ore', { hardness: 3.0, toolType: 'pickaxe' });
    this.register('redstone_ore', { hardness: 3.0, toolType: 'pickaxe', lightLevel: 7 });
    this.register('calcite', { hardness: 0.75, toolType: 'pickaxe' });
    this.register('tuff', { hardness: 1.5, toolType: 'pickaxe' });
    this.register('diorite', { hardness: 1.5, toolType: 'pickaxe' });
    this.register('granite', { hardness: 1.5, toolType: 'pickaxe' });
    this.register('andesite', { hardness: 1.5, toolType: 'pickaxe' });
  }
}
