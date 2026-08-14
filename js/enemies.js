// Infected & Monster Classes with Smooth 2D Vector Visuals
import { SmoothParticle, SmoothFloatingText, ExplosionShockwave } from './effects.js';

export class AcidSpit {
  constructor(x, y, vx, vy, damage = 15) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.radius = 6;
    this.life = 90;
  }

  update(particles) {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05; // slight gravity
    this.life--;

    if (Math.random() < 0.5) {
      particles.push(new SmoothParticle(
        this.x, this.y,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        '#84cc16',
        3,
        15
      ));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Monster {
  constructor(x, y, type = 'runner') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.slowTimer = 0;
    this.attackCooldown = 0;
    this.hurtTimer = 0;
    this.animProgress = Math.random() * Math.PI * 2;

    if (type === 'runner') {
      this.radius = 14;
      this.maxHp = 45;
      this.hp = 45;
      this.baseSpeed = 2.4;
      this.damage = 10;
      this.bounty = 20;
      this.color = '#ef4444';
      this.darkColor = '#991b1b';
    } else if (type === 'spitter') {
      this.radius = 16;
      this.maxHp = 70;
      this.hp = 70;
      this.baseSpeed = 1.4;
      this.damage = 18;
      this.bounty = 35;
      this.color = '#84cc16';
      this.darkColor = '#4d7c0f';
      this.shootCooldown = 90;
    } else if (type === 'brute') {
      this.radius = 26;
      this.maxHp = 260;
      this.hp = 260;
      this.baseSpeed = 0.9;
      this.damage = 32;
      this.bounty = 80;
      this.color = '#8b5cf6';
      this.darkColor = '#5b21b6';
    } else if (type === 'boss') {
      this.radius = 42;
      this.maxHp = 1200;
      this.hp = 1200;
      this.baseSpeed = 0.65;
      this.damage = 60;
      this.bounty = 350;
      this.color = '#e11d48';
      this.darkColor = '#881337';
      this.shootCooldown = 60;
    }
  }

  takeDamage(amount, fromX, audio, particles, floatTexts, isCrit = false, isSlow = false) {
    this.hp -= amount;
    this.hurtTimer = 6;

    if (isSlow) {
      this.slowTimer = 60;
    }

    if (audio) audio.playHitMonster();

    // Damage text
    const txtColor = isCrit ? '#f97316' : (isSlow ? '#38bdf8' : '#ffffff');
    if (floatTexts) {
      floatTexts.push(new SmoothFloatingText(this.x, this.y - this.radius - 8, `${Math.round(amount)}`, txtColor, isCrit));
    }

    // Blood / gore particles
    for (let i = 0; i < (isCrit ? 8 : 4); i++) {
      particles.push(new SmoothParticle(
        this.x,
        this.y,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        this.color,
        isCrit ? 4 : 2.5,
        25
      ));
    }
  }

  update(targetHouse, targetTurret, acidSpits, particles, audio) {
    if (this.hurtTimer > 0) this.hurtTimer--;
    if (this.slowTimer > 0) this.slowTimer--;

    const speed = this.slowTimer > 0 ? this.baseSpeed * 0.45 : this.baseSpeed;
    this.animProgress += speed * 0.08;

    // Target priority: move towards house center or turret
    const target = (this.x < targetHouse.x) ? targetHouse : targetTurret;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Spitter behavior: stop at range and shoot acid
    if (this.type === 'spitter' || this.type === 'boss') {
      if (this.shootCooldown > 0) this.shootCooldown--;
      if (dist < 480 && this.shootCooldown <= 0) {
        this.shootCooldown = this.type === 'boss' ? 50 : 100;
        const angle = Math.atan2(dy, dx);
        acidSpits.push(new AcidSpit(
          this.x + Math.cos(angle) * this.radius,
          this.y + Math.sin(angle) * this.radius,
          Math.cos(angle) * 6,
          Math.sin(angle) * 6,
          this.damage
        ));
      }
    }

    // Move forward if not close enough
    if (dist > this.radius + 15) {
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const wobble = Math.sin(this.animProgress) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius + 4, this.radius * 0.9, this.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = this.hurtTimer > 0 ? '#ffffff' : (this.slowTimer > 0 ? '#67e8f9' : this.color);
    ctx.beginPath();
    ctx.arc(0, wobble, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner menacing core / eye / spikes
    ctx.fillStyle = this.darkColor;
    ctx.beginPath();
    ctx.arc(this.radius * 0.3, wobble - 2, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(this.radius * 0.35, wobble - 2, this.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Monster Spikes / limbs
    ctx.strokeStyle = this.darkColor;
    ctx.lineWidth = 3;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      const legX = Math.cos(a + this.animProgress) * (this.radius + 4);
      const legY = Math.sin(a + this.animProgress) * (this.radius + 4);
      ctx.beginPath();
      ctx.moveTo(0, wobble);
      ctx.lineTo(legX, legY);
      ctx.stroke();
    }

    ctx.restore();

    // Health Bar
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2;
      const barH = 4;
      const hpPct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - this.radius, this.y - this.radius - 12, barW, barH);
      ctx.fillStyle = this.type === 'boss' ? '#e11d48' : '#22c55e';
      ctx.fillRect(this.x - this.radius, this.y - this.radius - 12, barW * hpPct, barH);
    }
  }
}
