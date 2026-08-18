// Custom PNG Asset Pipeline & Fallback 16-bit Pixel Art Generator
// Automatically loads user PNGs from /assets/ or falls back to built-in pixel sprites

export class SpriteLoader {
  constructor() {
    this.customImages = new Map(); // key => HTMLImageElement
    this.fallbackSprites = new Map(); // key => HTMLCanvasElement
    this.initFallbacks();
  }

  // Load custom user PNG from /assets/
  loadUserPNG(key, path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        this.customImages.set(key, img);
        resolve(true);
      };
      img.onerror = () => {
        // Fallback gracefully if file is not uploaded yet
        resolve(false);
      };
    });
  }

  get(key) {
    if (this.customImages.has(key)) {
      return this.customImages.get(key);
    }
    return this.fallbackSprites.get(key) || null;
  }

  // Procedural 16-bit Crisp Pixel Fallbacks
  initFallbacks() {
    // 1. Terrain & Heightmap Tiles (16x16)
    this.fallbackSprites.set('tile_grass', this.createTileCanvas((ctx) => {
      ctx.fillStyle = '#2d6a4f';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#40916c';
      ctx.fillRect(2, 2, 4, 3);
      ctx.fillRect(10, 8, 3, 4);
      ctx.fillStyle = '#1b4332';
      ctx.fillRect(6, 12, 4, 2);
    }));

    this.fallbackSprites.set('tile_dirt', this.createTileCanvas((ctx) => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(3, 4, 3, 3);
      ctx.fillRect(10, 11, 4, 2);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(8, 3, 3, 2);
    }));

    this.fallbackSprites.set('tile_water', this.createTileCanvas((ctx) => {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(2, 4, 6, 2);
      ctx.fillRect(8, 10, 6, 2);
    }));

    this.fallbackSprites.set('tile_path', this.createTileCanvas((ctx) => {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(2, 2, 5, 4);
      ctx.fillRect(9, 3, 5, 4);
      ctx.fillRect(4, 9, 6, 5);
    }));

    this.fallbackSprites.set('tile_cliff', this.createTileCanvas((ctx) => {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 12, 16, 4); // Shadow base
      ctx.fillStyle = '#64748b';
      ctx.fillRect(2, 2, 12, 4); // Top edge highlight
    }));

    this.fallbackSprites.set('tile_ramp', this.createTileCanvas((ctx) => {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(4, 0, 8, 16); // Ramp track
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(7, 2, 2, 12);
    }));

    this.fallbackSprites.set('tile_ledge', this.createTileCanvas((ctx) => {
      ctx.fillStyle = '#40916c';
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 8, 16, 8); // Dropping cliff edge
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(6, 10, 4, 2); // Down arrow hint
    }));

    // 2. Player 4-Directional Character Sprites (16x20)
    const directions = ['down', 'up', 'left', 'right'];
    directions.forEach((dir) => {
      for (let f = 0; f < 4; f++) {
        this.fallbackSprites.set(`player_${dir}_${f}`, this.createCharacterSprite(dir, f));
      }
    });

    // 3. Harvestable Resource Objects
    this.fallbackSprites.set('obj_tree', this.createTreeSprite());
    this.fallbackSprites.set('obj_rock_copper', this.createOreRockSprite('#d97706'));
    this.fallbackSprites.set('obj_rock_iron', this.createOreRockSprite('#cbd5e1'));
    this.fallbackSprites.set('obj_rock_gold', this.createOreRockSprite('#facc15'));

    // 4. Crescent Pixel Slash Sprites (Matching user's reference photo!)
    this.fallbackSprites.set('slash_right', this.createSlashSprite('right'));
    this.fallbackSprites.set('slash_left', this.createSlashSprite('left'));
    this.fallbackSprites.set('slash_up', this.createSlashSprite('up'));
    this.fallbackSprites.set('slash_down', this.createSlashSprite('down'));
  }

  createTileCanvas(drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return canvas;
  }

  createCharacterSprite(dir, frame) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Bobbing offset for walking animation
    const bob = (frame % 2 === 1) ? 1 : 0;
    const legOffset = (frame === 1) ? 2 : (frame === 3 ? -2 : 0);

    // Body / Tunic
    ctx.fillStyle = '#2563eb'; // Adventurer Blue
    ctx.fillRect(3, 7 + bob, 10, 7);

    // Belt
    ctx.fillStyle = '#78350f';
    ctx.fillRect(3, 12 + bob, 10, 2);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(7, 12 + bob, 2, 2);

    // Head / Hair
    ctx.fillStyle = '#fed7aa'; // Skin
    ctx.fillRect(4, 2 + bob, 8, 6);

    ctx.fillStyle = '#713f12'; // Brown Hair
    ctx.fillRect(3, 1 + bob, 10, 3);
    if (dir === 'down') {
      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(5, 5 + bob, 2, 2);
      ctx.fillRect(9, 5 + bob, 2, 2);
    } else if (dir === 'up') {
      // Back of head hair
      ctx.fillStyle = '#713f12';
      ctx.fillRect(3, 3 + bob, 10, 4);
    } else if (dir === 'left') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, 5 + bob, 2, 2);
    } else if (dir === 'right') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, 5 + bob, 2, 2);
    }

    // Legs / Boots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4 + legOffset, 14 + bob, 3, 5);
    ctx.fillRect(9 - legOffset, 14 + bob, 3, 5);

    return canvas;
  }

  createTreeSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Tree Trunk
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(12, 24, 8, 14);
    ctx.fillStyle = '#3e2413';
    ctx.fillRect(12, 34, 8, 4);

    // Leaf Canopy (Layered rich green pixel crowns)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(14, 12, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#86efac';
    ctx.fillRect(10, 8, 4, 3);

    return canvas;
  }

  createOreRockSprite(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 18;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Rock body
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(2, 3, 16, 13, 4);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.fillRect(4, 12, 12, 3);

    // Sparkling Ore Veins
    ctx.fillStyle = color;
    ctx.fillRect(5, 6, 3, 3);
    ctx.fillRect(11, 8, 4, 3);
    ctx.fillRect(8, 11, 3, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 6, 1, 1);
    ctx.fillRect(12, 8, 1, 1);

    return canvas;
  }

  // Crescent Pixel Slash Art (Inspired by user's uploaded reference image!)
  createSlashSprite(dir) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.translate(16, 16);
    if (dir === 'left') ctx.scale(-1, 1);
    else if (dir === 'up') ctx.rotate(-Math.PI / 2);
    else if (dir === 'down') ctx.rotate(Math.PI / 2);

    // Draw stepped pixel crescent curve with white/cyan highlights
    ctx.fillStyle = '#38bdf8'; // Electric blue body
    ctx.beginPath();
    ctx.arc(0, 0, 14, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.arc(-4, 0, 11, Math.PI * 0.4, -Math.PI * 0.4, true);
    ctx.closePath();
    ctx.fill();

    // Inner bright white razor edge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 14, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.arc(-2, 0, 13, Math.PI * 0.3, -Math.PI * 0.3, true);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    return canvas;
  }
}
