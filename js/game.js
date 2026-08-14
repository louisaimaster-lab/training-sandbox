// Main Game Engine, Fullscreen Canvas Coordinator, and Defense Loop
import { SoundEngine } from './audio.js';
import { AssembledTurret } from './turret.js';
import { Monster } from './enemies.js';
import { NeighborhoodWorld, HouseDefense, WaveManager } from './systems.js';
import { GarageManager } from './garage.js';
import { ExplosionShockwave, SmoothFloatingText, SmoothParticle } from './effects.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.audio = new SoundEngine();
    this.world = new NeighborhoodWorld(1600, 900);
    this.house = new HouseDefense(720, 480, 160, 140);
    this.turret = new AssembledTurret(800, 650, 'scout');
    this.waveManager = new WaveManager();
    this.garage = new GarageManager(this);

    this.monsters = [];
    this.projectiles = [];
    this.acidSpits = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatTexts = [];

    this.mouse = { x: 800, y: 300, isDown: false };
    this.camera = { x: 0, y: 0, shake: 0 };
    this.isPaused = false;

    this.setupResize();
    this.setupEvents();
    this.garage.init();
    this.garage.applyToTurret();
  }

  setupResize() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.ctx.imageSmoothingEnabled = true;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  setupEvents() {
    window.addEventListener('mousemove', (e) => {
      const worldX = e.clientX + this.camera.x;
      const worldY = e.clientY + this.camera.y;
      this.mouse.x = worldX;
      this.mouse.y = worldY;
      this.turret.aimAt(worldX, worldY);
    });

    window.addEventListener('mousedown', (e) => {
      this.audio.init();
      if (e.target.closest('#garage-overlay') || e.target.closest('.ui-modal')) return;
      if (e.button === 0) {
        this.mouse.isDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = false;
      }
    });

    // Launch wave button
    const launchBtn = document.getElementById('btn-launch-wave');
    if (launchBtn) {
      launchBtn.onclick = () => {
        this.garage.applyToTurret();
        this.waveManager.startNextWave();
        document.getElementById('garage-overlay').classList.add('hidden');
        this.audio.playAlarm();
      };
    }

    // Garage tabs
    const tabAssembly = document.getElementById('tab-assembly-btn');
    const tabShop = document.getElementById('tab-shop-btn');
    const secAssembly = document.getElementById('sec-assembly');
    const secShop = document.getElementById('sec-shop');

    if (tabAssembly && tabShop) {
      tabAssembly.onclick = () => {
        tabAssembly.classList.add('active');
        tabShop.classList.remove('active');
        secAssembly.classList.remove('hidden');
        secShop.classList.add('hidden');
      };
      tabShop.onclick = () => {
        tabShop.classList.add('active');
        tabAssembly.classList.remove('active');
        secShop.classList.remove('hidden');
        secAssembly.classList.add('hidden');
      };
    }

    // Restart button
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.onclick = () => this.restartGame();
    }
  }

  spawnMonster(type) {
    // Spawn randomly from left street (x < 100) or right street (x > 1500)
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -30 - Math.random() * 50 : this.world.width + 30 + Math.random() * 50;
    const y = 600 + Math.random() * 200;
    this.monsters.push(new Monster(x, y, type));
  }

  update() {
    if (this.waveManager.state === 'garage') {
      const garageEl = document.getElementById('garage-overlay');
      if (garageEl && garageEl.classList.contains('hidden')) {
        garageEl.classList.remove('hidden');
        this.garage.render();
      }
      return;
    }

    if (this.waveManager.state === 'gameover') return;

    // Check defeat condition (House destroyed or Turret destroyed)
    if (this.house.hp <= 0 || this.turret.hp <= 0) {
      this.waveManager.state = 'gameover';
      const go = document.getElementById('gameover-overlay');
      if (go) go.classList.remove('hidden');
      return;
    }

    // Update Wave Spawns
    this.waveManager.update(
      this.monsters,
      (type) => this.spawnMonster(type),
      this.audio
    );

    // Update Turret
    this.turret.update(
      this.mouse.isDown,
      this.monsters,
      this.projectiles,
      this.particles,
      this.shockwaves,
      this.audio
    );

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this.particles);

      // Hit test against monsters
      let hit = false;
      for (let m = this.monsters.length - 1; m >= 0; m--) {
        const monster = this.monsters[m];
        const dist = Math.hypot(p.x - monster.x, p.y - monster.y);
        if (dist < monster.radius + p.radius) {
          hit = true;

          if (p.weapon.isExplosive) {
            // Area-of-effect explosion
            this.audio.playExplosion();
            this.camera.shake = 8;
            this.shockwaves.push(new ExplosionShockwave(p.x, p.y, p.weapon.splashRadius, p.weapon.bulletColor));

            // Splash damage all nearby monsters
            for (let k = this.monsters.length - 1; k >= 0; k--) {
              const other = this.monsters[k];
              const splashDist = Math.hypot(p.x - other.x, p.y - other.y);
              if (splashDist < p.weapon.splashRadius) {
                const splashDmg = Math.floor(p.damage * (1 - splashDist / p.weapon.splashRadius));
                other.takeDamage(splashDmg, p.x, this.audio, this.particles, this.floatTexts, p.isCrit);
                if (other.hp <= 0) {
                  this.waveManager.credits += other.bounty;
                  this.monsters.splice(k, 1);
                }
              }
            }
          } else {
            // Single target hit
            const isSlow = !!p.weapon.slowEffect;
            monster.takeDamage(p.damage, p.x, this.audio, this.particles, this.floatTexts, p.isCrit, isSlow);
            if (monster.hp <= 0) {
              this.waveManager.credits += monster.bounty;
              this.monsters.splice(m, 1);
            }
          }
          break;
        }
      }

      if (hit || p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Acid Spits
    for (let i = this.acidSpits.length - 1; i >= 0; i--) {
      const acid = this.acidSpits[i];
      acid.update(this.particles);

      // Check hit vs Turret
      const distTurret = Math.hypot(acid.x - this.turret.x, acid.y - this.turret.y);
      if (distTurret < 35) {
        this.turret.takeDamage(acid.damage, this.particles, this.shockwaves);
        this.audio.playHitMonster();
        this.acidSpits.splice(i, 1);
        continue;
      }

      // Check hit vs House
      if (acid.x >= this.house.x && acid.x <= this.house.x + this.house.width &&
          acid.y >= this.house.y && acid.y <= this.house.y + this.house.height) {
        this.house.takeDamage(acid.damage);
        this.audio.playHitMonster();
        this.acidSpits.splice(i, 1);
        continue;
      }

      if (acid.life <= 0) {
        this.acidSpits.splice(i, 1);
      }
    }

    // Update Monsters
    const houseCenter = { x: this.house.x + this.house.width / 2, y: this.house.y + this.house.height / 2 };
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      monster.update(houseCenter, this.turret, this.acidSpits, this.particles, this.audio);

      // Monster Melee Attack vs House
      if (monster.x >= this.house.x - 15 && monster.x <= this.house.x + this.house.width + 15 &&
          monster.y >= this.house.y && monster.y <= this.house.y + this.house.height + 20) {
        this.house.takeDamage(monster.damage * 0.05);
        if (Math.random() < 0.1) this.audio.playHitMonster();
      }

      // Monster Melee Attack vs Turret
      const distTurret = Math.hypot(monster.x - this.turret.x, monster.y - this.turret.y);
      if (distTurret < monster.radius + 25) {
        this.turret.takeDamage(monster.damage * 0.05, this.particles, this.shockwaves);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.update();
      if (s.life <= 0) this.shockwaves.splice(i, 1);
    }

    // Update Floating Texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.update();
      if (ft.life <= 0) this.floatTexts.splice(i, 1);
    }

    // Camera Center on Neighborhood defense zone
    const targetCamX = 800 - this.canvas.width / 2;
    const targetCamY = 550 - this.canvas.height / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    this.camera.y += (targetCamY - this.camera.y) * 0.1;

    if (this.camera.shake > 0) {
      this.camera.shake *= 0.88;
      if (this.camera.shake < 0.2) this.camera.shake = 0;
    }

    this.updateHUD();
  }

  updateHUD() {
    const waveEl = document.getElementById('hud-wave-title');
    if (waveEl) waveEl.textContent = `WAVE ${this.waveManager.wave}`;

    const monstersEl = document.getElementById('hud-monsters-left');
    if (monstersEl) {
      const remaining = (this.waveManager.totalToSpawn - this.waveManager.enemiesSpawned) + this.monsters.length;
      monstersEl.textContent = `Infected Remaining: ${remaining}`;
    }

    const creditsEl = document.getElementById('hud-credits-val');
    if (creditsEl) creditsEl.textContent = `$${this.waveManager.credits}`;

    // House Integrity Bar
    const houseBar = document.getElementById('hud-house-bar');
    const houseText = document.getElementById('hud-house-text');
    if (houseBar && houseText) {
      const pct = Math.max(0, (this.house.hp / this.house.maxHp) * 100);
      houseBar.style.width = `${pct}%`;
      houseText.textContent = `House HP: ${Math.round(this.house.hp)}/${this.house.maxHp}`;
    }

    // Turret HP Bar
    const turretBar = document.getElementById('hud-turret-bar');
    const turretText = document.getElementById('hud-turret-text');
    if (turretBar && turretText) {
      const pct = Math.max(0, (this.turret.hp / this.turret.maxHp) * 100);
      turretBar.style.width = `${pct}%`;
      turretText.textContent = `Turret HP: ${Math.round(this.turret.hp)}/${this.turret.maxHp}`;
    }

    // Survivors
    const survivorsEl = document.getElementById('hud-survivors');
    if (survivorsEl) {
      let icons = '';
      for (let i = 0; i < this.house.survivors; i++) icons += '👨‍👩‍👦 ';
      survivorsEl.textContent = icons || '💀 Overrun';
    }
  }

  draw() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Camera translation + shake
    const shakeX = (Math.random() - 0.5) * this.camera.shake;
    const shakeY = (Math.random() - 0.5) * this.camera.shake;
    this.ctx.translate(Math.floor(-this.camera.x + shakeX), Math.floor(-this.camera.y + shakeY));

    // 1. Draw Neighborhood Environment
    this.world.draw(this.ctx, this.house, this.turret);

    // 2. Draw House
    this.house.draw(this.ctx);

    // 3. Draw Shockwaves
    for (const s of this.shockwaves) {
      s.draw(this.ctx);
    }

    // 4. Draw Acid Spits
    for (const a of this.acidSpits) {
      a.draw(this.ctx);
    }

    // 5. Draw Monsters
    for (const m of this.monsters) {
      m.draw(this.ctx);
    }

    // 6. Draw Turret
    this.turret.draw(this.ctx);

    // 7. Draw Projectiles
    for (const p of this.projectiles) {
      p.draw(this.ctx);
    }

    // 8. Draw Smooth Particles
    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    // 9. Draw Floating Texts
    for (const ft of this.floatTexts) {
      ft.draw(this.ctx);
    }

    this.ctx.restore();
  }

  restartGame() {
    this.house = new HouseDefense(720, 480, 160, 140);
    this.waveManager = new WaveManager();
    this.monsters = [];
    this.projectiles = [];
    this.acidSpits = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatTexts = [];
    this.garage.init();
    this.garage.applyToTurret();
    const go = document.getElementById('gameover-overlay');
    if (go) go.classList.add('hidden');
    const garage = document.getElementById('garage-overlay');
    if (garage) garage.classList.remove('hidden');
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// Boot game when window is loaded
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    const game = new Game(canvas);
    window.game = game;
    game.loop();
  }
});
