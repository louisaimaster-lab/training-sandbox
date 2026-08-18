// Main 2D Pixel RPG Engine, Y-Sorted Renderer, Heightmap & Day/Night Cycle
import { HeightmapWorld, TIER_LOWLAND, TIER_PLATEAU, TIER_HIGHLAND, TILE_GRASS, TILE_DIRT, TILE_WATER, TILE_STONE_PATH, TILE_CLIFF_WALL, TILE_RAMP_UP, TILE_LEDGE_JUMP } from './heightmap.js';
import { SpriteLoader } from './sprites.js';
import { SoundEngine } from './audio.js';
import { Player, HarvestableObject, Enemy, Particle, FloatingText } from './entities.js';
import { InventorySystem } from './inventory.js';

export class RPGGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Viewport Virtual Pixel Resolution
    this.viewWidth = 480;
    this.viewHeight = 270;

    this.world = new HeightmapWorld(64, 48, 16);
    this.sprites = new SpriteLoader();
    this.audio = new SoundEngine();
    this.inventory = new InventorySystem();

    this.player = new Player(26 * 16, 20 * 16, TIER_PLATEAU);

    this.harvestables = [];
    this.enemies = [];
    this.lootDrops = [];
    this.particles = [];
    this.floatTexts = [];

    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false };
    this.camera = { x: 0, y: 0 };
    this.timeOfDay = 0.25; // 0 = Midnight, 0.25 = Morning, 0.5 = Noon, 0.75 = Sunset
    this.frameCount = 0;

    this.setupWorldEntities();
    this.setupResize();
    this.setupInputs();
    this.inventory.renderHotbarUI();
  }

  setupWorldEntities() {
    // 1. Populate Trees on Lowland (Z=0), Plateau (Z=1), Highlands (Z=2)
    const treeCoords = [
      { x: 18 * 16, y: 12 * 16, z: TIER_PLATEAU },
      { x: 32 * 16, y: 12 * 16, z: TIER_PLATEAU },
      { x: 20 * 16, y: 38 * 16, z: TIER_PLATEAU },
      { x: 34 * 16, y: 38 * 16, z: TIER_PLATEAU },
      { x: 42 * 16, y: 8 * 16, z: TIER_HIGHLAND },
      { x: 50 * 16, y: 14 * 16, z: TIER_HIGHLAND },
      { x: 8 * 16, y: 22 * 16, z: TIER_LOWLAND }
    ];
    treeCoords.forEach(t => {
      this.harvestables.push(new HarvestableObject(t.x, t.y, t.z, 'tree', 3));
    });

    // 2. Populate Mining Rocks & Ores
    const oreCoords = [
      { x: 46 * 16, y: 10 * 16, z: TIER_HIGHLAND, type: 'rock_gold' },
      { x: 52 * 16, y: 18 * 16, z: TIER_HIGHLAND, type: 'rock_iron' },
      { x: 22 * 16, y: 15 * 16, z: TIER_PLATEAU, type: 'rock_copper' },
      { x: 30 * 16, y: 32 * 16, z: TIER_PLATEAU, type: 'rock_copper' }
    ];
    oreCoords.forEach(o => {
      this.harvestables.push(new HarvestableObject(o.x, o.y, o.z, o.type, 4));
    });

    // 3. Populate Slimes
    this.enemies.push(new Enemy(22 * 16, 24 * 16, TIER_PLATEAU, 'slime'));
    this.enemies.push(new Enemy(48 * 16, 12 * 16, TIER_HIGHLAND, 'slime'));
  }

  setupResize() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.ctx.imageSmoothingEnabled = false;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.audio.init();
      this.keys[e.code] = true;

      // Number keys 1-9, 0 for Hotbar slot selection
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        const index = digit === 0 ? 9 : digit - 1;
        this.inventory.selectSlot(index);
      }

      // Quick potion heal
      if (e.code === 'KeyH') {
        this.inventory.usePotion(this.player, this.audio, this.floatTexts);
      }

      // Space / Action Key
      if (e.code === 'Space') {
        const item = this.inventory.getSelectedItem();
        this.player.performAction(item, this.world, this.harvestables, this.enemies, this.audio, this.particles, this.floatTexts, this.lootDrops);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.audio.init();
      if (e.button === 0) {
        const item = this.inventory.getSelectedItem();
        this.player.performAction(item, this.world, this.harvestables, this.enemies, this.audio, this.particles, this.floatTexts, this.lootDrops);
      }
    });
  }

  update() {
    this.frameCount++;
    // Advance Day/Night cycle
    this.timeOfDay = (this.timeOfDay + 0.00015) % 1.0;

    // 1. Update Player
    this.player.update(this.keys, this.world, this.audio, this.particles, this.floatTexts);

    // 2. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(this.player, this.world);
    }

    // 3. Update Loot Drops
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      const picked = drop.update(this.player, this.inventory, this.audio, this.floatTexts);
      if (picked || drop.life <= 0) {
        this.lootDrops.splice(i, 1);
      }
    }

    // 4. Update Particles & Floating Text
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      this.floatTexts[i].update();
      if (this.floatTexts[i].life <= 0) this.floatTexts.splice(i, 1);
    }

    // 5. Camera Follow with Bounds Clamp
    const targetCamX = this.player.x + 8 - this.viewWidth / 2;
    const targetCamY = this.player.y + 10 - this.viewHeight / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    this.camera.y += (targetCamY - this.camera.y) * 0.1;

    const maxCamX = this.world.width * this.world.tileSize - this.viewWidth;
    const maxCamY = this.world.height * this.world.tileSize - this.viewHeight;
    this.camera.x = Math.max(0, Math.min(maxCamX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxCamY, this.camera.y));

    this.updateHUD();
  }

  updateHUD() {
    // Hearts Bar
    const hpBar = document.getElementById('hud-hp-bar');
    const hpText = document.getElementById('hud-hp-text');
    if (hpBar && hpText) {
      const pct = (this.player.hp / this.player.maxHp) * 100;
      hpBar.style.width = `${pct}%`;
      hpText.textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;
    }

    // Stamina Bar
    const staBar = document.getElementById('hud-stamina-bar');
    if (staBar) {
      const pct = (this.player.stamina / this.player.maxStamina) * 100;
      staBar.style.width = `${pct}%`;
    }

    // Elevation Tier Indicator
    const tierEl = document.getElementById('hud-elevation-text');
    if (tierEl) {
      const names = ['Lowland Valley (Z:0)', 'Plateau Farmland (Z:1)', 'Mountain Highlands (Z:2)'];
      tierEl.textContent = `📍 ${names[this.player.zLevel]}`;
    }

    // Time Clock
    const timeEl = document.getElementById('hud-time-text');
    if (timeEl) {
      const hour = Math.floor(this.timeOfDay * 24);
      const min = Math.floor((this.timeOfDay * 24 * 60) % 60);
      const period = hour >= 12 ? 'PM' : 'AM';
      const dispHour = hour % 12 === 0 ? 12 : hour % 12;
      timeEl.textContent = `🕒 ${dispHour}:${min.toString().padStart(2, '0')} ${period}`;
    }
  }

  draw() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Scale Virtual Resolution to full window
    const scale = Math.min(this.canvas.width / this.viewWidth, this.canvas.height / this.viewHeight);
    const offsetX = (this.canvas.width - this.viewWidth * scale) / 2;
    const offsetY = (this.canvas.height - this.viewHeight * scale) / 2;

    this.ctx.translate(Math.floor(offsetX), Math.floor(offsetY));
    this.ctx.scale(scale, scale);

    // Apply Camera Translation
    this.ctx.translate(Math.floor(-this.camera.x), Math.floor(-this.camera.y));

    // 1. Draw Base Heightmap Terrain (Tiles)
    this.drawTerrain();

    // 2. Y-Sorted Layered Entity Rendering (Physical Depth Sorting)
    const renderQueue = [
      this.player,
      ...this.harvestables,
      ...this.enemies,
      ...this.lootDrops
    ];

    // Sort by: Elevation Z Level, then Y coordinate!
    renderQueue.sort((a, b) => {
      const aDepth = (a.zLevel * 10000) + (a.y + (a.height || 0));
      const bDepth = (b.zLevel * 10000) + (b.y + (b.height || 0));
      return aDepth - bDepth;
    });

    renderQueue.forEach(entity => {
      entity.draw(this.ctx, this.sprites);
    });

    // 3. Draw Particles & Damage Numbers
    for (const p of this.particles) p.draw(this.ctx);
    for (const ft of this.floatTexts) ft.draw(this.ctx);

    // 4. Day / Sunset / Night Ambient Lighting Pass
    this.drawLightingPass();

    this.ctx.restore();
  }

  drawTerrain() {
    const ts = this.world.tileSize;
    const startTileX = Math.floor(this.camera.x / ts);
    const endTileX = Math.min(this.world.width, Math.ceil((this.camera.x + this.viewWidth) / ts) + 1);
    const startTileY = Math.floor(this.camera.y / ts);
    const endTileY = Math.min(this.world.height, Math.ceil((this.camera.y + this.viewHeight) / ts) + 1);

    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const tile = this.world.getTile(x, y);
        const px = x * ts;
        const py = y * ts;

        let sprKey = 'tile_grass';
        if (tile === TILE_DIRT) sprKey = 'tile_dirt';
        else if (tile === TILE_WATER) sprKey = 'tile_water';
        else if (tile === TILE_STONE_PATH) sprKey = 'tile_path';
        else if (tile === TILE_CLIFF_WALL) sprKey = 'tile_cliff';
        else if (tile === TILE_RAMP_UP) sprKey = 'tile_ramp';
        else if (tile === TILE_LEDGE_JUMP) sprKey = 'tile_ledge';

        const spr = this.sprites.get(sprKey);
        if (spr) {
          this.ctx.drawImage(spr, px, py, ts, ts);
        }
      }
    }
  }

  drawLightingPass() {
    // Ambient darkness based on time of day
    let darkAlpha = 0;
    if (this.timeOfDay < 0.2 || this.timeOfDay > 0.8) {
      darkAlpha = 0.65; // Night
    } else if (this.timeOfDay > 0.65 && this.timeOfDay <= 0.8) {
      darkAlpha = 0.35; // Sunset
    }

    if (darkAlpha > 0) {
      this.ctx.save();
      // Draw darkness overlay with radial player lantern cutout
      this.ctx.fillStyle = `rgba(8, 14, 28, ${darkAlpha})`;
      this.ctx.fillRect(this.camera.x, this.camera.y, this.viewWidth, this.viewHeight);

      // Radial Lantern Cutout
      const playerCenterX = this.player.x + 8;
      const playerCenterY = this.player.y + 10;
      const lantern = this.ctx.createRadialGradient(
        playerCenterX, playerCenterY, 8,
        playerCenterX, playerCenterY, 55
      );
      lantern.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      lantern.addColorStop(1, 'rgba(254, 240, 138, 0)');
      this.ctx.fillStyle = lantern;
      this.ctx.beginPath();
      this.ctx.arc(playerCenterX, playerCenterY, 55, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// Boot game when window is ready
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('rpg-canvas');
  if (canvas) {
    const game = new RPGGame(canvas);
    window.game = game;
    game.loop();
  }
});
