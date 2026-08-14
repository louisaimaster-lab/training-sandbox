// Parts catalog, Chassis definitions, and 3-Choice Draft Generator (CATS style)

export const CHASSIS_ROBOTS = {
  classic: {
    id: 'classic',
    name: 'Classic Wedge Chassis',
    desc: 'Balanced farm defense frame with forward weapon slope and rear gadget bay.',
    baseHp: 300,
    basePower: 12,
    speed: 3.2,
    width: 64,
    height: 46,
    color: '#3b82f6',
    accentColor: '#1d4ed8',
    shape: 'wedge',
    sockets: [
      { id: 'front_gun', type: 'weapon', label: 'Front Hardpoint', x: 22, y: -10, icon: '🔫' },
      { id: 'top_mount', type: 'weapon', label: 'Roof Turret', x: -6, y: -22, icon: '🚀' },
      { id: 'rear_gadget', type: 'gadget', label: 'Rear Bay', x: -22, y: 0, icon: '⚙️' }
    ]
  },
  titan: {
    id: 'titan',
    name: 'Titan Harvester Chassis',
    desc: 'Heavy reinforced industrial box frame. Tremendous hull durability and triple mounts.',
    baseHp: 600,
    basePower: 16,
    speed: 2.2,
    width: 72,
    height: 56,
    color: '#d97706',
    accentColor: '#92400e',
    shape: 'box',
    sockets: [
      { id: 'front_gun', type: 'weapon', label: 'Main Arm', x: 28, y: -8, icon: '🔫' },
      { id: 'top_mount', type: 'weapon', label: 'Upper Deck', x: 0, y: -26, icon: '🚀' },
      { id: 'lower_gun', type: 'weapon', label: 'Under-slung', x: 18, y: 14, icon: '⚔️' },
      { id: 'rear_gadget', type: 'gadget', label: 'Aux Core', x: -24, y: -8, icon: '⚙️' }
    ]
  },
  sneaky: {
    id: 'sneaky',
    name: 'Sneaky Rover Chassis',
    desc: 'Compact aerodynamic scout chassis with lightning speed and precision energy grid.',
    baseHp: 220,
    basePower: 14,
    speed: 4.2,
    width: 52,
    height: 38,
    color: '#10b981',
    accentColor: '#047857',
    shape: 'sleek',
    sockets: [
      { id: 'front_gun', type: 'weapon', label: 'Nose Cannon', x: 20, y: -6, icon: '🔫' },
      { id: 'roof_tech', type: 'weapon', label: 'Spire Mount', x: -4, y: -18, icon: '⚡' },
      { id: 'rear_gadget', type: 'gadget', label: 'Booster Socket', x: -18, y: 4, icon: '💨' }
    ]
  }
};

