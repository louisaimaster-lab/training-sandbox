// Assembled CATS-styled Modular Turret Class
import { CHASSIS_TYPES, PART_TYPES } from './parts.js';
import { Projectile, SmoothParticle, ExplosionShockwave } from './effects.js';

export class AssembledTurret {
  constructor(x, y, chassisId = 'scout', equippedSlots = {}) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2; // Aiming upward initially
    this.targetAngle = -Math.PI / 2;
    this.chassisId = chassisId;
    this.chassis = CHASSIS_TYPES[chassisId];
    this.equipped = { ...equippedSlots }; // { slotId: partObject }

    // Weapon firing timers: { slotId: timerNumber }
    this.fireTimers = {};

    // Dynamic stats
    this.recalculateStats();
    this.hp = this.maxHp;
    this.shield = this.maxShield;

    this.muzzleFlashes = []; // { x, y, angle, life }
  }

  recalculateStats() {
    this.chassis = CHASSIS_TYPES[this.chassisId];
    let extraHp = 0;
    let extraEnergy = 0;
    let extraCrit = 0;
    let damageReduction = 0;
    let maxShield = 0;
    let healRate = 0;

    for (const [slotId, part] of Object.entries(this.equipped)) {
      if (!part) continue;
      if (part.bonusHp) extraHp += part.bonusHp;
      if (part.bonusEnergy) extraEnergy += part.bonusEnergy;
      if (part.critBonus) extraCrit += part.critBonus;
      if (part.damageReduction) damageReduction += part.damageReduction;
      if (part.maxShield) maxShield += part.maxShield;
      if (part.healRate) healRate += part.healRate;
    }

    this.maxHp = this.chassis.maxHp + extraHp;
    this.energyCap = this.chassis.baseEnergy + extraEnergy;
    this.critChance = 0.05 + extraCrit;
    this.damageReduction = damageReduction;
    this.maxShield = maxShield;
    this.healRate = healRate;

    // Calculate energy used
    this.usedEnergy = 0;
    for (const [slotId, part] of Object.entries(this.equipped)) {
      if (part && part.energyCost) {
        this.usedEnergy += part.energyCost;
      }
    }
  }

  aimAt(targetX, targetY) {
    this.targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
  }

  update(isFiring, enemies, projectiles, particles, shockwaves, audio) {
    // Smooth swivel interpolation
    let diff = this.targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * this.chassis.swivelSpeed;

    // Passive regeneration / repairs
    if (this.healRate > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.healRate);
    }

    // Shield recharge
    if (this.maxShield > 0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 0.3);
    }

    // Weapons firing loop
    for (const slot of this.chassis.slots) {
      if (slot.type !== PART_TYPES.WEAPON) continue;
      const part = this.equipped[slot.id];
      if (!part) continue;

      if (!this.fireTimers[slot.id]) this.fireTimers[slot.id] = 0;
      if (this.fireTimers[slot.id] > 0) this.fireTimers[slot.id]--;

      if (isFiring && this.fireTimers[slot.id] <= 0) {
        this.fireWeapon(slot, part, enemies, projectiles, particles, shockwaves, audio);
        this.fireTimers[slot.id] = part.fireRate;
      }
    }

    // Update muzzle flashes
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      this.muzzleFlashes[i].life--;
      if (this.muzzleFlashes[i].life <= 0) {
        this.muzzleFlashes.splice(i, 1);
      }
    }
  }

  fireWeapon(slot, part, enemies, projectiles, particles, shockwaves, audio) {
    // Calculate rotated socket position
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const muzzleX = this.x + (slot.x * cos - slot.y * sin);
    const muzzleY = this.y + (slot.x * sin + slot.y * cos);

    const isCrit = Math.random() < this.critChance;

    if (part.isBeam) {
      // Continuous Laser Beam Raycast
      audio.playLaser();
      const beamLength = part.range || 750;
      const endX = muzzleX + Math.cos(this.angle) * beamLength;
      const endY = muzzleY + Math.sin(this.angle) * beamLength;

      // Laser visual particle beam
      for (let i = 0; i < 8; i++) {
        const step = Math.random();
        particles.push(new SmoothParticle(
          muzzleX + (endX - muzzleX) * step,
          muzzleY + (endY - muzzleY) * step,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          part.beamColor || '#38bdf8',
          2.5,
          10,
          0.85
        ));
      }

      // Damage enemies along line
      for (const enemy of enemies) {
        const dist = distToSegment({ x: enemy.x, y: enemy.y }, { x: muzzleX, y: muzzleY }, { x: endX, y: endY });
        if (dist < enemy.radius + 6) {
          enemy.takeDamage(part.damage * 0.2, muzzleX, audio, particles, isCrit);
        }
      }
    } else if (part.pellets) {
      // Shotgun blast
      audio.playShotgun();
      for (let p = 0; p < part.pellets; p++) {
        const spreadAngle = this.angle + (Math.random() - 0.5) * part.spread;
        const speed = part.bulletSpeed * (0.9 + Math.random() * 0.2);
        projectiles.push(new Projectile(
          muzzleX,
          muzzleY,
          Math.cos(spreadAngle) * speed,
          Math.sin(spreadAngle) * speed,
          part,
          isCrit
        ));
      }
    } else {
      // Standard Projectile (Minigun, Rocket, Cryo, Mortar)
      if (part.sound === 'rocket') audio.playRocket();
      else if (part.sound === 'plasma') audio.playPlasma();
      else audio.playMinigun();

      const spreadAngle = this.angle + (part.spread ? (Math.random() - 0.5) * part.spread : 0);
      projectiles.push(new Projectile(
        muzzleX,
        muzzleY,
        Math.cos(spreadAngle) * part.bulletSpeed,
        Math.sin(spreadAngle) * part.bulletSpeed,
        part,
        isCrit
      ));
    }

    this.muzzleFlashes.push({ x: muzzleX, y: muzzleY, angle: this.angle, life: 4 });
  }

  takeDamage(amount, particles, shockwaves) {
    let dmg = Math.max(1, amount - this.damageReduction);

    if (this.shield > 0) {
      if (this.shield >= dmg) {
        this.shield -= dmg;
        dmg = 0;
        shockwaves.push(new ExplosionShockwave(this.x, this.y, 45, '#38bdf8'));
      } else {
        dmg -= this.shield;
        this.shield = 0;
      }
    }

    this.hp -= dmg;
    for (let i = 0; i < 8; i++) {
      particles.push(new SmoothParticle(
        this.x + (Math.random() - 0.5) * 20,
        this.y + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        '#f59e0b',
        3,
        20
      ));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw Tripod / Bipod Legs or Mounting Base
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    // Left leg
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.lineTo(-24, 30);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(24, 30);
    ctx.stroke();

    // Center base pad
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, 32);
    ctx.stroke();

    // Rotate Turret Body & Guns
    ctx.rotate(this.angle + Math.PI / 2);

    // Draw Chassis Body (Smooth rounded vector capsule/polygon)
    ctx.fillStyle = this.chassis.color;
    ctx.strokeStyle = this.chassis.border;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(-this.chassis.width / 2, -this.chassis.height / 2, this.chassis.width, this.chassis.height, 8);
    ctx.fill();
    ctx.stroke();

    // Chassis mechanical details
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Draw Equipped Parts on Sockets
    for (const slot of this.chassis.slots) {
      const part = this.equipped[slot.id];
      ctx.save();
      ctx.translate(slot.x, slot.y);

      if (part) {
        if (slot.type === PART_TYPES.WEAPON) {
          // Draw gun barrel extending forward
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-4, -22, 8, 22);
          ctx.fillStyle = part.bulletColor || '#38bdf8';
          ctx.fillRect(-2, -26, 4, 6);
        } else if (slot.type === PART_TYPES.GADGET) {
          // Tech sphere / antenna
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (slot.type === PART_TYPES.BATTERY) {
          // Glowing battery core
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-5, -5, 10, 10);
        } else if (slot.type === PART_TYPES.ARMOR) {
          // Thick armored plate
          ctx.fillStyle = '#64748b';
          ctx.fillRect(-6, -8, 12, 16);
        }
      } else {
        // Empty socket indicator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();

    // Draw Muzzle Flashes
    for (const flash of this.muzzleFlashes) {
      ctx.save();
      ctx.translate(flash.x, flash.y);
      ctx.rotate(flash.angle);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(10, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(6, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Forcefield Shield Glow if active
    if (this.shield > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + (this.shield / this.maxShield) * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fill();
      ctx.restore();
    }
  }
}

// Distance helper for laser raycast
function distToSegment(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
