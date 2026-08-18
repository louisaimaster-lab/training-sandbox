// Heightmap Elevation Engine & Collision Logic
// Manages 3 distinct elevation levels (Z=0: Lowlands/River, Z=1: Plateau/Farmland, Z=2: Highlands/Cliffs)

export const TIER_LOWLAND = 0;
export const TIER_PLATEAU = 1;
export const TIER_HIGHLAND = 2;

export const TILE_AIR = 0;
export const TILE_GRASS = 1;
export const TILE_DIRT = 2;
export const TILE_WATER = 3;
export const TILE_STONE_PATH = 4;
export const TILE_CLIFF_WALL = 5;
export const TILE_CLIFF_TOP = 6;
export const TILE_RAMP_UP = 7;       // Ramp leading from Z to Z+1
export const TILE_RAMP_DOWN = 8;     // Ramp leading from Z to Z-1
export const TILE_LEDGE_JUMP = 9;    // 1-way jumpable ledge (Pokémon style: can jump down south)

export class HeightmapWorld {
  constructor(width = 64, height = 48, tileSize = 16) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;

    // Elevation tier array (0, 1, or 2 for each tile)
    this.elevation = new Uint8Array(width * height);
    // Base tile type (Grass, Dirt, Water, Path, Cliff, Ramp)
    this.tiles = new Uint8Array(width * height);
    // Solid obstacles (Trees, Rocks, Buildings, Fences)
    this.solidObjects = new Map(); // key "x,y" => object definition

    this.generateTerrain();
  }

  getIndex(x, y) {
    return y * this.width + x;
  }

  getElevation(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.elevation[this.getIndex(x, y)];
  }

  setElevation(x, y, level) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.elevation[this.getIndex(x, y)] = level;
    }
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILE_CLIFF_WALL;
    return this.tiles[this.getIndex(x, y)];
  }

  setTile(x, y, type) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[this.getIndex(x, y)] = type;
    }
  }

  generateTerrain() {
    this.tiles.fill(TILE_GRASS);
    this.elevation.fill(TIER_PLATEAU); // Base ground is Level 1

    // 1. Carve Lowland River & Valley (Z = 0) on the West/South
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < 14; x++) {
        this.setElevation(x, y, TIER_LOWLAND);
        this.setTile(x, y, TILE_DIRT);
      }
      // River channel
      for (let x = 4; x < 10; x++) {
        this.setTile(x, y, TILE_WATER);
      }
    }

    // 2. Cliff Transition between Lowland (0) and Plateau (1) at X=14
    for (let y = 0; y < this.height; y++) {
      this.setTile(14, y, TILE_CLIFF_WALL);
    }

    // Lowland Ramps connecting Level 0 to Level 1 at Y=18 and Y=34
    const rampYPositions = [18, 19, 34, 35];
    rampYPositions.forEach(ry => {
      this.setTile(14, ry, TILE_RAMP_UP);
      this.setElevation(14, ry, TIER_LOWLAND); // Transition slope
    });

    // 3. Carve Mountain Highlands (Z = 2) on the Northeast (X >= 38, Y <= 24)
    for (let y = 4; y <= 24; y++) {
      for (let x = 38; x < this.width - 4; x++) {
        this.setElevation(x, y, TIER_HIGHLAND);
      }
    }

    // Highland Cliff Walls
    for (let x = 38; x < this.width - 4; x++) {
      this.setTile(x, 25, TILE_CLIFF_WALL);
    }
    for (let y = 4; y <= 24; y++) {
      this.setTile(37, y, TILE_CLIFF_WALL);
    }

    // Highland Ramps connecting Plateau (1) to Highlands (2) at X=44, Y=25
    [44, 45].forEach(rx => {
      this.setTile(rx, 25, TILE_RAMP_UP);
    });

    // 4. One-Way Jumpable Ledges (Pokémon-style: jump south off ledge)
    for (let x = 20; x <= 32; x++) {
      if (x !== 25 && x !== 26) {
        this.setTile(x, 28, TILE_LEDGE_JUMP);
      }
    }

    // 5. Cobblestone Pathways on Plateau
    for (let x = 14; x < 48; x++) {
      this.setTile(x, 18, TILE_STONE_PATH);
      this.setTile(x, 34, TILE_STONE_PATH);
    }
    for (let y = 10; y < 40; y++) {
      this.setTile(26, y, TILE_STONE_PATH);
    }
  }

  // Check collision for entity bounding box considering height levels & ramps
  checkMove(entity, dx, dy) {
    const nextX = entity.x + dx;
    const nextY = entity.y + dy;
    const ts = this.tileSize;

    // Entity foot position
    const footX = nextX + entity.width / 2;
    const footY = nextY + entity.height - 2;

    const currentTileX = Math.floor((entity.x + entity.width / 2) / ts);
    const currentTileY = Math.floor((entity.y + entity.height - 2) / ts);

    const targetTileX = Math.floor(footX / ts);
    const targetTileY = Math.floor(footY / ts);

    // Boundary check
    if (targetTileX < 0 || targetTileX >= this.width || targetTileY < 0 || targetTileY >= this.height) {
      return { allowed: false };
    }

    const currentElev = this.getElevation(currentTileX, currentTileY);
    const targetElev = this.getElevation(targetTileX, targetTileY);
    const targetTile = this.getTile(targetTileX, targetTileY);

    // Water is non-walkable without swimming
    if (targetTile === TILE_WATER) {
      return { allowed: false };
    }

    // Cliff Wall is impassable
    if (targetTile === TILE_CLIFF_WALL && targetTile !== TILE_RAMP_UP) {
      return { allowed: false };
    }

    // 1-Way Jumpable Ledge (Pokémon Style)
    if (targetTile === TILE_LEDGE_JUMP) {
      if (dy > 0 && entity.zLevel === currentElev) {
        // Jumping down south off ledge is allowed!
        return { allowed: true, isLedgeJump: true, newZ: targetElev };
      } else {
        // Walking up onto ledge from below is blocked
        return { allowed: false };
      }
    }

    // Ramp Elevation Transition (Smoothly steps between Z levels)
    if (targetTile === TILE_RAMP_UP) {
      return { allowed: true, onRamp: true, newZ: Math.max(currentElev, targetElev) };
    }

    // Elevation Level Mismatch Check
    if (targetElev !== entity.zLevel) {
      // If tile is not a ramp or jumping ledge, you cannot walk straight into different height levels
      return { allowed: false };
    }

    // Solid Object Check (Trees, Buildings, Large Boulders)
    const objKey = `${targetTileX},${targetTileY}`;
    if (this.solidObjects.has(objKey)) {
      return { allowed: false };
    }

    return { allowed: true, newZ: targetElev };
  }
}
