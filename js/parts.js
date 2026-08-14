// CATS-styled Modular Parts & Chassis System for Turret Defense

export const PART_TYPES = {
  WEAPON: 'weapon',
  GADGET: 'gadget',
  ARMOR: 'armor',
  BATTERY: 'battery'
};

export const CHASSIS_TYPES = {
  scout: {
    id: 'scout',
    name: 'Scout Tripod',
    desc: 'Lightweight agile chassis. High swivel speed with balanced slots.',
    maxHp: 200,
    baseEnergy: 10,
    swivelSpeed: 0.18,
    slots: [
      { id: 'primary', type: PART_TYPES.WEAPON, label: 'Primary Mount', x: 0, y: -16 },
      { id: 'gadget1', type: PART_TYPES.GADGET, label: 'Aux Module', x: -14, y: 4 },
      { id: 'battery', type: PART_TYPES.BATTERY, label: 'Power Cell', x: 14, y: 4 }
    ],
    width: 48,
    height: 48,
    color: '#3b82f6',
    border: '#1d4ed8'
  },
  heavy: {
    id: 'heavy',
    name: 'Bunker Fortress',
    desc: 'Reinforced heavy platform with dual weapon mounts and thick plating.',
    maxHp: 450,
    baseEnergy: 14,
    swivelSpeed: 0.11,
    slots: [
      { id: 'primary', type: PART_TYPES.WEAPON, label: 'Main Cannon', x: -12, y: -20 },
      { id: 'secondary', type: PART_TYPES.WEAPON, label: 'Sub Weapon', x: 12, y: -20 },
      { id: 'gadget1', type: PART_TYPES.GADGET, label: 'Tech Socket', x: -18, y: 6 },
      { id: 'armor', type: PART_TYPES.ARMOR, label: 'Plating Slot', x: 18, y: 6 }
    ],
    width: 60,
    height: 52,
    color: '#475569',
    border: '#0f172a'
  },
  titan: {
    id: 'titan',
    name: 'Titan Assault Platform',
    desc: 'State-of-the-art military chassis capable of powering triple weapon arrays.',
    maxHp: 700,
    baseEnergy: 20,
    swivelSpeed: 0.08,
    slots: [
      { id: 'primary', type: PART_TYPES.WEAPON, label: 'Heavy Gun', x: 0, y: -26 },
      { id: 'weaponL', type: PART_TYPES.WEAPON, label: 'Left Wing', x: -22, y: -12 },
      { id: 'weaponR', type: PART_TYPES.WEAPON, label: 'Right Wing', x: 22, y: -12 },
      { id: 'gadget1', type: PART_TYPES.GADGET, label: 'Core System', x: -14, y: 12 },
      { id: 'armor', type: PART_TYPES.ARMOR, label: 'Reactive Armor', x: 14, y: 12 }
    ],
    width: 72,
    height: 64,
    color: '#eab308',
    border: '#854d0e'
  }
};

