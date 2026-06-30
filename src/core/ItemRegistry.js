// ItemRegistry.js - Item ID lookup
export class ItemRegistry {
  constructor() {
    this.items = new Map();
    this.nameToId = new Map();
    this.nextId = 1;
  }

  register(name, properties = {}) {
    const id = this.nextId++;
    this.items.set(id, {
      id,
      name,
      maxStack: properties.maxStack ?? 64,
      isBlock: properties.isBlock ?? false,
      blockId: properties.blockId ?? 0,
      durability: properties.durability ?? 0,
      toolType: properties.toolType ?? null,
      toolTier: properties.toolTier ?? 0,
      damage: properties.damage ?? 1,
      attackSpeed: properties.attackSpeed ?? 1.0,
      food: properties.food ?? null,
      fuelTicks: properties.fuelTicks ?? 0,
      ...properties,
    });
    this.nameToId.set(name, id);
    return id;
  }

  get(id) {
    return this.items.get(id) || null;
  }

  getByName(name) {
    const id = this.nameToId.get(name);
    return id ? this.items.get(id) : null;
  }

  getId(name) {
    return this.nameToId.get(name) || 0;
  }

  registerDefaults() {
    // Block items
    this.register('stone', { isBlock: true, blockId: 1 });
    this.register('dirt', { isBlock: true, blockId: 2 });
    this.register('grass_block', { isBlock: true, blockId: 3 });
    this.register('cobblestone', { isBlock: true, blockId: 4 });
    this.register('oak_planks', { isBlock: true, blockId: 5 });
    this.register('oak_log', { isBlock: true, blockId: 6 });
    this.register('oak_leaves', { isBlock: true, blockId: 7 });
    this.register('sand', { isBlock: true, blockId: 8 });
    this.register('bedrock', { isBlock: true, blockId: 10 });
    this.register('coal_ore', { isBlock: true, blockId: 11 });
    this.register('iron_ore', { isBlock: true, blockId: 12 });
    this.register('gold_ore', { isBlock: true, blockId: 13 });
    this.register('diamond_ore', { isBlock: true, blockId: 14 });
    this.register('obsidian', { isBlock: true, blockId: 15 });
    this.register('sandstone', { isBlock: true, blockId: 20 });
    this.register('glass', { isBlock: true, blockId: 21 });
    this.register('bricks', { isBlock: true, blockId: 22 });
    this.register('netherrack', { isBlock: true, blockId: 23 });
    this.register('glowstone', { isBlock: true, blockId: 25 });

    // Tools
    this.register('wooden_pickaxe', { durability: 59, toolType: 'pickaxe', toolTier: 1, maxStack: 1 });
    this.register('stone_pickaxe', { durability: 131, toolType: 'pickaxe', toolTier: 2, maxStack: 1 });
    this.register('iron_pickaxe', { durability: 250, toolType: 'pickaxe', toolTier: 3, maxStack: 1 });
    this.register('diamond_pickaxe', { durability: 1561, toolType: 'pickaxe', toolTier: 4, maxStack: 1 });
    this.register('wooden_axe', { durability: 59, toolType: 'axe', toolTier: 1, damage: 7, maxStack: 1 });
    this.register('stone_axe', { durability: 131, toolType: 'axe', toolTier: 2, damage: 9, maxStack: 1 });
    this.register('wooden_shovel', { durability: 59, toolType: 'shovel', toolTier: 1, maxStack: 1 });
    this.register('stone_shovel', { durability: 131, toolType: 'shovel', toolTier: 2, maxStack: 1 });
    this.register('wooden_sword', { durability: 59, damage: 4, maxStack: 1 });
    this.register('stone_sword', { durability: 131, damage: 5, maxStack: 1 });
    this.register('iron_sword', { durability: 250, damage: 6, maxStack: 1 });
    this.register('diamond_sword', { durability: 1561, damage: 7, maxStack: 1 });

    // Materials
    this.register('coal', { fuelTicks: 1600 });
    this.register('iron_ingot', {});
    this.register('gold_ingot', {});
    this.register('diamond', {});
    this.register('stick', { fuelTicks: 100 });
    this.register('oak_planks_item', { fuelTicks: 300 }); // separate from block item for clarity

    // Food
    this.register('apple', { food: { hunger: 4, saturation: 2.4 } });
    this.register('bread', { food: { hunger: 5, saturation: 6.0 } });
    this.register('cooked_beef', { food: { hunger: 8, saturation: 12.8 } });
    this.register('raw_beef', { food: { hunger: 3, saturation: 1.8 } });
  }
}
