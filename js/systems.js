// Systems: House Health, Survivors, Neighborhood World, CATS Garage & Shop
import { CHASSIS_TYPES, PARTS_CATALOG, PART_TYPES } from './parts.js';

export class HouseDefense {
  constructor(x, y, width = 160, height = 140) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.maxHp = 500;
    this.hp = 500;
    this.survivors = 3;
    this.hitTimer = 0;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitTimer = 10;
    if (this.hp <= 0 && this.survivors > 0) {
      this.survivors = 0;
    }
  }

  draw(ctx) {
    if (this.hitTimer > 0) this.hitTimer--;

    ctx.save();
    // House Base & Brick Walls
    ctx.fillStyle = this.hitTimer > 0 ? '#ef4444' : '#e2e8f0';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Roof (Smooth triangular pitched roof)
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(this.x - 15, this.y);
    ctx.lineTo(this.x + this.width / 2, this.y - 50);
    ctx.lineTo(this.x + this.width + 15, this.y);
    ctx.closePath();
    ctx.fill();

    // Front Door
    ctx.fillStyle = '#78350f';
    ctx.fillRect(this.x + this.width / 2 - 16, this.y + this.height - 45, 32, 45);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2 + 8, this.y + this.height - 22, 3, 0, Math.PI * 2);
    ctx.fill();

    // Windows with warm cozy indoor light & survivor silhouettes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(this.x + 20, this.y + 30, 36, 36);
    ctx.fillRect(this.x + this.width - 56, this.y + 30, 36, 36);

    // Window Frames
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x + 20, this.y + 30, 36, 36);
    ctx.strokeRect(this.x + this.width - 56, this.y + 30, 36, 36);

    // Survivor silhouettes inside
    if (this.survivors > 0) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.beginPath();
      ctx.arc(this.x + 38, this.y + 48, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + this.width - 38, this.y + 48, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Porch Light
    const lightGlow = ctx.createRadialGradient(
      this.x + this.width / 2, this.y + this.height - 55, 5,
      this.x + this.width / 2, this.y + this.height - 55, 70
    );
    lightGlow.addColorStop(0, 'rgba(253, 224, 71, 0.4)');
    lightGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = lightGlow;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height - 55, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class NeighborhoodWorld {
  constructor(width = 1600, height = 900) {
    this.width = width;
    this.height = height;
  }

  draw(ctx, house, turret) {
    // Night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(0.6, '#0f172a');
    sky.addColorStop(1, '#1e293b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Distant neighborhood houses silhouettes
    ctx.fillStyle = '#090d16';
    for (let x = 40; x < this.width; x += 220) {
      if (Math.abs(x - house.x) > 180) {
        ctx.fillRect(x, 480, 140, 100);
        ctx.beginPath();
        ctx.moveTo(x - 10, 480);
        ctx.lineTo(x + 70, 440);
        ctx.lineTo(x + 150, 480);
        ctx.fill();
      }
    }

    // Asphalt Street & Curbs
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 580, this.width, 320);

    // Front Yard Grass Lawn
    ctx.fillStyle = '#166534';
    ctx.fillRect(house.x - 60, 550, house.width + 120, 120);

    // Road dashed center line
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)';
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 25]);
    ctx.beginPath();
    ctx.moveTo(0, 720);
    ctx.lineTo(this.width, 720);
    ctx.stroke();
    ctx.setLineDash([]);

    // Street Light Posts & Glows
    this.drawStreetLight(ctx, 250, 530);
    this.drawStreetLight(ctx, 1350, 530);

    // Wooden Perimeter Defense Fence
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let fx = house.x - 70; fx <= house.x + house.width + 60; fx += 18) {
      ctx.fillRect(fx, 620, 8, 35);
      ctx.strokeRect(fx, 620, 8, 35);
    }
  }

  drawStreetLight(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y + 100);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 20, y - 20);
    ctx.stroke();

    // Light bulb
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x + 20, y - 18, 6, 0, Math.PI * 2);
    ctx.fill();

    // Street cone light
    const cone = ctx.createRadialGradient(x + 20, y - 18, 10, x + 20, y + 150, 180);
    cone.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    cone.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.arc(x + 20, y + 50, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class WaveManager {
  constructor() {
    this.wave = 1;
    this.state = 'wave'; // 'wave', 'garage', 'victory', 'gameover'
    this.enemiesSpawned = 0;
    this.totalToSpawn = 8;
    this.spawnTimer = 0;
    this.spawnRate = 90;
    this.credits = 150;
    this.partsInventory = [
      PARTS_CATALOG.find(p => p.id === 'minigun_mk1'),
      PARTS_CATALOG.find(p => p.id === 'nanite_repair')
    ];
  }

  startNextWave() {
    this.wave++;
    this.state = 'wave';
    this.enemiesSpawned = 0;
    this.totalToSpawn = 8 + this.wave * 4;
    this.spawnRate = Math.max(30, 90 - this.wave * 5);
    this.spawnTimer = 30;
  }

  update(monsters, spawnCallback, audio) {
    if (this.state !== 'wave') return;

    this.spawnTimer--;
    if (this.spawnTimer <= 0 && this.enemiesSpawned < this.totalToSpawn) {
      this.spawnTimer = this.spawnRate;
      this.enemiesSpawned++;

      // Enemy type roll
      let type = 'runner';
      const roll = Math.random();

      if (this.wave >= 5 && this.enemiesSpawned === this.totalToSpawn) {
        type = 'boss';
      } else if (this.wave >= 3 && roll < 0.25) {
        type = 'brute';
      } else if (this.wave >= 2 && roll < 0.45) {
        type = 'spitter';
      }

      spawnCallback(type);
    }

    // Wave completed
    if (this.enemiesSpawned >= this.totalToSpawn && monsters.length === 0) {
      this.state = 'garage';
      this.credits += 120 + this.wave * 40;
      if (audio) audio.playSnap();
    }
  }
}
