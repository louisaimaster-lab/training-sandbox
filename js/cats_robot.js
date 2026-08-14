// CATS Modular Farm Robot Engine
import { CHASSIS_ROBOTS } from './parts_data.js';
import { Projectile, SmoothParticle, ExplosionShockwave } from './effects.js';

export class FarmRobot {
  constructor(x, y, chassisId = 'classic') {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.aimAngle = 0;
    this.chassisId = chassisId;
    this.chassis = CHASSIS_ROBOTS[chassisId];
    this.equipped = {}; // { socketId: partObject }

    // Weapon timers & animations
    this.fireTimers = {};
    this.sawAngle = 0;
    this.repulsorTimer = 0;

    this.recalculateStats();
    this.hp = this.maxHp;
    this.shield = this.maxShield;
  }

  recalculateStats() {
    this.chassis = CHASSIS_ROBOTS[this.chassisId];
    let extraHp = 0;
    let extraPower = 0;
    let maxShield = 0;
    let healRate = 0;
    let speedMult = 1.0;

    for (const [sId, part] of Object.entries(this.equipped)) {
      if (!part) continue;
      if (part.bonusPower) extraPower += part.bonusPower;
      if (part.maxShield) maxShield += part.maxShield;
      if (part.healRate) healRate += part.healRate;
      if (part.speedMult) speedMult *= part.speedMult;
    }

    this.maxHp = this.chassis.baseHp + extraHp;
    this.powerCapacity = this.chassis.basePower + extraPower;
    this.maxShield = maxShield;
    this.healRate = healRate;
    this.speed = this.chassis.speed * speedMult;

    // Calculate used power
    this.usedPower = 0;
    for (const [sId, part] of Object.entries(this.equipped)) {
      if (part && part.powerCost && part.powerCost > 0) {
        this.usedPower += part.powerCost;
      }
    }
  }

  aimAt(targetX, targetY) {
    this.aimAngle = Math.atan2(targetY - this.y, targetX - this.x);
  }