export const PARTS_CATALOG = [
  // --- WEAPONS ---
  {
    id: 'minigun_mk1',
    name: 'Vulkan Minigun Mk.I',
    type: PART_TYPES.WEAPON,
    tier: 1,
    energyCost: 3,
    damage: 9,
    fireRate: 6, // frames between shots (10/sec)
    spread: 0.12,
    range: 650,
    bulletSpeed: 18,
    bulletColor: '#fbbf24',
    sound: 'minigun',
    desc: 'High rate-of-fire rotary cannon. Shreds fast-moving infected hordes.',
    cost: 100,
    icon: '🔫'
  },
  {
    id: 'shotgun_heavy',
    name: 'Street Sweeper Flak',
    type: PART_TYPES.WEAPON,
    tier: 1,
    energyCost: 4,
    damage: 18,
    pellets: 6,
    fireRate: 36,
    spread: 0.35,
    range: 480,
    bulletSpeed: 15,
    bulletColor: '#f97316',
    sound: 'shotgun',
    desc: 'Fires a deadly cone of 6 high-impact kinetic pellets with huge knockback.',
    cost: 140,
    icon: '💥'
  },
  {
    id: 'laser_beam',
    name: 'Photon Lance Beam',
    type: PART_TYPES.WEAPON,
    tier: 2,
    energyCost: 6,
    damage: 28,
    fireRate: 1, // Continuous beam tick
    isBeam: true,
    range: 750,
    beamColor: '#38bdf8',
    sound: 'laser',
    desc: 'Continuous energy beam that burns straight through multiple targets.',
    cost: 260,
    icon: '⚡'
  },
  {
    id: 'rocket_pod',
    name: 'Hydra Rocket Pod',
    type: PART_TYPES.WEAPON,
    tier: 2,
    energyCost: 5,
    damage: 85,
    fireRate: 50,
    splashRadius: 75,
    isExplosive: true,
    bulletSpeed: 10,
    bulletColor: '#ef4444',
    sound: 'rocket',
    desc: 'Launches high-explosive ordnance that detonates in a devastating shockwave.',
    cost: 320,
    icon: '🚀'
  },
  {
    id: 'cryo_cannon',
    name: 'Absolute Zero Blaster',
    type: PART_TYPES.WEAPON,
    tier: 2,
    energyCost: 4,
    damage: 22,
    fireRate: 20,
    spread: 0.08,
    range: 600,
    bulletSpeed: 14,
    slowEffect: 0.55, // Slows enemies by 55%
    bulletColor: '#06b6d4',
    sound: 'plasma',
    desc: 'Fires sub-zero plasma bursts that freeze and slow mutant beasts.',
    cost: 240,
    icon: '❄️'
  },
  {
    id: 'plasma_mortar',
    name: 'Sunfire Heavy Cannon',
    type: PART_TYPES.WEAPON,
    tier: 3,
    energyCost: 7,
    damage: 150,
    fireRate: 65,
    splashRadius: 100,
    isExplosive: true,
    bulletSpeed: 12,
    bulletColor: '#ec4899',
    sound: 'heavy',
    desc: 'Military-grade artillery firing searing plasma mortar rounds.',
    cost: 450,
    icon: '☄️'
  },

  // --- GADGETS ---
  {
    id: 'nanite_repair',
    name: 'Auto-Repair Nanites',
    type: PART_TYPES.GADGET,
    tier: 1,
    energyCost: 2,
    passive: 'heal',
    healRate: 0.35, // HP per frame
    desc: 'Constantly repairs both the Turret and the House structural integrity.',
    cost: 160,
    icon: '🛠️'
  },
  {
    id: 'energy_shield',
    name: 'Aegis Forcefield Dome',
    type: PART_TYPES.GADGET,
    tier: 2,
    energyCost: 3,
    passive: 'shield',
    maxShield: 150,
    rechargeRate: 0.25,
    desc: 'Projects a kinetic energy barrier that intercepts incoming acid spit & leaps.',
    cost: 250,
    icon: '🛡️'
  },
  {
    id: 'target_radar',
    name: 'Predictive Targeting Radar',
    type: PART_TYPES.GADGET,
    tier: 1,
    energyCost: 1,
    passive: 'crit',
    critBonus: 0.25, // +25% crit chance
    rangeBonus: 100,
    desc: 'Advanced telemetry sensors granting +25% Critical Hit Chance and +100 Range.',
    cost: 180,
    icon: '📡'
  },

  // --- ARMOR ---
  {
    id: 'composite_armor',
    name: 'Kevlar Composite Plates',
    type: PART_TYPES.ARMOR,
    tier: 1,
    energyCost: 0,
    bonusHp: 180,
    damageReduction: 4,
    desc: 'Reinforced ballistic layering providing +180 HP and flat damage reduction.',
    cost: 120,
    icon: '🧱'
  },
  {
    id: 'reactive_armor',
    name: 'Titanium Reactive Hull',
    type: PART_TYPES.ARMOR,
    tier: 2,
    energyCost: 0,
    bonusHp: 380,
    damageReduction: 9,
    desc: 'Heavy titanium plating offering +380 HP and superior monster resistance.',
    cost: 280,
    icon: '🦾'
  },

  // --- BATTERIES ---
  {
    id: 'fusion_cell',
    name: 'Fusion Battery Mk.I',
    type: PART_TYPES.BATTERY,
    tier: 1,
    energyCost: 0,
    bonusEnergy: 5,
    desc: 'Miniature nuclear reactor supplying +5 Energy to chassis power grid.',
    cost: 150,
    icon: '🔋'
  },
  {
    id: 'overclock_core',
    name: 'Antimatter Supercell',
    type: PART_TYPES.BATTERY,
    tier: 2,
    energyCost: 0,
    bonusEnergy: 10,
    desc: 'Dense power core supplying +10 Energy, enabling maximum weapon loadouts.',
    cost: 320,
    icon: '⚛️'
  }
];