export const ALL_PARTS = [
  // --- WEAPONS ---
  {
    id: 'rapid_blaster',
    name: 'Junimo Rapid Blaster',
    type: 'weapon',
    rarity: 'common',
    powerCost: 3,
    damage: 14,
    fireRate: 8, // frames per shot (7.5 shots/sec)
    range: 550,
    bulletSpeed: 16,
    bulletColor: '#38bdf8',
    weaponKind: 'gun',
    desc: 'High fire-rate kinetic blaster infused with star shards. Excellent against fast swarmers.',
    icon: '🔫',
    statsText: '14 DMG | 7.5/s Fire Rate | 3 Power'
  },
  {
    id: 'solar_laser',
    name: 'Solar Shard Beam',
    type: 'weapon',
    rarity: 'rare',
    powerCost: 5,
    damage: 32,
    fireRate: 1, // continuous raycast
    isBeam: true,
    range: 650,
    beamColor: '#facc15',
    weaponKind: 'laser',
    desc: 'Focuses pure sunlight from Stardew Valley into a piercing continuous heat ray.',
    icon: '⚡',
    statsText: '32 DPS Piercing Beam | 5 Power'
  },
  {
    id: 'farm_rockets',
    name: 'Crop-Buster Rocket Pod',
    type: 'weapon',
    rarity: 'epic',
    powerCost: 6,
    damage: 110,
    fireRate: 55,
    splashRadius: 90,
    isExplosive: true,
    bulletSpeed: 9,
    bulletColor: '#ef4444',
    weaponKind: 'rocket',
    desc: 'Launches heavy fertilizer-packed explosive missiles that annihilate clusters of monsters.',
    icon: '🚀',
    statsText: '110 Splash DMG (90px) | 6 Power'
  },
  {
    id: 'whirling_saw',
    name: 'Titanium Whirling Sawblade',
    type: 'weapon',
    rarity: 'rare',
    powerCost: 3,
    damage: 18,
    isMelee: true,
    bladeRadius: 28,
    spinSpeed: 0.35,
    weaponKind: 'saw',
    desc: 'Rapidly spinning serrated buzzsaw that shreds any slime or beast that gets too close.',
    icon: '🪚',
    statsText: '18 Melee Contact DMG / tick | 3 Power'
  },
  {
    id: 'harvester_drill',
    name: 'Ancient Mining Drill',
    type: 'weapon',
    rarity: 'rare',
    powerCost: 4,
    damage: 26,
    isMelee: true,
    drillLength: 36,
    weaponKind: 'drill',
    desc: 'A massive rotating diamond drill bit that tears through armored rock golems.',
    icon: '🔩',
    statsText: '26 Piercing Melee DMG / tick | 4 Power'
  },
  {
    id: 'flak_shotgun',
    name: 'Stardrop Scattergun',
    type: 'weapon',
    rarity: 'common',
    powerCost: 4,
    damage: 16,
    pellets: 6,
    spread: 0.4,
    fireRate: 35,
    bulletSpeed: 14,
    bulletColor: '#fb923c',
    weaponKind: 'shotgun',
    desc: 'Fires a wide 6-pellet blast of kinetic crystals with massive monster knockback.',
    icon: '💥',
    statsText: '16x6 DMG Spread | 4 Power'
  },

  // --- GADGETS & AUX ---
  {
    id: 'fairy_nanites',
    name: 'Fairy Dust Repair Bot',
    type: 'gadget',
    rarity: 'rare',
    powerCost: 2,
    passive: 'heal',
    healRate: 0.4, // HP per frame
    desc: 'Releases glowing restorative fairy motes that heal both the Robot and the Energy Core.',
    icon: '🧚',
    statsText: '+24 HP/sec Auto-Repair | 2 Power'
  },
  {
    id: 'stardew_barrier',
    name: 'Prismatic Forcefield Dome',
    type: 'gadget',
    rarity: 'epic',
    powerCost: 3,
    passive: 'shield',
    maxShield: 200,
    rechargeRate: 0.3,
    desc: 'Projects an energy sphere that absorbs incoming slime spits and monster leaps.',
    icon: '🛡️',
    statsText: '+200 Shield Barrier | 3 Power'
  },
  {
    id: 'repulsor_pulse',
    name: 'Magnetic Slime Repulsor',
    type: 'gadget',
    rarity: 'common',
    powerCost: 2,
    passive: 'repulse',
    pulseRate: 90,
    pulseRange: 140,
    desc: 'Periodically emits a kinetic shockwave that hurls approaching beasts backwards.',
    icon: '🧲',
    statsText: '140px Kinetic Knockback Pulse | 2 Power'
  },
  {
    id: 'solar_battery_core',
    name: 'Iridium Solar Supercell',
    type: 'gadget',
    rarity: 'epic',
    powerCost: -8, // GIVES 8 power
    bonusPower: 8,
    desc: 'Advanced Iridium cell supplying +8 extra Power Capacity to equip the heaviest weapons.',
    icon: '🔋',
    statsText: '+8 Energy Capacity | 0 Cost'
  },
  {
    id: 'overclock_thruster',
    name: 'Nitro Turbo Booster',
    type: 'gadget',
    rarity: 'common',
    powerCost: 1,
    passive: 'speed',
    speedMult: 1.35,
    desc: 'Rocket thrusters granting +35% movement speed and instant dash acceleration.',
    icon: '💨',
    statsText: '+35% Robot Move Speed | 1 Power'
  }
];

// Generates 3 random distinct options for the drafting stage
export function generateSupplyDraft(waveNum, existingInventoryIds = []) {
  const pool = [...ALL_PARTS];
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Weight epics higher in later waves
  return pool.slice(0, 3).map(part => ({ ...part }));
}
