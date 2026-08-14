// Smooth Vector Effects, Dynamic Lighting, and Particle Systems

export class SmoothParticle {
  constructor(x, y, vx, vy, color, size, life, decay = 0.96, grow = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.decay = decay;
    this.grow = grow;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.decay;
    this.vy *= this.decay;
    this.size += this.grow;
    this.life--;
  }

  draw(ctx) {
    if (this.size <= 0.1) return;
    const progress = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, progress);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ExplosionShockwave {
  constructor(x, y, maxRadius, color = '#f97316') {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.maxRadius = maxRadius;
    this.color = color;
    this.life = 25;
    this.maxLife = 25;
  }

  update() {
    this.radius += (this.maxRadius - this.radius) * 0.2;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright core
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.5) + ')';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class SmoothFloatingText {
  constructor(x, y, text, color = '#ffffff', isCrit = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.vy = -1.8;
    this.life = 40;
    this.maxLife = 40;
  }

  update() {
    this.y += this.vy;
    this.vy *= 0.92;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = this.isCrit ? 'bold 15px -apple-system, sans-serif' : '12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class Projectile {
  constructor(x, y, vx, vy, weapon, isCrit = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.weapon = weapon;
    this.damage = isCrit ? Math.floor(weapon.damage * 2.0) : weapon.damage;
    this.isCrit = isCrit;
    this.life = 120;
    this.radius = weapon.isExplosive ? 6 : (weapon.type === 'shotgun' ? 3 : 4);
    this.trail = [];
  }

  update(particles) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();

    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    // Rocket smoke trail
    if (this.weapon.isExplosive && Math.random() < 0.8) {
      particles.push(new SmoothParticle(
        this.x - this.vx * 0.5,
        this.y - this.vy * 0.5,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 1,
        '#64748b',
        4,
        20,
        0.92,
        0.2
      ));
    }
  }

  draw(ctx) {
    ctx.save();
    // Draw smooth trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.weapon.bulletColor || '#fbbf24';
      ctx.lineWidth = this.radius * 1.5;
      ctx.globalAlpha = 0.35;
      ctx.stroke();
    }

    // Bullet Core
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = this.weapon.bulletColor || '#fbbf24';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
