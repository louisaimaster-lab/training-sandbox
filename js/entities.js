// Player, Harvestable Objects, Enemies, Drops, Particles and Combat
import { TIER_PLATEAU } from './heightmap.js';

export class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#ffffff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.vy = -1.2;
    this.life = 40;
    this.maxLife = 40;
  }

  update() {
    this.y += this.vy;
    this.vy *= 0.94;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(this.text, Math.floor(this.x) + 1, Math.floor(this.y) + 1);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, Math.floor(this.x), Math.floor(this.y));
    ctx.restore();
  }
}

export class LootDrop {
  constructor(x, y, zLevel, itemId, count = 1) {
    this.x = x;
    this.y = y;
    this.zLevel = zLevel;
    this.itemId = itemId;
    this.count = count;
    this.life = 1800; // 30s
    this.floatTimer = Math.random() * Math.PI * 2;
    this.width = 12;
    this.height = 12;
  }

  update(player, inventory, audio, floatTexts) {
    this.life--;
    this.floatTimer += 0.08;

    // Check player pickup on matching elevation
    if (this.zLevel === player.zLevel) {
      const dist = Math.hypot((player.x + 8) - this.x, (player.y + 10) - this.y);
      if (dist < 22) {
        inventory.addItem(this.itemId, this.count);
        audio.playPickup();
        floatTexts.push(new FloatingText(this.x, this.y - 6, `+${this.count} ${this.itemId}`, '#fbbf24'));
        return true; // Picked up
      }
    }
    return false;
  }

  draw(ctx) {
    const bob = Math.sin(this.floatTimer) * 2;
    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x + 6, this.y + 10, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Item icon/box
    ctx.fillStyle = '#facc15';
    ctx.fillRect(this.x + 2, this.y + 2 + bob, 8, 8);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 2, this.y + 2 + bob, 8, 8);
    ctx.restore();
  }
}

export class HarvestableObject {
  constructor(x, y, zLevel, type, hp = 3) {
    this.x = x;
    this.y = y;
    this.zLevel = zLevel;
    this.type = type; // 'tree', 'rock_copper', 'rock_iron', 'rock_gold'
    this.maxHp = hp;
    this.hp = hp;
    this.width = type === 'tree' ? 32 : 20;
    this.height = type === 'tree' ? 40 : 18;
    this.hitTimer = 0;
  }

