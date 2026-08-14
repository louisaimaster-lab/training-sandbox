// Main Game Coordinator, Rendering Pipeline, and UI Integration
import { SpriteStore } from './sprites.js';
import { SoundEngine } from './audio.js';
import { Physics } from './physics.js';
import { World } from './world.js';
import { Player, Enemy, Drop, Particle, FloatingText } from './entities.js';
import { WaveManager, SHOP_ITEMS, CRAFTING_RECIPES } from './systems.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Viewport Virtual Resolution (Retro Terraria Aspect Ratio)
    this.viewWidth = 540;
    this.viewHeight = 310;

    this.spriteStore = new SpriteStore();
    this.audio = new SoundEngine();
    this.world = new World(54, 26, 16);
    this.player = new Player(26 * 16, 18 * 16);
    this.waveManager = new WaveManager();

    this.enemies = [];
    this.drops = [];
    this.particles = [];
    this.floatTexts = [];

    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false };
    this.camera = { x: 0, y: 0, shake: 0 };
    this.frameCount = 0;

    // Modals
    this.activeModal = null; // 'shop', 'crafting', null

    this.setupInputs();
    this.setupUI();
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.audio.init();
      if (!this.keys[e.code]) {
        this.keys[`just_${e.code}`] = true;
      }
      this.keys[e.code] = true;

      if (e.code === 'KeyE') {
        this.toggleModal();
      }
      if (e.code === 'Escape') {
        this.closeModals();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[`just_${e.code}`] = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.audio.init();
      if (e.button === 0) {
        this.mouse.isDown = true;
        this.player.startAttack(this.audio);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = false;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.viewWidth / rect.width;
      const scaleY = this.viewHeight / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX + this.camera.x;
      this.mouse.y = (e.clientY - rect.top) * scaleY + this.camera.y;
    });
  }

  setupUI() {
    // Buttons in UI
    const shopBtn = document.getElementById('btn-shop');
    const craftBtn = document.getElementById('btn-craft');
    const skipBtn = document.getElementById('btn-next-wave');
    const healBtn = document.getElementById('btn-heal');

    if (shopBtn) shopBtn.onclick = () => this.openShop();
    if (craftBtn) craftBtn.onclick = () => this.openCrafting();
    if (skipBtn) skipBtn.onclick = () => this.waveManager.skipIntermission();
    if (healBtn) healBtn.onclick = () => this.player.drinkPotion(this.audio, this.particles, this.floatTexts);

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.onclick = () => this.closeModals();
    });
  }

  toggleModal() {
    if (this.activeModal) {
      this.closeModals();
    } else {
      if (this.waveManager.isWorkstationRound) {
        this.openCrafting();
      } else {
        this.openShop();
      }
    }
  }

  openShop() {
    this.activeModal = 'shop';
    const modal = document.getElementById('shop-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.renderShopUI();
    }
    const craftModal = document.getElementById('craft-modal');
    if (craftModal) craftModal.classList.add('hidden');
  }

  openCrafting() {
    this.activeModal = 'crafting';
    const modal = document.getElementById('craft-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.renderCraftingUI();
    }
    const shopModal = document.getElementById('shop-modal');
    if (shopModal) shopModal.classList.add('hidden');
  }

  closeModals() {
    this.activeModal = null;
    const s = document.getElementById('shop-modal');
    const c = document.getElementById('craft-modal');
    if (s) s.classList.add('hidden');
    if (c) c.classList.add('hidden');
  }

  renderShopUI() {
    const list = document.getElementById('shop-items-list');
    if (!list) return;
    list.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
      const canAfford = this.player.coins >= item.cost;
      const card = document.createElement('div');
      card.className = `pixel-card ${canAfford ? '' : 'disabled'}`;
      card.innerHTML = `
        <div class="card-header">
          <strong>${item.name}</strong>
          <span class="coin-price">💰 ${item.cost}</span>
        </div>
        <div class="card-desc">${item.desc}</div>
        <button class="pixel-btn ${canAfford ? 'btn-gold' : 'btn-disabled'}" ${canAfford ? '' : 'disabled'}>
          Buy
        </button>
      `;

      const btn = card.querySelector('button');
      if (btn && canAfford) {
        btn.onclick = () => {
          if (this.player.coins >= item.cost) {
            this.player.coins -= item.cost;
            if (item.type === 'potion') {
              this.player.materials.potions += item.amount;
            } else if (item.type === 'mat') {
              this.player.materials[item.matKey] += item.amount;
            }
            this.audio.playCoin();
            this.renderShopUI();
            this.updateHUD();
          }
        };
      }
      list.appendChild(card);
    });
  }

  renderCraftingUI() {
    const list = document.getElementById('craft-items-list');
    if (!list) return;
    list.innerHTML = '';

    const isAvailable = this.waveManager.isWorkstationRound || this.waveManager.state === 'intermission';
    const banner = document.getElementById('craft-status-banner');
    if (banner) {
      banner.textContent = this.waveManager.isWorkstationRound
        ? '⚡ Workstation is ACTIVE this round!'
        : '⚠️ Workstation appears every 3 rounds (Wave 3, 6, 9...)';
      banner.style.color = this.waveManager.isWorkstationRound ? '#4ade80' : '#f97316';
    }

    CRAFTING_RECIPES.forEach(recipe => {
      const alreadyCrafted = this.waveManager.craftedItems.has(recipe.id);
      let canCraft = isAvailable && !alreadyCrafted;
      let costText = [];

      for (const [mat, needed] of Object.entries(recipe.cost)) {
        const has = this.player.materials[mat] || 0;
        const color = has >= needed ? '#4ade80' : '#f87171';
        costText.push(`<span style="color:${color}">${mat}: ${has}/${needed}</span>`);
        if (has < needed) canCraft = false;
      }

      const card = document.createElement('div');
      card.className = `pixel-card ${canCraft ? '' : 'disabled'}`;
      card.innerHTML = `
        <div class="card-header">
          <strong>${recipe.name}</strong>
          <span class="recipe-status">${alreadyCrafted ? '✓ Crafted' : (recipe.type === 'weapon' ? '🗡️ Weapon' : '🛡️ Gear')}</span>
        </div>
        <div class="card-desc">${recipe.desc}</div>
        <div class="card-costs">Cost: ${costText.join(', ')}</div>
        <button class="pixel-btn ${canCraft ? 'btn-craft-action' : 'btn-disabled'}" ${canCraft ? '' : 'disabled'}>
          ${alreadyCrafted ? 'Owned' : 'Forge / Craft'}
        </button>
      `;

      const btn = card.querySelector('button');
      if (btn && canCraft) {
        btn.onclick = () => {
          // Deduct materials
          for (const [mat, needed] of Object.entries(recipe.cost)) {
            this.player.materials[mat] -= needed;
          }

          if (recipe.type === 'weapon') {
            this.player.weapon = { ...recipe.data };
          } else if (recipe.apply) {
            recipe.apply(this.player);
          }

          this.waveManager.craftedItems.add(recipe.id);
          this.audio.playCraft();
          this.renderCraftingUI();
          this.updateHUD();

          // Anvil spark particles
          for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(
              this.world.workstationPos.x + 12,
              this.world.workstationPos.y + 8,
              (Math.random() - 0.5) * 4,
              -Math.random() * 3,
              '#fbbf24',
              3,
              30
            ));
          }
        };
      }
      list.appendChild(card);
    });
  }

  spawnEnemy(type, side) {
    const x = side === 'left' ? 3 * 16 : (this.world.width - 5) * 16;
    const y = 19 * 16;
    const enemy = new Enemy(x, y, type);
    this.enemies.push(enemy);
  }

  spawnDropsFor(enemy) {
    // Spawn coins
    const count = Math.max(1, Math.floor(enemy.coinValue / 10));
    for (let i = 0; i < count; i++) {
      let coinType = 'coin_copper';
      if (enemy.coinValue >= 200) coinType = 'coin_gold';
      else if (enemy.coinValue >= 40) coinType = 'coin_silver';
      this.drops.push(new Drop(enemy.x + 8, enemy.y + 8, coinType, enemy.coinValue / count));
    }

    // Heart drop chance if low HP
    if (this.player.hp < this.player.maxHp && Math.random() < 0.25) {
      this.drops.push(new Drop(enemy.x + 8, enemy.y + 8, 'heart', 20));
    }

    // Material drops based on enemy
    if (enemy.type === 'armored_zombie' && Math.random() < 0.6) {
      this.player.materials.ironOre += 1;
      this.floatTexts.push(new FloatingText(enemy.x, enemy.y - 12, '+1 Iron Ore', '#cbd5e1'));
    } else if (enemy.type === 'crawler' && Math.random() < 0.5) {
      this.player.materials.fireCore += 1;
      this.floatTexts.push(new FloatingText(enemy.x, enemy.y - 12, '+1 Fire Core', '#f97316'));
    } else if (enemy.type === 'brute') {
      this.player.materials.darkShard += 2;
      this.player.materials.goldOre += 3;
      this.floatTexts.push(new FloatingText(enemy.x, enemy.y - 12, '+2 Dark Shards, +3 Gold Ore', '#c084fc'));
    }
  }

  update() {
    this.frameCount++;

    // Continuous attack if mouse is held down
    if (this.mouse.isDown && !this.player.isAttacking) {
      this.player.startAttack(this.audio);
    }

    // Update Player
    this.player.update(this.keys, this.mouse, this.world, this.audio, this.particles, this.floatTexts);

    // Check player death
    if (this.player.hp <= 0) {
      this.waveManager.state = 'gameover';
      const goScreen = document.getElementById('gameover-screen');
      if (goScreen) goScreen.classList.remove('hidden');
    }

    // Update Waves
    this.waveManager.update(
      this.enemies,
      (type, side) => this.spawnEnemy(type, side),
      this.audio,
      this.floatTexts
    );

    // Update Enemies & Combat Hitboxes
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(this.player, this.world, this.audio);

      // Player Attack vs Enemy (Sword Slash Hitbox Arc)
      if (this.player.isAttacking && this.player.attackTimer === Math.floor(this.player.weapon.swingSpeed * 0.7)) {
        const reach = this.player.weapon.range;
        const attackBox = {
          x: this.player.facing === 1 ? this.player.x + 10 : this.player.x - reach + 10,
          y: this.player.y - 8,
          width: reach + 10,
          height: this.player.height + 16,
        };

        if (Physics.aabb(attackBox, enemy)) {
          const isCrit = Math.random() < this.player.weapon.critChance;
          const dmg = isCrit ? Math.floor(this.player.weapon.damage * 1.8) : this.player.weapon.damage;
          enemy.takeDamage(
            dmg,
            this.player.x + 12,
            this.player.weapon.knockback,
            this.audio,
            this.particles,
            this.floatTexts,
            isCrit
          );

          // Screen shake on hit
          this.camera.shake = isCrit ? 6 : 3;

          // Enemy defeated
          if (enemy.hp <= 0) {
            this.spawnDropsFor(enemy);
            this.enemies.splice(i, 1);
            continue;
          }
        }
      }

      // Enemy Attack vs Player (Contact Damage)
      if (Physics.aabb(enemy, this.player)) {
        const dmgTaken = this.player.takeDamage(enemy.damage, enemy.x + enemy.width / 2, this.audio, this.particles, this.floatTexts);
        if (dmgTaken > 0) {
          this.camera.shake = 5;
        }
      }
    }

    // Update Drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.update(this.world, this.player);

      // Pickup
      if (Physics.aabb(drop, this.player)) {
        if (drop.type.startsWith('coin_')) {
          this.player.coins += drop.value;
          this.audio.playCoin();
          this.floatTexts.push(new FloatingText(drop.x, drop.y, `+${drop.value} 💰`, '#fbbf24'));
        } else if (drop.type === 'heart') {
          this.player.heal(20);
          this.audio.playHeal();
          this.floatTexts.push(new FloatingText(drop.x, drop.y, '+20 HP', '#4ade80'));
        }
        this.drops.splice(i, 1);
        continue;
      }

      if (drop.life <= 0) {
        this.drops.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update Floating Texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.update();
      if (ft.life <= 0) this.floatTexts.splice(i, 1);
    }

    // Clear "just pressed" key flags
    for (const key in this.keys) {
      if (key.startsWith('just_')) {
        this.keys[key] = false;
      }
    }

    // Camera target follow with bounds clamp
    const targetCamX = this.player.x + 12 - this.viewWidth / 2;
    const targetCamY = this.player.y + 14 - this.viewHeight / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    this.camera.y += (targetCamY - this.camera.y) * 0.1;

    const maxCamX = this.world.width * this.world.tileSize - this.viewWidth;
    const maxCamY = this.world.height * this.world.tileSize - this.viewHeight;
    this.camera.x = Math.max(0, Math.min(maxCamX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxCamY, this.camera.y));

    if (this.camera.shake > 0) {
      this.camera.shake *= 0.85;
      if (this.camera.shake < 0.2) this.camera.shake = 0;
    }

    this.updateHUD();
  }

  updateHUD() {
    // Update Hearts UI
    const heartsContainer = document.getElementById('hearts-container');
    if (heartsContainer) {
      const heartCount = Math.ceil(this.player.maxHp / 20);
      const fullHearts = Math.floor(this.player.hp / 20);
      let heartsHtml = '';
      for (let i = 0; i < heartCount; i++) {
        const isFull = i < fullHearts;
        heartsHtml += `<span class="pixel-heart ${isFull ? 'heart-full' : 'heart-empty'}">❤️</span>`;
      }
      heartsContainer.innerHTML = `${heartsHtml} <span class="hp-text">${Math.max(0, this.player.hp)}/${this.player.maxHp}</span>`;
    }

    // Coins & Wave
    const coinEl = document.getElementById('hud-coins');
    if (coinEl) coinEl.textContent = `${this.player.coins}`;

    const waveEl = document.getElementById('hud-wave');
    if (waveEl) waveEl.textContent = `Wave ${this.waveManager.currentWave}`;

    const waveStatusEl = document.getElementById('hud-wave-status');
    if (waveStatusEl) {
      if (this.waveManager.state === 'wave') {
        const remaining = this.waveManager.enemiesRemainingToSpawn + this.enemies.length;
        waveStatusEl.textContent = `Zombies: ${remaining}`;
        waveStatusEl.style.color = '#ef4444';
      } else if (this.waveManager.state === 'intermission') {
        const roundText = this.waveManager.isWorkstationRound ? ' (Crafting Round!)' : '';
        waveStatusEl.textContent = `Intermission${roundText} - Visit Shop/Anvil [E]`;
        waveStatusEl.style.color = '#4ade80';
      }
    }

    // Materials HUD
    const matEl = document.getElementById('hud-materials');
    if (matEl) {
      matEl.innerHTML = `
        <span>🪵 ${this.player.materials.wood}</span>
        <span>⛏️ ${this.player.materials.ironOre}</span>
        <span>✨ ${this.player.materials.goldOre}</span>
        <span>🔥 ${this.player.materials.fireCore}</span>
        <span>🔮 ${this.player.materials.darkShard}</span>
        <span>🧪 ${this.player.materials.potions} (H)</span>
      `;
    }

    // Weapon Name
    const wepEl = document.getElementById('hud-weapon');
    if (wepEl) {
      wepEl.textContent = `Weapon: ${this.player.weapon.name} (${this.player.weapon.damage} Dmg)`;
    }

    // Show/Hide Next Wave button during intermission
    const nextBtn = document.getElementById('btn-next-wave');
    if (nextBtn) {
      if (this.waveManager.state === 'intermission') {
        nextBtn.classList.remove('hidden');
      } else {
        nextBtn.classList.add('hidden');
      }
    }
  }

  draw() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transform + screen shake
    const shakeX = (Math.random() - 0.5) * this.camera.shake;
    const shakeY = (Math.random() - 0.5) * this.camera.shake;
    this.ctx.translate(Math.floor(-this.camera.x + shakeX), Math.floor(-this.camera.y + shakeY));

    // Draw World & Arena Background
    this.world.draw(this.ctx, this.spriteStore, this.frameCount);

    // Draw Anvil / Workstation & Merchant NPC
    const merchantSpr = this.spriteStore.get(`merchant_${Math.floor(this.frameCount / 20) % 2}`);
    if (merchantSpr) {
      this.ctx.drawImage(merchantSpr, this.world.merchantPos.x, this.world.merchantPos.y);
      // NPC label
      this.ctx.font = '8px monospace';
      this.ctx.fillStyle = '#fde047';
      this.ctx.fillText('Merchant [E]', this.world.merchantPos.x - 8, this.world.merchantPos.y - 4);
    }

    const anvilSpr = this.spriteStore.get('anvil');
    if (anvilSpr) {
      this.ctx.drawImage(anvilSpr, this.world.workstationPos.x, this.world.workstationPos.y + 6);
      // Workstation label
      this.ctx.font = '8px monospace';
      this.ctx.fillStyle = this.waveManager.isWorkstationRound ? '#4ade80' : '#94a3b8';
      this.ctx.fillText('Anvil (Wave 3x)', this.world.workstationPos.x - 12, this.world.workstationPos.y + 2);
    }

    // Draw Drops
    for (const drop of this.drops) {
      drop.draw(this.ctx, this.spriteStore);
    }

    // Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, this.spriteStore);
    }

    // Draw Player (with separate knight animations & weapon slash)
    this.player.draw(this.ctx, this.spriteStore);

    // Draw Particles
    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    // Draw Floating Texts
    for (const ft of this.floatTexts) {
      ft.draw(this.ctx);
    }

    this.ctx.restore();
  }

  restart() {
    this.player = new Player(26 * 16, 18 * 16);
    this.waveManager = new WaveManager();
    this.enemies = [];
    this.drops = [];
    this.particles = [];
    this.floatTexts = [];
    this.closeModals();
    const goScreen = document.getElementById('gameover-screen');
    if (goScreen) goScreen.classList.add('hidden');
  }

  loop() {
    if (this.waveManager.state !== 'gameover') {
      this.update();
    }
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// Boot game when window is ready
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    const game = new Game(canvas);
    window.game = game;
    game.loop();

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.onclick = () => game.restart();
    }
  }
});