  update(keys, isFiring, monsters, projectiles, particles, shockwaves, audio, core) {
    // 1. Movement Inputs (WASD / Arrows)
    const moveX = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
    const moveY = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      this.vx += (moveX / len) * 0.7;
      this.vy += (moveY / len) * 0.7;
      const curSpeed = Math.hypot(this.vx, this.vy);
      if (curSpeed > this.speed) {
        this.vx = (this.vx / curSpeed) * this.speed;
        this.vy = (this.vy / curSpeed) * this.speed;
      }

      // Tread / wheel grass dust particles
      if (Math.random() < 0.3) {
        particles.push(new SmoothParticle(
          this.x + (Math.random() - 0.5) * 20,
          this.y + 16,
          -this.vx * 0.3,
          -this.vy * 0.3,
          '#15803d',
          2.5,
          15
        ));
      }
    } else {
      this.vx *= 0.82;
      this.vy *= 0.82;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Arena boundary clamp
    this.x = Math.max(80, Math.min(1520, this.x));
    this.y = Math.max(120, Math.min(900, this.y));

    // 2. Passive Regeneration & Shield
    if (this.healRate > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.healRate);
      if (core && core.hp < core.maxHp) {
        core.hp = Math.min(core.maxHp, core.hp + this.healRate * 0.6);
      }
    }
    if (this.maxShield > 0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 0.25);
    }

    // 3. Melee Saws / Drills continuous rotation & contact shred
    this.sawAngle += 0.35;
    for (const slot of this.chassis.sockets) {
      const part = this.equipped[slot.id];
      if (!part || !part.isMelee) continue;

      // Socket world pos
      const cos = Math.cos(this.aimAngle);
      const sin = Math.sin(this.aimAngle);
      const wx = this.x + (slot.x * cos - slot.y * sin);
      const wy = this.y + (slot.x * sin + slot.y * cos);

      // Check contact damage vs monsters
      const reach = part.bladeRadius || part.drillLength || 25;
      for (const m of monsters) {
        const dist = Math.hypot(wx - m.x, wy - m.y);
        if (dist < reach + m.radius) {
          m.takeDamage(part.damage * 0.25, this.x, audio, particles, null, false);
          // Saw sparks
          for (let i = 0; i < 2; i++) {
            particles.push(new SmoothParticle(
              (wx + m.x) / 2, (wy + m.y) / 2,
              (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4,
              '#facc15', 2.5, 12
            ));
          }
        }
      }
    }

    // 4. Weapons Firing Loop
    for (const slot of this.chassis.sockets) {
      const part = this.equipped[slot.id];
      if (!part || part.type !== 'weapon' || part.isMelee) continue;

      if (!this.fireTimers[slot.id]) this.fireTimers[slot.id] = 0;
      if (this.fireTimers[slot.id] > 0) this.fireTimers[slot.id]--;

      if (isFiring && this.fireTimers[slot.id] <= 0) {
        this.fireWeapon(slot, part, monsters, projectiles, particles, shockwaves, audio);
        this.fireTimers[slot.id] = part.fireRate;
      }
    }

    // 5. Repulsor Gadget Pulse
    for (const slot of this.chassis.sockets) {
      const part = this.equipped[slot.id];
      if (part && part.passive === 'repulse') {
        this.repulsorTimer++;
        if (this.repulsorTimer >= part.pulseRate) {
          this.repulsorTimer = 0;
          shockwaves.push(new ExplosionShockwave(this.x, this.y, part.pulseRange, '#38bdf8'));
          audio.playPlasma();
          for (const m of monsters) {
            const dist = Math.hypot(this.x - m.x, this.y - m.y);
            if (dist < part.pulseRange) {
              const pushAngle = Math.atan2(m.y - this.y, m.x - this.x);
              m.x += Math.cos(pushAngle) * 55;
              m.y += Math.sin(pushAngle) * 55;
              m.takeDamage(12, this.x, audio, particles, null, false);
            }
          }
        }
      }
    }
  }

  fireWeapon(slot, part, monsters, projectiles, particles, shockwaves, audio) {
    const cos = Math.cos(this.aimAngle);
    const sin = Math.sin(this.aimAngle);
    const muzzleX = this.x + (slot.x * cos - slot.y * sin);
    const muzzleY = this.y + (slot.x * sin + slot.y * cos);

    if (part.isBeam) {
      // Continuous Laser Raycast
      audio.playLaser();
      const beamRange = part.range || 650;
      const endX = muzzleX + Math.cos(this.aimAngle) * beamRange;
      const endY = muzzleY + Math.sin(this.aimAngle) * beamRange;

      for (let i = 0; i < 6; i++) {
        const step = Math.random();
        particles.push(new SmoothParticle(
          muzzleX + (endX - muzzleX) * step,
          muzzleY + (endY - muzzleY) * step,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          part.beamColor || '#facc15',
          3,
          8,
          0.8
        ));
      }

      for (const m of monsters) {
        const d = distToSegment({ x: m.x, y: m.y }, { x: muzzleX, y: muzzleY }, { x: endX, y: endY });
        if (d < m.radius + 8) {
          m.takeDamage(part.damage * 0.25, muzzleX, audio, particles, null, false);
        }
      }
    } else if (part.pellets) {
      audio.playShotgun();
      for (let p = 0; p < part.pellets; p++) {
        const spread = this.aimAngle + (Math.random() - 0.5) * part.spread;
        projectiles.push(new Projectile(
          muzzleX, muzzleY,
          Math.cos(spread) * part.bulletSpeed,
          Math.sin(spread) * part.bulletSpeed,
          part
        ));
      }
    } else {
      if (part.weaponKind === 'rocket') audio.playRocket();
      else audio.playMinigun();

      projectiles.push(new Projectile(
        muzzleX, muzzleY,
        Math.cos(this.aimAngle) * part.bulletSpeed,
        Math.sin(this.aimAngle) * part.bulletSpeed,
        part
      ));
    }
  }

  takeDamage(amount, particles, shockwaves) {
    let dmg = amount;
    if (this.shield > 0) {
      if (this.shield >= dmg) {
        this.shield -= dmg;
        dmg = 0;
        shockwaves.push(new ExplosionShockwave(this.x, this.y, 40, '#38bdf8'));
      } else {
        dmg -= this.shield;
        this.shield = 0;
      }
    }

    this.hp -= dmg;
    for (let i = 0; i < 6; i++) {
      particles.push(new SmoothParticle(
        this.x, this.y,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        '#f59e0b', 3, 20
      ));
    }
  }

  draw(ctx) {
    this.drawRobotAt(ctx, this.x, this.y, this.aimAngle, false);
  }

  // Unified visual renderer for both in-game and workbench blueprint preview!
  drawRobotAt(ctx, drawX, drawY, angle = 0, isBlueprint = false) {
    ctx.save();
    ctx.translate(drawX, drawY);

    // 1. Dual Rubber Heavy Farm Treads / Wheels
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    // Top Tread
    ctx.beginPath();
    ctx.roundRect(-this.chassis.width / 2 + 4, -this.chassis.height / 2 - 8, this.chassis.width - 8, 10, 4);
    ctx.fill();
    ctx.stroke();

    // Bottom Tread
    ctx.beginPath();
    ctx.roundRect(-this.chassis.width / 2 + 4, this.chassis.height / 2 - 2, this.chassis.width - 8, 10, 4);
    ctx.fill();
    ctx.stroke();

    // 2. Rotate Chassis Body & Hardpoints
    ctx.rotate(angle);

    // Chassis Silhouette Body
    ctx.fillStyle = this.chassis.color;
    ctx.strokeStyle = this.chassis.accentColor;
    ctx.lineWidth = 3;

    if (this.chassis.shape === 'wedge') {
      ctx.beginPath();
      ctx.moveTo(-this.chassis.width / 2, -this.chassis.height / 2);
      ctx.lineTo(this.chassis.width / 2 - 6, -this.chassis.height / 4);
      ctx.lineTo(this.chassis.width / 2, 0);
      ctx.lineTo(this.chassis.width / 2 - 6, this.chassis.height / 4);
      ctx.lineTo(-this.chassis.width / 2, this.chassis.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.chassis.shape === 'box') {
      ctx.beginPath();
      ctx.roundRect(-this.chassis.width / 2, -this.chassis.height / 2, this.chassis.width, this.chassis.height, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      // Sleek
      ctx.beginPath();
      ctx.ellipse(0, 0, this.chassis.width / 2, this.chassis.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Robot Cockpit Visor
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(6, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(8, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // 3. Render Physically Mounted Parts & Socket Rings
    for (const slot of this.chassis.sockets) {
      const part = this.equipped[slot.id];
      ctx.save();
      ctx.translate(slot.x, slot.y);

      // Highlighted Socket Ring in Blueprint mode
      if (isBlueprint) {
        ctx.strokeStyle = part ? '#4ade80' : '#facc15';
        ctx.setLineDash(part ? [] : [3, 3]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (part) {
        this.drawMountedPart(ctx, part);
      }
      ctx.restore();
    }

    ctx.restore();

    // Forcefield Barrier Glow if equipped & alive
    if (!isBlueprint && this.shield > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fill();
      ctx.restore();
    }
  }

  drawMountedPart(ctx, part) {
    if (part.weaponKind === 'gun' || part.weaponKind === 'shotgun') {
      // Gun barrel extending forward
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -5, 22, 10);
      ctx.fillStyle = part.bulletColor || '#38bdf8';
      ctx.fillRect(20, -6, 4, 12);
    } else if (part.weaponKind === 'laser') {
      // Laser crystal emitter
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, -6, 16, 12);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(18, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (part.weaponKind === 'rocket') {
      // Rocket launcher pod
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -10, 18, 20);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(10, -8, 4, 6);
      ctx.fillRect(10, 2, 4, 6);
    } else if (part.weaponKind === 'saw') {
      // Whirling Sawblade
      ctx.save();
      ctx.rotate(this.sawAngle);
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Teeth
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const tx = Math.cos(a) * 22;
        const ty = Math.sin(a) * 22;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(tx - 2, ty - 2, 4, 4);
      }
      ctx.restore();
    } else if (part.weaponKind === 'drill') {
      // Spiral Mining Drill
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(26, 0);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Gadget / Battery / Nanite Orb
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function distToSegment(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