  hit(toolType, particles, audio, floatTexts) {
    if (this.type === 'tree' && toolType === 'axe') {
      this.hp--;
      this.hitTimer = 8;
      audio.playChop();
      for (let i = 0; i < 6; i++) {
        particles.push(new Particle(this.x + 16, this.y + 24, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#9a5b32', 2, 18));
      }
      return this.hp <= 0;
    } else if (this.type.startsWith('rock_') && toolType === 'pickaxe') {
      this.hp--;
      this.hitTimer = 8;
      audio.playMine();
      for (let i = 0; i < 6; i++) {
        particles.push(new Particle(this.x + 10, this.y + 10, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#94a3b8', 2, 18));
      }
      return this.hp <= 0;
    }
    return false;
  }

  draw(ctx, spriteLoader) {
    if (this.hitTimer > 0) this.hitTimer--;

    ctx.save();
    if (this.hitTimer > 0) {
      ctx.translate(Math.sin(this.hitTimer) * 2, 0);
    }

    const sprKey = `obj_${this.type}`;
    const spr = spriteLoader.get(sprKey);
    if (spr) {
      ctx.drawImage(spr, this.x, this.y);
    }
    ctx.restore();
  }
}

export class Player {
  constructor(x, y, zLevel = TIER_PLATEAU) {
    this.x = x;
    this.y = y;
    this.zLevel = zLevel;
    this.width = 16;
    this.height = 20;
    this.speed = 2.2;

    this.facing = 'down'; // 'down', 'up', 'left', 'right'
    this.state = 'idle'; // 'idle', 'walk', 'slash', 'jump_ledge', 'hurt'
    this.animFrame = 0;
    this.animTimer = 0;

    // Stats
    this.maxHp = 100;
    this.hp = 100;
    this.maxStamina = 100;
    this.stamina = 100;

    // Action timers
    this.actionTimer = 0;
    this.invulnTimer = 0;

    // Ledge jump animation
    this.jumpProgress = 0;
    this.jumpStartY = 0;
    this.jumpTargetY = 0;
  }

  update(keys, world, audio, particles, floatTexts) {
    if (this.invulnTimer > 0) this.invulnTimer--;

    // Stamina recovery
    if (this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.3);
    }

    // 1. Handling Ledge Jumping (Pokemon-style jump down)
    if (this.state === 'jump_ledge') {
      this.jumpProgress += 0.08;
      const arc = Math.sin(this.jumpProgress * Math.PI) * 16;
      this.y = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * this.jumpProgress - arc;

      if (this.jumpProgress >= 1.0) {
        this.y = this.jumpTargetY;
        this.state = 'idle';
      }
      return;
    }

    // 2. Action / Attack Execution
    if (this.actionTimer > 0) {
      this.actionTimer--;
      if (this.actionTimer <= 0) {
        this.state = 'idle';
      }
      return;
    }

    // 3. Movement Inputs (WASD / Arrows)
    let moveX = 0;
    let moveY = 0;

    if (keys['KeyA'] || keys['ArrowLeft']) { moveX = -1; this.facing = 'left'; }
    else if (keys['KeyD'] || keys['ArrowRight']) { moveX = 1; this.facing = 'right'; }
    else if (keys['KeyW'] || keys['ArrowUp']) { moveY = -1; this.facing = 'up'; }
    else if (keys['KeyS'] || keys['ArrowDown']) { moveY = 1; this.facing = 'down'; }

    if (moveX !== 0 || moveY !== 0) {
      this.state = 'walk';
      this.animTimer++;
      if (this.animTimer % 8 === 0) {
        this.animFrame = (this.animFrame + 1) % 4;
      }

      const stepX = moveX * this.speed;
      const stepY = moveY * this.speed;

      // Check heightmap collision & ramps
      const moveRes = world.checkMove(this, stepX, stepY);
      if (moveRes.allowed) {
        if (moveRes.isLedgeJump) {
          // Trigger Pokémon-style smooth jump arc down
          this.state = 'jump_ledge';
          this.jumpProgress = 0;
          this.jumpStartY = this.y;
          this.jumpTargetY = this.y + 28;
          this.zLevel = moveRes.newZ;
          audio.playLedgeJump();
        } else {
          this.x += stepX;
          this.y += stepY;
          if (moveRes.newZ !== undefined) {
            this.zLevel = moveRes.newZ;
          }
        }
      }
    } else {
      this.state = 'idle';
      this.animFrame = 0;
    }
  }

  performAction(toolOrWeapon, world, harvestables, enemies, audio, particles, floatTexts, lootDrops) {
    if (this.actionTimer > 0 || this.state === 'jump_ledge') return;

    this.actionTimer = 16;
    this.state = 'slash';

    // Facing direction target offset
    let targetX = this.x + 8;
    let targetY = this.y + 10;
    if (this.facing === 'down') targetY += 20;
    else if (this.facing === 'up') targetY -= 20;
    else if (this.facing === 'left') targetX -= 20;
    else if (this.facing === 'right') targetX += 20;

    if (toolOrWeapon === 'sword') {
      audio.playSlash();
      // Hit enemies on same Z level
      enemies.forEach((enemy, idx) => {
        if (enemy.zLevel === this.zLevel) {
          const dist = Math.hypot((enemy.x + 8) - targetX, (enemy.y + 8) - targetY);
          if (dist < 26) {
            enemy.takeDamage(25, audio, particles, floatTexts);
            if (enemy.hp <= 0) {
              // Spawn monster drop
              lootDrops.push(new LootDrop(enemy.x, enemy.y, enemy.zLevel, 'Slime Jelly', 2));
              enemies.splice(idx, 1);
            }
          }
        }
      });
    } else if (toolOrWeapon === 'pickaxe' || toolOrWeapon === 'axe') {
      // Hit harvestable resources
      for (let i = harvestables.length - 1; i >= 0; i--) {
        const obj = harvestables[i];
        if (obj.zLevel === this.zLevel) {
          const dist = Math.hypot((obj.x + obj.width / 2) - targetX, (obj.y + obj.height / 2) - targetY);
          if (dist < 26) {
            const destroyed = obj.hit(toolOrWeapon, particles, audio, floatTexts);
            if (destroyed) {
              const itemType = obj.type === 'tree' ? 'Wood' : (obj.type.includes('copper') ? 'Copper Ore' : 'Iron Ore');
              lootDrops.push(new LootDrop(obj.x + 8, obj.y + 8, obj.zLevel, itemType, 3));
              harvestables.splice(i, 1);
            }
            break;
          }
        }
      }
    }
  }

  takeDamage(amount, audio, particles, floatTexts) {
    if (this.invulnTimer > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = 30;
    audio.playHit();
    floatTexts.push(new FloatingText(this.x + 8, this.y - 8, `-${amount}`, '#ef4444'));

    for (let i = 0; i < 8; i++) {
      particles.push(new Particle(this.x + 8, this.y + 10, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#ef4444', 2, 20));
    }
  }

  draw(ctx, spriteLoader) {
    ctx.save();

    // Drop shadow beneath feet
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x + 8, this.y + 18, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flash when invulnerable
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const sprKey = `player_${this.facing}_${this.animFrame}`;
    const spr = spriteLoader.get(sprKey);
    if (spr) {
      ctx.drawImage(spr, Math.floor(this.x), Math.floor(this.y));
    }

    // Draw crescent slash arc when attacking (matching user's reference photo!)
    if (this.state === 'slash') {
      const slashSpr = spriteLoader.get(`slash_${this.facing}`);
      if (slashSpr) {
        let sx = this.x - 8;
        let sy = this.y - 6;
        if (this.facing === 'right') sx += 16;
        else if (this.facing === 'left') sx -= 16;
        else if (this.facing === 'down') sy += 14;
        else if (this.facing === 'up') sy -= 14;
        ctx.drawImage(slashSpr, Math.floor(sx), Math.floor(sy));
      }
    }

    ctx.restore();
  }
}

export class Enemy {
  constructor(x, y, zLevel, type = 'slime') {
    this.x = x;
    this.y = y;
    this.zLevel = zLevel;
    this.type = type;
    this.maxHp = 40;
    this.hp = 40;
    this.speed = 1.2;
    this.width = 16;
    this.height = 16;
    this.hopTimer = Math.random() * Math.PI * 2;
  }

  takeDamage(amount, audio, particles, floatTexts) {
    this.hp -= amount;
    audio.playHit();
    floatTexts.push(new FloatingText(this.x + 8, this.y - 8, `${amount}`, '#facc15'));
    for (let i = 0; i < 6; i++) {
      particles.push(new Particle(this.x + 8, this.y + 8, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#22c55e', 2, 20));
    }
  }

  update(player, world) {
    this.hopTimer += 0.06;

    // Only chase if player is on the same elevation level or close to ramp
    if (this.zLevel === player.zLevel) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 140 && dist > 10) {
        const stepX = (dx / dist) * this.speed;
        const stepY = (dy / dist) * this.speed;

        const moveRes = world.checkMove(this, stepX, stepY);
        if (moveRes.allowed) {
          this.x += stepX;
          this.y += stepY;
        }
      }

      // Contact attack
      if (dist < 18) {
        player.takeDamage(10, { playHit: () => {} }, [], []);
      }
    }
  }

  draw(ctx) {
    const hop = Math.abs(Math.sin(this.hopTimer)) * 4;
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x + 8, this.y + 14, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Slime Blob
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(this.x + 8, this.y + 8 - hop, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.x + 5, this.y + 6 - hop, 2, 2);
    ctx.fillRect(this.x + 9, this.y + 6 - hop, 2, 2);
    ctx.restore();
  }
}
