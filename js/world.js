// Arena world structure, tile grid, torches, and workstation layout

export const TILE_AIR = 0;
export const TILE_STONE = 1;
export const TILE_GRASS = 2;
export const TILE_PLATFORM = 3;

export class World {
  constructor(width = 54, height = 26, tileSize = 16) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.tiles = new Uint8Array(width * height);
    this.torches = [];
    this.workstationPos = { x: 26 * tileSize, y: 19 * tileSize };
    this.merchantPos = { x: 20 * tileSize, y: 19 * tileSize };
    this.buildArena();
  }

  buildArena() {
    this.tiles.fill(TILE_AIR);

    // Stone borders (Left & Right arena walls)
    for (let y = 0; y < this.height; y++) {
      this.setTile(0, y, TILE_STONE);
      this.setTile(1, y, TILE_STONE);
      this.setTile(this.width - 2, y, TILE_STONE);
      this.setTile(this.width - 1, y, TILE_STONE);
    }

    // Top ceiling
    for (let x = 0; x < this.width; x++) {
      this.setTile(x, 0, TILE_STONE);
      this.setTile(x, 1, TILE_STONE);
    }

    // Ground floor (Grass on top of solid Stone)
    const floorY = 21;
    for (let x = 0; x < this.width; x++) {
      this.setTile(x, floorY, TILE_GRASS);
      for (let y = floorY + 1; y < this.height; y++) {
        this.setTile(x, y, TILE_STONE);
      }
    }

    // Platforms (Terraria arena tiers)
    // Tier 1 (Low Platforms)
    for (let x = 8; x <= 22; x++) this.setTile(x, 17, TILE_PLATFORM);
    for (let x = 31; x <= 45; x++) this.setTile(x, 17, TILE_PLATFORM);

    // Tier 2 (Mid Center Platform)
    for (let x = 16; x <= 37; x++) this.setTile(x, 13, TILE_PLATFORM);

    // Tier 3 (High Platforms)
    for (let x = 6; x <= 18; x++) this.setTile(x, 9, TILE_PLATFORM);
    for (let x = 35; x <= 47; x++) this.setTile(x, 9, TILE_PLATFORM);

    // Top Bridge
    for (let x = 20; x <= 33; x++) this.setTile(x, 5, TILE_PLATFORM);

    // Torches placement
    this.torches = [
      { x: 4 * this.tileSize, y: 19 * this.tileSize },
      { x: 49 * this.tileSize, y: 19 * this.tileSize },
      { x: 15 * this.tileSize, y: 15 * this.tileSize },
      { x: 38 * this.tileSize, y: 15 * this.tileSize },
      { x: 26 * this.tileSize, y: 11 * this.tileSize },
      { x: 12 * this.tileSize, y: 7 * this.tileSize },
      { x: 41 * this.tileSize, y: 7 * this.tileSize },
      { x: 27 * this.tileSize, y: 3 * this.tileSize },
    ];
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILE_STONE;
    return this.tiles[y * this.width + x];
  }

  setTile(x, y, type) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y * this.width + x] = type;
    }
  }

  isSolid(x, y) {
    const t = this.getTile(x, y);
    return t === TILE_STONE || t === TILE_GRASS;
  }

  isPlatform(x, y) {
    return this.getTile(x, y) === TILE_PLATFORM;
  }

  draw(ctx, spriteStore, frameCount = 0) {
    const ts = this.tileSize;

    // Draw dark background dungeon brick wall
    ctx.fillStyle = '#141824';
    ctx.fillRect(0, 0, this.width * ts, this.height * ts);

    // Brick pattern on background wall
    ctx.strokeStyle = '#1b2233';
    ctx.lineWidth = 1;
    for (let y = 0; y < this.height * ts; y += ts) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width * ts, y);
      ctx.stroke();
    }
    for (let y = 0; y < this.height * ts; y += ts) {
      const offset = (Math.floor(y / ts) % 2) * (ts / 2);
      for (let x = offset; x < this.width * ts; x += ts) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + ts);
        ctx.stroke();
      }
    }

    // Render tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.getTile(x, y);
        const px = x * ts;
        const py = y * ts;

        if (t === TILE_GRASS) {
          const spr = spriteStore.get('tile_grass');
          if (spr) ctx.drawImage(spr, px, py, ts, ts);
        } else if (t === TILE_STONE) {
          const spr = spriteStore.get('tile_stone');
          if (spr) ctx.drawImage(spr, px, py, ts, ts);
        } else if (t === TILE_PLATFORM) {
          const spr = spriteStore.get('tile_platform');
          if (spr) ctx.drawImage(spr, px, py, ts, ts / 2);
        }
      }
    }

    // Draw animated Torches
    const torchFrame = Math.floor(frameCount / 8) % 3;
    const torchSpr = spriteStore.get(`torch_${torchFrame}`);
    for (const torch of this.torches) {
      if (torchSpr) {
        ctx.drawImage(torchSpr, torch.x, torch.y);
      }
      // Torch radial glow
      const glow = ctx.createRadialGradient(
        torch.x + 6, torch.y + 4, 2,
        torch.x + 6, torch.y + 4, 45
      );
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(torch.x + 6, torch.y + 4, 45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
