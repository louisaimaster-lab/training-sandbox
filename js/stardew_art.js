// Stardew Valley-styled Cozy Farm Environment & High-Detail Visuals

export class StardewEnvironment {
  constructor(width = 1600, height = 1000) {
    this.width = width;
    this.height = height;

    // Farmhouse coordinates
    this.house = { x: 700, y: 180, width: 200, height: 160 };

    // Ancient Energy Core coordinates
    this.core = { x: 800, y: 550, radius: 24, maxHp: 800, hp: 800 };

    // Fireflies / dust motes
    this.fireflies = [];
    for (let i = 0; i < 25; i++) {
      this.fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        pulse: Math.random() * Math.PI * 2,
        color: Math.random() < 0.6 ? '#fef08a' : '#86efac'
      });
    }

    // Chimney smoke particles
    this.chimneySmoke = [];

    // Ambient trees
    this.trees = [
      { x: 180, y: 220, type: 'oak' },
      { x: 340, y: 160, type: 'pine' },
      { x: 1250, y: 200, type: 'oak' },
      { x: 1420, y: 260, type: 'pine' },
      { x: 160, y: 780, type: 'oak' },
      { x: 1380, y: 800, type: 'pine' }
    ];

    // Crop patches
    this.cropPatches = [
      { x: 420, y: 460, cols: 4, rows: 3, crop: 'starfruit' },
      { x: 1040, y: 460, cols: 4, rows: 3, crop: 'pumpkin' }
    ];
  }

  update() {
    // Update fireflies
    for (const f of this.fireflies) {
      f.x += f.vx;
      f.y += f.vy;
      f.pulse += 0.05;
      if (f.x < 0) f.x = this.width;
      if (f.x > this.width) f.x = 0;
      if (f.y < 0) f.y = this.height;
      if (f.y > this.height) f.y = 0;
    }

    // Spawn chimney smoke
    if (Math.random() < 0.2) {
      this.chimneySmoke.push({
        x: this.house.x + 30 + (Math.random() - 0.5) * 4,
        y: this.house.y - 45,
        vx: (Math.random() - 0.5) * 0.3 + 0.2,
        vy: -0.8 - Math.random() * 0.4,
        radius: 6,
        maxRadius: 18,
        life: 60,
        maxLife: 60
      });
    }

    // Update smoke
    for (let i = this.chimneySmoke.length - 1; i >= 0; i--) {
      const s = this.chimneySmoke[i];
      s.x += s.vx;
      s.y += s.vy;
      s.radius += (s.maxRadius - s.radius) * 0.04;
      s.life--;
      if (s.life <= 0) this.chimneySmoke.splice(i, 1);
    }
  }

  draw(ctx, frameCount) {
    // 1. Lush Stardew Valley Night Grass Base
    const grassGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    grassGradient.addColorStop(0, '#1c3d22');
    grassGradient.addColorStop(0.5, '#234a29');
    grassGradient.addColorStop(1, '#1b3b20');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Cobblestone Pathways
    this.drawPathways(ctx);

    // 3. Tilled Soil & Crops
    this.drawCrops(ctx);

    // 4. Wooden Fences
    this.drawFences(ctx);

    // 5. Trees (Behind House / Ambient)
    for (const tree of this.trees) {
      this.drawTree(ctx, tree.x, tree.y, tree.type);
    }

    // 6. Cozy Stardew Farmhouse
    this.drawFarmhouse(ctx, frameCount);

    // 7. Ancient Energy Sun Core Dais
    this.drawEnergyCore(ctx, frameCount);

    // 8. Lantern Posts & Warm Glows
    this.drawLantern(ctx, 640, 480);
    this.drawLantern(ctx, 960, 480);
    this.drawLantern(ctx, 800, 720);

    // 9. Fireflies
    this.drawFireflies(ctx);
  }

  drawPathways(ctx) {
    ctx.save();
    // Path from House to Core, and Core to Bottom
    ctx.fillStyle = '#645344';
    ctx.strokeStyle = '#4a3b2c';
    ctx.lineWidth = 2;

    // Vertical Main Path
    ctx.fillRect(770, 320, 60, 580);
    // Horizontal Cross Path
    ctx.fillRect(380, 520, 840, 60);

    // Scattered Cobblestones on path
    ctx.fillStyle = '#8c7b6d';
    for (let y = 330; y < 890; y += 30) {
      for (let x = 775; x < 825; x += 22) {
        ctx.beginPath();
        ctx.ellipse(x + (Math.sin(y) * 4), y, 8, 6, Math.sin(x), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let x = 390; x < 1210; x += 30) {
      for (let y = 525; y < 575; y += 22) {
        ctx.beginPath();
        ctx.ellipse(x, y + (Math.sin(x) * 4), 8, 6, Math.sin(y), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawCrops(ctx) {
    for (const patch of this.cropPatches) {
      const pw = patch.cols * 32;
      const ph = patch.rows * 32;

      // Dark rich tilled soil
      ctx.fillStyle = '#452b18';
      ctx.strokeStyle = '#2e1c0e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(patch.x, patch.y, pw, ph, 8);
      ctx.fill();
      ctx.stroke();

      // Soil furrows
      ctx.fillStyle = '#362112';
      for (let r = 0; r < patch.rows; r++) {
        ctx.fillRect(patch.x + 4, patch.y + r * 32 + 20, pw - 8, 6);
      }

      // Draw Plants/Crops
      for (let r = 0; r < patch.rows; r++) {
        for (let c = 0; c < patch.cols; c++) {
          const cx = patch.x + c * 32 + 16;
          const cy = patch.y + r * 32 + 16;

          // Leaves
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(cx - 5, cy, 6, 3, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 5, cy, 6, 3, 0.4, 0, Math.PI * 2);
          ctx.fill();

          if (patch.crop === 'starfruit') {
            // Glowing Golden Starfruit
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
            ctx.fill();
            // Shimmer center
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 2, cy - 6, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Ripe Orange Pumpkin
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.arc(cx, cy - 3, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#65a30d';
            ctx.fillRect(cx - 1, cy - 10, 2, 4);
          }
        }
      }
    }
  }

  drawFences(ctx) {
    ctx.save();
    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#533007';
    ctx.lineWidth = 2;

    // Left farm fence
    for (let y = 300; y < 850; y += 36) {
      ctx.fillRect(320, y, 10, 36);
      ctx.strokeRect(320, y, 10, 36);
      // Horizontal rail
      ctx.fillRect(315, y + 10, 20, 6);
    }
    // Right farm fence
    for (let y = 300; y < 850; y += 36) {
      ctx.fillRect(1280, y, 10, 36);
      ctx.strokeRect(1280, y, 10, 36);
      ctx.fillRect(1275, y + 10, 20, 6);
    }
    ctx.restore();
  }

  drawFarmhouse(ctx, frameCount) {
    const h = this.house;
    ctx.save();

    // 1. Stone Chimney (Left side)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(h.x + 20, h.y - 40, 24, 70);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(h.x + 20, h.y - 40, 24, 70);

    // Chimney cap
    ctx.fillStyle = '#475569';
    ctx.fillRect(h.x + 16, h.y - 46, 32, 8);

    // Draw Chimney Smoke
    for (const s of this.chimneySmoke) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.fillStyle = `rgba(226, 232, 240, ${alpha * 0.45})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. House Timber Body
    ctx.fillStyle = '#9a5b32'; // Warm cedar wood planks
    ctx.fillRect(h.x, h.y, h.width, h.height);

    // Wood plank horizontal lines
    ctx.strokeStyle = '#6e3b1c';
    ctx.lineWidth = 2;
    for (let y = h.y + 14; y < h.y + h.height; y += 14) {
      ctx.beginPath();
      ctx.moveTo(h.x, y);
      ctx.lineTo(h.x + h.width, y);
      ctx.stroke();
    }

    // Corner timber pillars
    ctx.fillStyle = '#6e3b1c';
    ctx.fillRect(h.x, h.y, 14, h.height);
    ctx.fillRect(h.x + h.width - 14, h.y, 14, h.height);

    // 3. Shingled Gable Roof
    ctx.fillStyle = '#852e2e'; // Classic Stardew red/terracotta roof
    ctx.beginPath();
    ctx.moveTo(h.x - 25, h.y);
    ctx.lineTo(h.x + h.width / 2, h.y - 65);
    ctx.lineTo(h.x + h.width + 25, h.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#501717';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Shingle rows
    ctx.strokeStyle = '#682222';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 4; i++) {
      const step = i / 5;
      ctx.beginPath();
      ctx.moveTo(h.x - 25 + step * 40, h.y - step * 45);
      ctx.lineTo(h.x + h.width + 25 - step * 40, h.y - step * 45);
      ctx.stroke();
    }

    // 4. Front Wooden Door
    ctx.fillStyle = '#532b14';
    ctx.fillRect(h.x + h.width / 2 - 18, h.y + h.height - 55, 36, 55);
    ctx.strokeStyle = '#2d1508';
    ctx.lineWidth = 2;
    ctx.strokeRect(h.x + h.width / 2 - 18, h.y + h.height - 55, 36, 55);

    // Door knob
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(h.x + h.width / 2 + 10, h.y + h.height - 28, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Windows with Warm Golden Glowing Light & Curtains
    this.drawCozyWindow(ctx, h.x + 30, h.y + 40);
    this.drawCozyWindow(ctx, h.x + h.width - 70, h.y + 40);

    // 6. Flower Planter Boxes Under Windows
    this.drawPlanterBox(ctx, h.x + 26, h.y + 78);
    this.drawPlanterBox(ctx, h.x + h.width - 74, h.y + 78);

    ctx.restore();
  }

  drawCozyWindow(ctx, x, y) {
    // Warm glowing amber glass
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x, y, 40, 36);

    // Red Curtains on sides
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(x, y, 8, 36);
    ctx.fillRect(x + 32, y, 8, 36);

    // Wooden window cross frames
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, 40, 36);
    ctx.beginPath();
    ctx.moveTo(x + 20, y);
    ctx.lineTo(x + 20, y + 36);
    ctx.moveTo(x, y + 18);
    ctx.lineTo(x + 40, y + 18);
    ctx.stroke();

    // Window light glow
    const glow = ctx.createRadialGradient(x + 20, y + 18, 5, x + 20, y + 18, 50);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlanterBox(ctx, x, y) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x, y, 48, 10);
    // Flowers (red, pink, yellow blooms)
    const colors = ['#ef4444', '#f472b6', '#facc15', '#ef4444', '#a855f7'];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + 6 + i * 9, y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawEnergyCore(ctx, frameCount) {
    const c = this.core;
    ctx.save();

    // Stone Dais base
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(c.x, c.y + 8, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Ancient runic ring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y + 8, 38, 0, Math.PI * 2);
    ctx.stroke();

    // Floating pulsing Sun Crystal Core
    const floatY = c.y - 10 + Math.sin(frameCount * 0.05) * 5;
    const pulseRadius = c.radius + Math.sin(frameCount * 0.08) * 3;

    // Massive Core Glow
    const glow = ctx.createRadialGradient(c.x, floatY, 8, c.x, floatY, 90);
    glow.addColorStop(0, 'rgba(250, 204, 21, 0.7)');
    glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.25)');
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, floatY, 90, 0, Math.PI * 2);
    ctx.fill();

    // Celestial Crystal Poly
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(c.x, floatY - pulseRadius);
    ctx.lineTo(c.x + pulseRadius * 0.8, floatY);
    ctx.lineTo(c.x, floatY + pulseRadius);
    ctx.lineTo(c.x - pulseRadius * 0.8, floatY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(c.x, floatY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Health Bar above Core
    const barW = 80;
    const barH = 7;
    const pct = Math.max(0, c.hp / c.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(c.x - barW / 2, c.y - 48, barW, barH);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(c.x - barW / 2, c.y - 48, barW * pct, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x - barW / 2, c.y - 48, barW, barH);

    ctx.restore();
  }

  drawLantern(ctx, x, y) {
    ctx.save();
    // Wooden post
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 3, y - 30, 6, 30);

    // Lantern hanger
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 28);
    ctx.lineTo(x + 12, y - 28);
    ctx.lineTo(x + 12, y - 22);
    ctx.stroke();

    // Lantern Glass & Fire
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 8, y - 22, 8, 10);
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 8, y - 22, 8, 10);

    // Warm radial lighting halo
    const glow = ctx.createRadialGradient(x + 12, y - 17, 4, x + 12, y - 17, 75);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
    glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + 12, y - 17, 75, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawTree(ctx, x, y, type) {
    ctx.save();
    // Tree Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(x - 10, y - 35, 20, 45);

    // Foliage
    if (type === 'oak') {
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(x, y - 65, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x - 10, y - 75, 28, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pine
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(x, y - 110);
      ctx.lineTo(x + 35, y - 40);
      ctx.lineTo(x - 35, y - 40);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(x, y - 120);
      ctx.lineTo(x + 26, y - 65);
      ctx.lineTo(x - 26, y - 65);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawFireflies(ctx) {
    ctx.save();
    for (const f of this.fireflies) {
      const alpha = 0.3 + Math.sin(f.pulse) * 0.4;
      if (alpha > 0.1) {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
