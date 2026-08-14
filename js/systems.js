// Wave management, Shop items, Crafting recipes, and Loot tables

export const SHOP_ITEMS = [
  { id: 'potion', name: 'Lesser Healing Potion', cost: 15, desc: 'Restores 40 HP (Press H)', type: 'potion', amount: 1 },
  { id: 'wood', name: 'Wood Planks (x5)', cost: 10, desc: 'Crafting material', type: 'mat', matKey: 'wood', amount: 5 },
  { id: 'ironOre', name: 'Iron Ore (x3)', cost: 35, desc: 'Essential metal for weapons & armor', type: 'mat', matKey: 'ironOre', amount: 3 },
  { id: 'goldOre', name: 'Gold Ore (x2)', cost: 60, desc: 'Precious metal for high-tier gear', type: 'mat', matKey: 'goldOre', amount: 2 },
  { id: 'fireCore', name: 'Fire Core', cost: 120, desc: 'Infused with hellfire embers', type: 'mat', matKey: 'fireCore', amount: 1 },
  { id: 'darkShard', name: 'Dark Shard', cost: 150, desc: 'Pulsing with corrupted energy', type: 'mat', matKey: 'darkShard', amount: 1 },
];

export const CRAFTING_RECIPES = [
  {
    id: 'sword_iron',
    name: 'Iron Broadsword',
    type: 'weapon',
    cost: { ironOre: 8, wood: 5 },
    desc: 'Heavy blade with high knockback. (22 Dmg, 5.5 KB)',
    data: {
      id: 'sword_iron',
      name: 'Iron Broadsword',
      damage: 22,
      knockback: 5.5,
      swingSpeed: 16,
      range: 42,
      critChance: 0.10,
      effectColor: '#cbd5e1',
      special: null
    }
  },
  {
    id: 'sword_gold',
    name: 'Gold Longsword',
    type: 'weapon',
    cost: { goldOre: 10, wood: 8 },
    desc: 'Gleaming blade with high critical strike chance. (36 Dmg, 18% Crit)',
    data: {
      id: 'sword_gold',
      name: 'Gold Longsword',
      damage: 36,
      knockback: 6.0,
      swingSpeed: 15,
      range: 46,
      critChance: 0.18,
      effectColor: '#fbbf24',
      special: null
    }
  },
  {
    id: 'sword_fire',
    name: 'Fiery Greatsword',
    type: 'weapon',
    cost: { fireCore: 3, ironOre: 6 },
    desc: 'Massive blazing blade that unleashes fire slashes. (58 Dmg, Fire Aura)',
    data: {
      id: 'sword_fire',
      name: 'Fiery Greatsword',
      damage: 58,
      knockback: 7.0,
      swingSpeed: 19,
      range: 54,
      critChance: 0.20,
      effectColor: '#f97316',
      special: 'fire'
    }
  },
  {
    id: 'sword_night',
    name: "Night's Edge",
    type: 'weapon',
    cost: { darkShard: 4, fireCore: 2, goldOre: 6 },
    desc: 'Ultimate legendary blade imbued with demonic shadows. (88 Dmg, Shadow Arc)',
    data: {
      id: 'sword_night',
      name: "Night's Edge",
      damage: 88,
      knockback: 8.5,
      swingSpeed: 14,
      range: 62,
      critChance: 0.25,
      effectColor: '#c084fc',
      special: 'dark'
    }
  },
  {
    id: 'armor_plate',
    name: 'Knight Plate Armor',
    type: 'upgrade',
    cost: { ironOre: 12, goldOre: 4 },
    desc: 'Reinforced iron plate. Grants +5 Defense & +20 Max HP',
    apply: (player) => {
      player.defense += 5;
      player.maxHp += 20;
      player.hp = Math.min(player.maxHp, player.hp + 20);
    }
  },
  {
    id: 'hermes_boots',
    name: 'Hermes Boots',
    type: 'upgrade',
    cost: { goldOre: 8, wood: 10 },
    desc: 'Wings of Hermes. Increases movement speed by +35%',
    apply: (player) => {
      player.speedBonus = 1.35;
    }
  },
  {
    id: 'cloud_bottle',
    name: 'Cloud in a Bottle',
    type: 'upgrade',
    cost: { darkShard: 2, wood: 8 },
    desc: 'A cloud trapped inside glass. Grants Double Jump!',
    apply: (player) => {
      player.hasDoubleJump = true;
    }
  }
];

export class WaveManager {
  constructor() {
    this.currentWave = 1;
    this.state = 'wave'; // 'wave', 'intermission', 'gameover', 'victory'
    this.enemiesRemainingToSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 80;
    this.intermissionTimer = 0;
    this.isWorkstationRound = false;
    this.craftedItems = new Set();
    this.startWave(1);
  }

  startWave(waveNum) {
    this.currentWave = waveNum;
    this.state = 'wave';
    this.isWorkstationRound = (this.currentWave % 3 === 0);

    // Scaling count of zombies
    this.enemiesRemainingToSpawn = 6 + waveNum * 3;
    this.spawnInterval = Math.max(35, 80 - waveNum * 4);
    this.spawnTimer = 20;
  }

  update(enemies, spawnEnemyCallback, audio, floatTexts) {
    if (this.state === 'wave') {
      this.spawnTimer--;
      if (this.spawnTimer <= 0 && this.enemiesRemainingToSpawn > 0) {
        this.spawnTimer = this.spawnInterval;
        this.enemiesRemainingToSpawn--;

        // Determine enemy type based on wave & RNG
        let type = 'zombie';
        const roll = Math.random();

        if (this.currentWave >= 4 && roll < 0.15 && this.enemiesRemainingToSpawn === 0) {
          type = 'brute'; // Wave boss
        } else if (this.currentWave >= 3 && roll < 0.35) {
          type = 'crawler';
        } else if (this.currentWave >= 2 && roll < 0.50) {
          type = 'armored_zombie';
        }

        // Spawn left or right
        const side = Math.random() < 0.5 ? 'left' : 'right';
        spawnEnemyCallback(type, side);
      }

      // Check if wave is cleared
      if (this.enemiesRemainingToSpawn === 0 && enemies.length === 0) {
        this.state = 'intermission';
        this.intermissionTimer = 1800; // 30 seconds default, can skip with button
        audio.playWaveHorn();
      }
    }
  }

  skipIntermission() {
    if (this.state === 'intermission') {
      this.startWave(this.currentWave + 1);
    }
  }
}
