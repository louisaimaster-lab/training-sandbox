// Stardew Valley Wilderness Monsters & Forest Slimes
import { SmoothParticle, SmoothFloatingText } from './effects.js';

export class Monster {
  constructor(x, y, type = 'slime') {
    this.x = x;
    this.y = y;
    this.type = type; // 'slime', 'bat', 'bug', 'golem', 'king_slime'
    this.vx = 0;
    this.vy = 0;
    this.hurtTimer = 0;
    this.animTimer = Math.random() * Math.PI * 2;

    if (type === 'slime') {
      this.radius = 16;
      this.maxHp = 50;
      this.hp = 50;
      this.speed = 1.8;
      this.damage = 12;
      this.color = '#22c55e';
      this.darkColor = '#15803d';
    } else if (type === 'bat') {
      this.radius = 14;
      this.maxHp = 35;
      this.hp = 35;
      this.speed = 2.8;
      this.damage = 10;
      this.color = '#7e22ce';
      this.darkColor = '#581c87';
    } else if (type === 'bug') {
      this.radius = 18;
      this.maxHp = 90;
      this.hp = 90;
      this.speed = 1.5;
      this.damage = 18;
      this.color = '#d97706';
      this.darkColor = '#78350f';
    } else if (type === 'golem') {
      this.radius = 28;
      this.maxHp = 320;
      this.hp = 320;
      this.speed = 0.9;
      this.damage = 35;
      this.color = '#64748b';
      this.darkColor = '#334155';
    } else if (type === 'king_slime') {
      this.radius = 48;
      this.maxHp = 1400;
      this.hp = 1400;
      this.speed = 0.75;
      this.damage = 55;
      this.color = '#3b82f6';
      this.darkColor = '#1d4ed8';
    }
  }

  takeDamage(amount, fromX, audio, particles, floatTexts, isCrit = false) {
    this.hp -= amount;
    this.hurtTimer = 6;

    if (audio) audio.playHitMonster();

    if (floatTexts) {
      floatTexts.push(new SmoothFloatingText(this.x, this.y - this.radius - 8, `${Math.round(amount)}`, isCrit ? '#f97316' : '#ffffff', isCrit));
    }

    for (let i = 0; i < (isCrit ? 6 : 3); i++) {
      particles.push(new SmoothParticle(
        this.x, this.y,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        this.color,
        isCrit ? 3.5 : 2,
        20
      ));
    }
  }

  update(core, robot, particles, audio) {
    if (this.hurtTimer > 0) this.hurtTimer--;
    this.animTimer += 0.08;

    // Target selection: 60% priority on Energy Core, 40% on Robot
    const distToCore = Math.hypot(core.x - this.x, core.y - this.y);
    const distToRobot = Math.hypot(robot.x - this.x, robot.y - this.y);
    const target = distToRobot < 140 ? robot : core;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      if (this.type === 'bat') {
        // Fluttering sinusoidal flight pattern
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const wobble = Math.sin(this.animTimer * 2) * 1.2;
        this.vx = (dx / dist) * this.speed + perpX * wobble;
        this.vy = (dy / dist) * this.speed + perpY * wobble;
      } else {
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    // Contact attack vs Core
    if (Math.hypot(this.x - core.x, this.y - core.y) < this.radius + core.radius) {
      core.hp -= this.damage * 0.03;
    }

    // Contact attack vs Robot
    if (Math.hypot(this.x - robot.x, this.y - robot.y) < this.radius + 20) {
      robot.takeDamage(this.damage * 0.03, particles, []);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const squish = Math.sin(this.animTimer * 2);

    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius + 2, this.radius * 0.9, this.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Fill
    ctx.fillStyle = this.hurtTimer > 0 ? '#ffffff' : this.color;

    if (this.type === 'slime' || this.type === 'king_slime') {
      // Slime droplet blob
      const sx = 1 + squish * 0.12;
      const sy = 1 - squish * 0.12;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * sx, this.radius * sy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slime cute Stardew eyes & mouth
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.3, -2, this.radius * 0.15, 0, Math.PI * 2);
      ctx.arc(this.radius * 0.3, -2, this.radius * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.3 - 1, -3, this.radius * 0.07, 0, Math.PI * 2);
      ctx.arc(this.radius * 0.3 - 1, -3, this.radius * 0.07, 0, Math.PI * 2);
      ctx.fill();

      // King Slime Crown
      if (this.type === 'king_slime') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-18, -this.radius);
        ctx.lineTo(-12, -this.radius - 16);
        ctx.lineTo(0, -this.radius - 8);
        ctx.lineTo(12, -this.radius - 16);
        ctx.lineTo(18, -this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (this.type === 'bat') {
      // Flapping Bat
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      const wingY = Math.sin(this.animTimer * 4) * 12;
      ctx.fillStyle = this.darkColor;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-this.radius * 1.5, wingY);
      ctx.lineTo(-this.radius * 0.8, wingY + 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(this.radius * 1.5, wingY);
      ctx.lineTo(this.radius * 0.8, wingY + 10);
      ctx.closePath();
      ctx.fill();
    } else {
      // Golem / Bug
      ctx.beginPath();
      ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 8);
      ctx.fill();

      ctx.fillStyle = this.darkColor;
      ctx.fillRect(-this.radius * 0.6, -this.radius * 0.4, this.radius * 1.2, this.radius * 0.8);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Health Bar
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - this.radius, this.y - this.radius - 8, barW, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.x - this.radius, this.y - this.radius - 8, barW * pct, 4);
    }
  }
}
