// Entities: Knight Player, Zombies, Drops, Particles, Combat System
import { Physics, JUMP_FORCE, MAX_RUN_SPEED, MOVE_ACCEL, MOVE_DECEL } from './physics.js';

export class Particle {
  constructor(x, y, vx, vy, color, size, life, gravity = 0.1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.gravity = gravity;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    ctx.globalAlpha = 1.0;
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#ffffff', isCrit = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.vy = -1.6;
    this.life = 45;
    this.maxLife = 45;
  }

  update() {
    this.x += (Math.random() - 0.5) * 0.3;
    this.y += this.vy;
    this.vy *= 0.94;
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = this.isCrit ? 'bold 12px monospace' : '9px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(this.text, Math.floor(this.x) + 1, Math.floor(this.y) + 1);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, Math.floor(this.x), Math.floor(this.y));
    ctx.restore();
  }
}

export class Drop {
  constructor(x, y, type, value = 1) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 3;
    this.vy = -3 - Math.random() * 2;
    this.width = 10;
    this.height = 10;
    this.type = type; // 'coin_copper', 'coin_silver', 'coin_gold', 'heart', 'material'
    this.value = value;
    this.grounded = false;
    this.life = 1800; // 30s
    this.magnet = false;
  }

  update(world, player) {
    this.life--;
    const distToPlayer = Math.hypot((player.x + 12) - this.x, (player.y + 16) - this.y);
    if (distToPlayer < 75) {
      // Magnetic pull to player
      const angle = Math.atan2((player.y + 16) - this.y, (player.x + 12) - this.x);
      this.vx += Math.cos(angle) * 0.7;
      this.vy += Math.sin(angle) * 0.7;
      this.vx *= 0.92;
      this.vy *= 0.92;
      this.x += this.vx;
      this.y += this.vy;
    } else {
      this.vx *= 0.95;
      Physics.updateEntity(this, world, false);
    }
  }

  draw(ctx, spriteStore) {
    const spr = spriteStore.get(this.type);
    if (spr) {
      ctx.drawImage(spr, Math.floor(this.x), Math.floor(this.y));
    }
  }
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 24;
    this.height = 28;
    this.grounded = false;
    this.facing = 1; // 1 = right, -1 = left

    // Stats
    this.maxHp = 100;
    this.hp = 100;
    this.coins = 50; // In copper value (1 silver = 100 copper, 1 gold = 10000 copper)
    this.defense = 0;
    this.speedBonus = 1.0;
    this.hasDoubleJump = false;
    this.canDoubleJump = false;
    this.invulnTimer = 0;

    // Materials Inventory
    this.materials = {
      wood: 0,
      ironOre: 0,
      goldOre: 0,
      fireCore: 0,
      darkShard: 0,
      potions: 2,
    };

    // Equipment & Weapon
    this.weapon = {
      id: 'sword_copper',
      name: 'Copper Broadsword',
      damage: 12,
      knockback: 4.5,
      swingSpeed: 18, // lower is faster
      range: 36,
      critChance: 0.08,
      effectColor: '#ffffff',
      special: null, // 'fire', 'dark', etc.
    };

    // Animation states
    this.animTimer = 0;
    this.animFrame = 0;
    this.state = 'idle'; // 'idle', 'run', 'jump', 'fall', 'attack', 'hurt'

    // Combat swing state
    this.isAttacking = false;
    this.attackTimer = 0;
    this.slashArc = 0; // 0 to 1 progress of sword arc
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  drinkPotion(audio, particles, floatTexts) {
    if (this.materials.potions > 0 && this.hp < this.maxHp) {
      this.materials.potions--;
      this.heal(40);
      audio.playHeal();
      floatTexts.push(new FloatingText(this.x + 8, this.y - 10, '+40 HP', '#4ade80'));
      for (let i = 0; i < 15; i++) {
        particles.push(new Particle(
          this.x + 12 + (Math.random() - 0.5) * 16,
          this.y + 16 + (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 2,
          -1 - Math.random() * 2,
          '#4ade80',
          3,
          30,
          -0.05
        ));
      }
      return true;
    }
    return false;
  }

  takeDamage(amount, fromX, audio, particles, floatTexts) {
    if (this.invulnTimer > 0) return 0;

    const actualDamage = Math.max(1, amount - this.defense);
    this.hp -= actualDamage;
    this.invulnTimer = 35; // i-frames
    this.state = 'hurt';

    // Knockback
    const dir = this.x > fromX ? 1 : -1;
    this.vx = dir * 4.5;
    this.vy = -3.5;

    audio.playHit(false);
    floatTexts.push(new FloatingText(this.x + 10, this.y - 8, `-${actualDamage}`, '#ef4444'));

    for (let i = 0; i < 12; i++) {
      particles.push(new Particle(
        this.x + 12,
        this.y + 14,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        '#ef4444',
        3,
        25
      ));
    }

    return actualDamage;
  }

  startAttack(audio) {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.attackTimer = this.weapon.swingSpeed;
    audio.playSwing(1.0 + Math.random() * 0.2);
  }

  update(keys, mouse, world, audio, particles, floatTexts) {
    if (this.invulnTimer > 0) {
      this.invulnTimer--;
    }

    const dropDown = keys['ArrowDown'] || keys['KeyS'];

    // Horizontal movement
    const targetMaxSpeed = MAX_RUN_SPEED * this.speedBonus;
    if (keys['KeyA'] || keys['ArrowLeft']) {
      this.vx = Math.max(-targetMaxSpeed, this.vx - MOVE_ACCEL);
      this.facing = -1;
    } else if (keys['KeyD'] || keys['ArrowRight']) {
      this.vx = Math.min(targetMaxSpeed, this.vx + MOVE_ACCEL);
      this.facing = 1;
    } else {
      this.vx *= MOVE_DECEL;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // Reset double jump on ground
    if (this.grounded) {
      this.canDoubleJump = this.hasDoubleJump;
    }

    // Jumping
    if (keys['just_Space'] || keys['just_KeyW'] || keys['just_ArrowUp']) {
      if (this.grounded) {
        this.vy = JUMP_FORCE;
        this.grounded = false;
        audio.playJump();
        // Dust poof
        for (let i = 0; i < 6; i++) {
          particles.push(new Particle(this.x + 12, this.y + 26, (Math.random() - 0.5) * 3, -Math.random() * 1.5, '#cbd5e1', 2, 15));
        }
      } else if (this.canDoubleJump) {
        this.vy = JUMP_FORCE * 0.9;
        this.canDoubleJump = false;
        audio.playJump();
        // Cloud in bottle effect
        for (let i = 0; i < 10; i++) {
          particles.push(new Particle(this.x + 12, this.y + 26, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, '#e0f2fe', 3, 20, -0.02));
        }
      }
    }

    // Quick heal
    if (keys['just_KeyH']) {
      this.drinkPotion(audio, particles, floatTexts);
    }

    // Physics step
    Physics.updateEntity(this, world, dropDown);

    // Attack timer & slash progress
    if (this.isAttacking) {
      this.attackTimer--;
      this.slashArc = 1 - (this.attackTimer / this.weapon.swingSpeed);

      // Weapon particles on swing
      if (this.weapon.special === 'fire' && Math.random() < 0.6) {
        const pX = this.x + 12 + this.facing * 20;
        const pY = this.y + 14 + (Math.random() - 0.5) * 20;
        particles.push(new Particle(pX, pY, this.facing * 1.5, (Math.random() - 0.5) * 1.5, '#f97316', 3, 20, -0.05));
      } else if (this.weapon.special === 'dark' && Math.random() < 0.6) {
        const pX = this.x + 12 + this.facing * 24;
        const pY = this.y + 14 + (Math.random() - 0.5) * 20;
        particles.push(new Particle(pX, pY, this.facing * 1.5, (Math.random() - 0.5) * 1.5, '#c084fc', 3, 20, -0.02));
      }

      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }

    // Determine Animation State (Uses strictly distinct sprite frames)
    this.animTimer++;
    if (this.invulnTimer > 25) {
      this.state = 'hurt';
    } else if (this.isAttacking) {
      this.state = 'attack';
    } else if (!this.grounded) {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(this.vx) > 0.3) {
      this.state = 'run';
    } else {
      this.state = 'idle';
    }
  }

  draw(ctx, spriteStore) {
    ctx.save();

    // Flash when invulnerable
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    let spriteKey = 'knight_idle_0';
    if (this.state === 'idle') {
      const frame = Math.floor(this.animTimer / 10) % 4;
      spriteKey = `knight_idle_${frame}`;
    } else if (this.state === 'run') {
      const frame = Math.floor(this.animTimer / 6) % 6;
      spriteKey = `knight_run_${frame}`;
    } else if (this.state === 'jump') {
      spriteKey = 'knight_jump';
    } else if (this.state === 'fall') {
      spriteKey = 'knight_fall';
    } else if (this.state === 'attack') {
      const frame = Math.min(2, Math.floor(this.slashArc * 3));
      spriteKey = `knight_attack_${frame}`;
    } else if (this.state === 'hurt') {
      spriteKey = 'knight_hurt';
    }

    const spr = spriteStore.get(spriteKey);

    // Draw sprite flipped based on facing direction
    if (this.facing === -1) {
      ctx.translate(this.x + this.width, this.y);
      ctx.scale(-1, 1);
      if (spr) ctx.drawImage(spr, 0, 0);
    } else {
      ctx.translate(this.x, this.y);
      if (spr) ctx.drawImage(spr, 0, 0);
    }

    ctx.restore();

    // Draw Weapon & Slash Arc
    this.drawWeaponAndSlash(ctx, spriteStore);
  }

  drawWeaponAndSlash(ctx, spriteStore) {
    const weaponSpr = spriteStore.get(this.weapon.id);
    const centerX = this.x + 12;
    const centerY = this.y + 16;

    if (this.isAttacking) {
      ctx.save();
      ctx.translate(centerX, centerY);

      // Swing angle calculation
      const startAngle = this.facing === 1 ? -Math.PI * 0.45 : -Math.PI * 0.55;
      const endAngle = this.facing === 1 ? Math.PI * 0.45 : Math.PI * 1.45;
      const currentAngle = this.facing === 1
        ? startAngle + (endAngle - startAngle) * this.slashArc
        : startAngle - (startAngle - endAngle) * this.slashArc;

      // Draw dynamic Terraria slash trail
      ctx.beginPath();
      ctx.strokeStyle = this.weapon.effectColor || '#ffffff';
      ctx.lineWidth = 3;
      ctx.arc(0, 0, this.weapon.range, startAngle, currentAngle, this.facing === -1);
      ctx.stroke();

      // Outer glow for special swords
      if (this.weapon.special) {
        ctx.beginPath();
        ctx.strokeStyle = this.weapon.special === 'fire' ? '#f97316' : '#a855f7';
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.4;
        ctx.arc(0, 0, this.weapon.range + 2, startAngle, currentAngle, this.facing === -1);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Draw rotating weapon sprite
      ctx.rotate(currentAngle);
      if (this.facing === -1) ctx.scale(1, -1);
      if (weaponSpr) {
        ctx.drawImage(weaponSpr, 6, -8);
      }
      ctx.restore();
    } else {
      // Idle held weapon
      ctx.save();
      ctx.translate(centerX, centerY);
      if (this.facing === -1) {
        ctx.scale(-1, 1);
        ctx.rotate(-0.3);
      } else {
        ctx.rotate(0.3);
      }
      if (weaponSpr) {
        ctx.drawImage(weaponSpr, 2, -4);
      }
      ctx.restore();
    }
  }
}

// -------------------------------------------------------------
// ZOMBIES & ENEMY AI
// -------------------------------------------------------------
export class Enemy {
  constructor(x, y, type = 'zombie') {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.type = type; // 'zombie', 'armored_zombie', 'crawler', 'brute'
    this.grounded = false;
    this.facing = 1;
    this.hurtTimer = 0;
    this.animTimer = Math.floor(Math.random() * 10);

    // Setup stats based on type
    if (type === 'zombie') {
      this.width = 24;
      this.height = 28;
      this.maxHp = 30;
      this.hp = 30;
      this.damage = 14;
      this.speed = 1.2;
      this.coinValue = 15;
      this.knockbackResistance = 0.2;
    } else if (type === 'armored_zombie') {
      this.width = 24;
      this.height = 28;
      this.maxHp = 65;
      this.hp = 65;
      this.damage = 22;
      this.speed = 1.0;
      this.coinValue = 45;
      this.knockbackResistance = 0.6;
    } else if (type === 'crawler') {
      this.width = 24;
      this.height = 16;
      this.maxHp = 22;
      this.hp = 22;
      this.damage = 18;
      this.speed = 2.4;
      this.coinValue = 30;
      this.knockbackResistance = 0.1;
    } else if (type === 'brute') {
      this.width = 44;
      this.height = 48;
      this.maxHp = 280;
      this.hp = 280;
      this.damage = 38;
      this.speed = 0.85;
      this.coinValue = 250;
      this.knockbackResistance = 0.9;
    }
  }

  takeDamage(amount, fromX, knockback, audio, particles, floatTexts, isCrit = false) {
    this.hp -= amount;
    this.hurtTimer = 15;

    // Knockback calculation
    const dir = this.x > fromX ? 1 : -1;
    const effKnockback = knockback * (1 - this.knockbackResistance);
    this.vx = dir * effKnockback;
    this.vy = -effKnockback * 0.6;

    audio.playHit(isCrit);

    // Damage number
    const color = isCrit ? '#f97316' : '#facc15';
    floatTexts.push(new FloatingText(this.x + this.width / 2, this.y - 10, `${amount}`, color, isCrit));

    // Blood / sparks particles
    const pColor = this.type === 'armored_zombie' ? '#94a3b8' : (this.type === 'crawler' ? '#dc2626' : '#22c55e');
    for (let i = 0; i < (isCrit ? 15 : 8); i++) {
      particles.push(new Particle(
        this.x + this.width / 2,
        this.y + this.height / 2,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        pColor,
        isCrit ? 3 : 2,
        25
      ));
    }
  }

  update(player, world, audio) {
    if (this.hurtTimer > 0) this.hurtTimer--;

    // Move toward player
    const distToPlayer = (player.x + 12) - (this.x + this.width / 2);
    const targetDir = distToPlayer > 0 ? 1 : -1;
    this.facing = targetDir;

    // Only apply walk force if not severely recoiling
    if (this.hurtTimer < 8) {
      this.vx += targetDir * 0.15;
      if (Math.abs(this.vx) > this.speed) {
        this.vx = targetDir * this.speed;
      }

      // Jump over obstacles / up platforms
      const tileAheadX = Math.floor((this.x + (targetDir === 1 ? this.width + 4 : -4)) / world.tileSize);
      const tileFootY = Math.floor((this.y + this.height - 2) / world.tileSize);
      const tileChestY = Math.floor((this.y + this.height - 18) / world.tileSize);

      if (this.grounded && (world.isSolid(tileAheadX, tileFootY) || (player.y < this.y - 20 && Math.random() < 0.02))) {
        this.vy = -6.5;
        this.grounded = false;
      }
    }

    // Occasional zombie groan
    if (Math.random() < 0.001) {
      audio.playZombieGroan();
    }

    Physics.updateEntity(this, world, false);
    this.animTimer++;
  }

  draw(ctx, spriteStore) {
    ctx.save();
    let spriteKey = `${this.type}_0`;

    if (this.hurtTimer > 0) {
      spriteKey = this.type === 'zombie' ? 'zombie_hurt' : `${this.type}_0`;
    } else if (this.type === 'crawler') {
      const frame = Math.floor(this.animTimer / 8) % 2;
      spriteKey = `crawler_${frame}`;
    } else if (this.type === 'brute') {
      const frame = Math.floor(this.animTimer / 10) % 2;
      spriteKey = `brute_${frame}`;
    } else {
      const frame = Math.floor(this.animTimer / 8) % 4;
      spriteKey = `${this.type}_${frame}`;
    }

    const spr = spriteStore.get(spriteKey);

    if (this.facing === -1) {
      ctx.translate(this.x + this.width, this.y);
      ctx.scale(-1, 1);
      if (spr) ctx.drawImage(spr, 0, 0);
    } else {
      ctx.translate(this.x, this.y);
      if (spr) ctx.drawImage(spr, 0, 0);
    }
    ctx.restore();

    // Health bar above enemy if damaged
    if (this.hp < this.maxHp) {
      const barW = this.width;
      const barH = 3;
      const hpPercent = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(this.x, this.y - 7, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.x, this.y - 7, barW * hpPercent, barH);
    }
  }
}
