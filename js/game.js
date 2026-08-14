// Main Game Engine - Stardew Valley Farm Defense & CATS Modular Robot
import { SoundEngine } from './audio.js';
import { StardewEnvironment } from './stardew_art.js';
import { FarmRobot } from './cats_robot.js';
import { Monster } from './enemies.js';
import { WorkbenchSystem } from './workbench.js';
import { ExplosionShockwave, SmoothFloatingText, SmoothParticle } from './effects.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.audio = new SoundEngine();
    this.world = new StardewEnvironment(1600, 1000);
    this.robot = new FarmRobot(800, 620, 'classic');
    this.workbench = new WorkbenchSystem(this);

    this.state = 'intro'; // 'draft', 'workbench', 'battle', 'gameover'
    this.currentWave = 1;
    this.monsters = [];
    this.projectiles = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatTexts = [];

    // Wave spawning state
    this.enemiesSpawned = 0;
    this.totalToSpawn = 8;
    this.spawnTimer = 0;
    this.spawnInterval = 90;

    this.keys = {};
    this.mouse = { x: 800, y: 500, isDown: false };
    this.camera = { x: 0, y: 0, shake: 0 };
    this.frameCount = 0;

    this.setupResize();
    this.setupInputs();

    // Start with Wave 1 initial draft choice
    this.workbench.init();
    this.workbench.openDraftModal(1);
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

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.audio.init();
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      const worldX = e.clientX + this.camera.x;
      const worldY = e.clientY + this.camera.y;
      this.mouse.x = worldX;
      this.mouse.y = worldY;
      if (this.state === 'battle') {
        this.robot.aimAt(worldX, worldY);
      }
    });

    window.addEventListener('mousedown', (e) => {
      this.audio.init();
      if (e.target.closest('#workbench-modal') || e.target.closest('#draft-modal') || e.target.closest('.ui-modal')) return;
      if (e.button === 0) {
        this.mouse.isDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = false;
      }
    });

    // Restart button
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.onclick = () => this.restartGame();
    }
  }

  startCombatWave(waveNum) {
    this.currentWave = waveNum;
    this.state = 'battle';
    this.monsters = [];
    this.projectiles = [];
    this.enemiesSpawned = 0;
    this.totalToSpawn = 8 + waveNum * 4;
    this.spawnInterval = Math.max(30, 85 - waveNum * 5);
    this.spawnTimer = 40;

    this.audio.playAlarm();
  }

  spawnMonster() {
    // Spawn from farm borders (left, right, bottom, top forest)
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = -30; y = Math.random() * this.world.height; }
    else if (side === 1) { x = this.world.width + 30; y = Math.random() * this.world.height; }
    else if (side === 2) { x = Math.random() * this.world.width; y = -30; }
    else { x = Math.random() * this.world.width; y = this.world.height + 30; }

    // Roll monster type based on wave
    let type = 'slime';
    const roll = Math.random();

    if (this.currentWave >= 5 && this.enemiesSpawned === this.totalToSpawn - 1) {
      type = 'king_slime';
    } else if (this.currentWave >= 4 && roll < 0.2) {
      type = 'golem';
    } else if (this.currentWave >= 3 && roll < 0.4) {
      type = 'bug';
    } else if (this.currentWave >= 2 && roll < 0.5) {
      type = 'bat';
    }

    this.monsters.push(new Monster(x, y, type));
  }

  update() {
    this.frameCount++;
    this.world.update();

    // In drafting or workbench mode, GAME IS SAFELY PAUSED!
    if (this.state !== 'battle') return;

    // Check Defeat Conditions (Core destroyed or Robot destroyed)
    if (this.world.core.hp <= 0 || this.robot.hp <= 0) {
      this.state = 'gameover';
      const go = document.getElementById('gameover-modal');
      if (go) go.classList.remove('hidden');
      return;
    }

    // 1. Spawning Monsters in Wave
    this.spawnTimer--;
    if (this.spawnTimer <= 0 && this.enemiesSpawned < this.totalToSpawn) {
      this.spawnTimer = this.spawnInterval;
      this.enemiesSpawned++;
      this.spawnMonster();
    }

    // 2. Check Wave Clear
    if (this.enemiesSpawned >= this.totalToSpawn && this.monsters.length === 0) {
      this.state = 'draft';
      this.workbench.openDraftModal(this.currentWave + 1);
      return;
    }

    // 3. Update Robot
    this.robot.update(
      this.keys,
      this.mouse.isDown,
      this.monsters,
      this.projectiles,
      this.particles,
      this.shockwaves,
      this.audio,
      this.world.core
    );

    // 4. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this.particles);

      let hit = false;
      for (let m = this.monsters.length - 1; m >= 0; m--) {
        const monster = this.monsters[m];
        const dist = Math.hypot(p.x - monster.x, p.y - monster.y);
        if (dist < monster.radius + p.radius) {
          hit = true;

          if (p.weapon.isExplosive) {
            this.audio.playExplosion();
            this.camera.shake = 8;
            this.shockwaves.push(new ExplosionShockwave(p.x, p.y, p.weapon.splashRadius, p.weapon.bulletColor));

            // Area damage
            for (let k = this.monsters.length - 1; k >= 0; k--) {
              const other = this.monsters[k];
              const splashDist = Math.hypot(p.x - other.x, p.y - other.y);
              if (splashDist < p.weapon.splashRadius) {
                const splashDmg = Math.floor(p.damage * (1 - splashDist / p.weapon.splashRadius));
                other.takeDamage(splashDmg, p.x, this.audio, this.particles, this.floatTexts, p.isCrit);
                if (other.hp <= 0) this.monsters.splice(k, 1);
              }
            }
          } else {
            monster.takeDamage(p.damage, p.x, this.audio, this.particles, this.floatTexts, p.isCrit);
            if (monster.hp <= 0) this.monsters.splice(m, 1);
          }
          break;
        }
      }

      if (hit || p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // 5. Update Monsters
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      m.update(this.world.core, this.robot, this.particles, this.audio);
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 7. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.update();
      if (s.life <= 0) this.shockwaves.splice(i, 1);
    }

    // 8. Update Floating Texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.update();
      if (ft.life <= 0) this.floatTexts.splice(i, 1);
    }

    // Camera Center Follow Robot smoothly
    const targetCamX = this.robot.x - this.canvas.width / 2;
    const targetCamY = this.robot.y - this.canvas.height / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.08;
    this.camera.y += (targetCamY - this.camera.y) * 0.08;

    const maxCamX = this.world.width - this.canvas.width;
    const maxCamY = this.world.height - this.canvas.height;
    this.camera.x = Math.max(0, Math.min(Math.max(0, maxCamX), this.camera.x));
    this.camera.y = Math.max(0, Math.min(Math.max(0, maxCamY), this.camera.y));

    if (this.camera.shake > 0) {
      this.camera.shake *= 0.88;
      if (this.camera.shake < 0.2) this.camera.shake = 0;
    }

    this.updateHUD();
  }

  updateHUD() {
    const waveEl = document.getElementById('hud-wave-title');
    if (waveEl) waveEl.textContent = `WAVE ${this.currentWave}`;

    const monstersEl = document.getElementById('hud-monsters-left');
    if (monstersEl) {
      const rem = (this.totalToSpawn - this.enemiesSpawned) + this.monsters.length;
      monstersEl.textContent = `Forest Monsters Left: ${rem}`;
    }

    // Core HP Bar
    const coreBar = document.getElementById('hud-core-bar');
    const coreText = document.getElementById('hud-core-text');
    if (coreBar && coreText) {
      const pct = Math.max(0, (this.world.core.hp / this.world.core.maxHp) * 100);
      coreBar.style.width = `${pct}%`;
      coreText.textContent = `${Math.round(this.world.core.hp)} / ${this.world.core.maxHp}`;
    }

    // Robot HP Bar
    const robotBar = document.getElementById('hud-robot-bar');
    const robotText = document.getElementById('hud-robot-text');
    if (robotBar && robotText) {
      const pct = Math.max(0, (this.robot.hp / this.robot.maxHp) * 100);
      robotBar.style.width = `${pct}%`;
      robotText.textContent = `${Math.round(this.robot.hp)} / ${this.robot.maxHp}`;
    }
  }

  draw() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Camera translation + shake
    const shakeX = (Math.random() - 0.5) * this.camera.shake;
    const shakeY = (Math.random() - 0.5) * this.camera.shake;
    this.ctx.translate(Math.floor(-this.camera.x + shakeX), Math.floor(-this.camera.y + shakeY));

    // 1. Draw Stardew Valley Farm Environment & Sun Core
    this.world.draw(this.ctx, this.frameCount);

    // 2. Draw Shockwaves
    for (const s of this.shockwaves) s.draw(this.ctx);

    // 3. Draw Monsters
    for (const m of this.monsters) m.draw(this.ctx);

    // 4. Draw Robot
    this.robot.draw(this.ctx);

    // 5. Draw Projectiles
    for (const p of this.projectiles) p.draw(this.ctx);

    // 6. Draw Smooth Particles
    for (const p of this.particles) p.draw(this.ctx);

    // 7. Draw Floating Texts
    for (const ft of this.floatTexts) ft.draw(this.ctx);

    this.ctx.restore();
  }

  restartGame() {
    this.world = new StardewEnvironment(1600, 1000);
    this.robot = new FarmRobot(800, 620, 'classic');
    this.monsters = [];
    this.projectiles = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatTexts = [];
    this.currentWave = 1;

    this.workbench = new WorkbenchSystem(this);
    this.workbench.init();

    const go = document.getElementById('gameover-modal');
    if (go) go.classList.add('hidden');

    this.workbench.openDraftModal(1);
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
