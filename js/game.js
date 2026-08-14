// Main 3D Skyway Runner Coordinator, Three.js Scene, Camera & Game Loop
/* global THREE */
import { SoundEngine } from './audio.js';
import { CyberSurfer } from './player.js';
import { TrackManager } from './tracks.js';
import { CyberChaser } from './chaser.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.audio = new SoundEngine();

    // Game stats & state
    this.score = 0;
    this.coins = 0;
    this.highScore = parseInt(localStorage.getItem('skyway_highscore') || '0', 10);
    this.multiplier = 1;
    this.speed = 0.55;
    this.maxSpeed = 1.35;
    this.worldZ = 0;
    this.state = 'start'; // 'start', 'running', 'gameover'

    this.initThree();
    this.initCityBackdrop();
    this.setupEvents();
    this.updateHUD();
  }

  initThree() {
    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040814);
    this.scene.fog = new THREE.FogExp2(0x040814, 0.012);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 5.5, -9);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 35, 20);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xfacc15, 1.5, 60);
    pointLight.position.set(0, 8, 10);
    this.scene.add(pointLight);
    this.neonLight = pointLight;

    // 4. Entities
    this.tracks = new TrackManager(this.scene);
    this.player = new CyberSurfer(this.scene);
    this.chaser = new CyberChaser(this.scene);
  }

  initCityBackdrop() {
    // Procedural Cyberpunk Skyscrapers in background
    this.cityGroup = new THREE.Group();
    const buildingGeo = new THREE.BoxGeometry(18, 120, 18);

    for (let i = 0; i < 40; i++) {
      const isLeft = Math.random() < 0.5;
      const x = isLeft ? -45 - Math.random() * 60 : 45 + Math.random() * 60;
      const z = Math.random() * 400;
      const h = 50 + Math.random() * 100;

      const mat = new THREE.MeshStandardMaterial({
        color: Math.random() < 0.5 ? 0x091428 : 0x0f172a,
        roughness: 0.7
      });
      const building = new THREE.Mesh(buildingGeo, mat);
      building.scale.set(1, h / 120, 1);
      building.position.set(x, h / 2 - 40, z);
      this.cityGroup.add(building);

      // Glowing Neon Roof Antenna / Billboards
      if (Math.random() < 0.6) {
        const billboardGeo = new THREE.BoxGeometry(14, 6, 1);
        const billboardMat = new THREE.MeshBasicMaterial({
          color: Math.random() < 0.5 ? 0xec4899 : 0x06b6d4
        });
        const billboard = new THREE.Mesh(billboardGeo, billboardMat);
        billboard.position.set(x, h - 35, z);
        this.cityGroup.add(billboard);
      }
    }
    this.scene.add(this.cityGroup);
  }

  setupEvents() {
    // Responsive Fullscreen Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      this.audio.init();

      if (this.state === 'start' || this.state === 'gameover') {
        if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'Enter') {
          this.startGame();
        }
        return;
      }

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.player.moveLeft(this.audio);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.player.moveRight(this.audio);
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        this.player.jump(this.audio);
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.player.slide(this.audio);
      }
    });

    // Touch Swipe Controls
    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      this.audio.init();
      if (this.state !== 'running') this.startGame();
    });

    window.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 30) {
        if (absX > absY) {
          if (dx > 0) this.player.moveRight(this.audio);
          else this.player.moveLeft(this.audio);
        } else {
          if (dy < 0) this.player.jump(this.audio);
          else this.player.slide(this.audio);
        }
      }
    });

    // UI Buttons
    const startBtn = document.getElementById('btn-start-run');
    if (startBtn) startBtn.onclick = () => this.startGame();

    const restartBtn = document.getElementById('btn-restart-run');
    if (restartBtn) restartBtn.onclick = () => this.startGame();
  }

  startGame() {
    this.state = 'running';
    this.score = 0;
    this.coins = 0;
    this.worldZ = 0;
    this.speed = 0.55;

    // Reset Player
    this.player.laneIndex = 1;
    this.player.targetX = 0;
    this.player.x = 0;
    this.player.y = 0;
    this.player.z = 0;
    this.player.isGrounded = true;
    this.player.currentPlatformY = 0;
    this.player.jetpackTimer = 0;
    this.player.hasShield = false;

    // Hide Modals with smooth animation
    const startModal = document.getElementById('start-modal');
    if (startModal) startModal.classList.add('hidden');

    const goModal = document.getElementById('gameover-modal');
    if (goModal) goModal.classList.add('hidden');
  }

  triggerGameOver() {
    this.state = 'gameover';
    this.audio.playCrash();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('skyway_highscore', `${this.highScore}`);
    }

    const goModal = document.getElementById('gameover-modal');
    const finalScore = document.getElementById('final-score-val');
    const finalCoins = document.getElementById('final-coins-val');
    const bestScore = document.getElementById('final-best-val');

    if (finalScore) finalScore.textContent = `${Math.floor(this.score)}`;
    if (finalCoins) finalCoins.textContent = `${this.coins}`;
    if (bestScore) bestScore.textContent = `${Math.floor(this.highScore)}`;
    if (goModal) goModal.classList.remove('hidden');
  }

  update() {
    if (this.state === 'running') {
      // Accelerate speed gradually
      if (this.speed < this.maxSpeed) {
        this.speed += 0.00012;
      }

      this.worldZ += this.speed;

      // Score increment (multiplied during power-ups)
      const effMult = this.player.multiplierTimer > 0 ? this.multiplier * 2 : this.multiplier;
      this.score += this.speed * 2.5 * effMult;

      // Update Player & Tracks
      this.player.update(this.worldZ);
      this.tracks.update(this.worldZ);
      this.chaser.update(this.player);

      // Camera Follows Player smoothly with high-speed depth
      const camTargetZ = this.worldZ - 8.5;
      const camTargetY = Math.max(4.2, this.player.y + 4.2);
      const camTargetX = this.player.x * 0.45;

      this.camera.position.x += (camTargetX - this.camera.position.x) * 0.15;
      this.camera.position.y += (camTargetY - this.camera.position.y) * 0.15;
      this.camera.position.z = camTargetZ;

      // Dynamic FOV Warp during Jetpack
      const targetFov = this.player.jetpackTimer > 0 ? 80 : 65;
      this.camera.fov += (targetFov - this.camera.fov) * 0.05;
      this.camera.updateProjectionMatrix();

      this.camera.lookAt(this.player.x * 0.2, this.player.y + 1.2, this.worldZ + 12);
      this.neonLight.position.set(this.player.x, this.player.y + 6, this.worldZ + 4);

      // Check Collision vs Obstacles
      this.checkCollisions();

      // Check Coin & Power-up Pickups
      this.checkCollectibles();
    }

    this.updateHUD();
    this.renderer.render(this.scene, this.camera);
  }

  checkCollisions() {
    // If in high-altitude jetpack mode, immune to ground obstacles!
    if (this.player.jetpackTimer > 0) {
      this.player.currentPlatformY = 0;
      return;
    }

    const pHit = this.player.getHitbox();
    let currentPlatform = 0;

    for (const obs of this.tracks.obstacles) {
      // Check Z overlap
      if (pHit.z + pHit.depth / 2 >= obs.zStart && pHit.z - pHit.depth / 2 <= obs.zEnd) {
        // Check Lane X overlap
        if (Math.abs(pHit.x - obs.x) < 1.4) {
          if (obs.type === 'train') {
            // Check if player is on top of the train roof
            if (pHit.y >= obs.height - 0.5) {
              currentPlatform = obs.platformY;
            } else {
              // Crash into front/side of train
              this.handleCrash();
              return;
            }
          } else if (obs.type === 'hurdle') {
            // Requires jump above 1.3
            if (pHit.y < obs.height) {
              this.handleCrash();
              return;
            }
          } else if (obs.type === 'laser') {
            // Requires slide under (sliding height = 0.9)
            if (pHit.y + pHit.height > obs.minY) {
              this.handleCrash();
              return;
            }
          }
        }
      }
    }

    this.player.currentPlatformY = currentPlatform;
  }

  handleCrash() {
    if (this.player.hasShield) {
      // Shield absorbs crash!
      this.player.hasShield = false;
      this.audio.playCrash();
      this.chaser.triggerStumble();
      return;
    }

    this.triggerGameOver();
  }

  checkCollectibles() {
    const pX = this.player.x;
    const pY = this.player.y + 1.2;
    const pZ = this.player.z;
    const magnetActive = this.player.magnetTimer > 0;
    const magnetRange = magnetActive ? 14 : 2.2;

    // Coins
    for (const c of this.tracks.coins) {
      if (c.collected) continue;
      const dist = Math.hypot(pX - c.x, pY - c.y, pZ - c.z);

      if (dist < magnetRange) {
        // Magnetic pull
        if (magnetActive) {
          c.mesh.position.x += (pX - c.mesh.position.x) * 0.3;
          c.mesh.position.y += (pY - c.mesh.position.y) * 0.3;
          c.mesh.position.z += (pZ - c.mesh.position.z) * 0.3;
        }

        if (dist < 2.2) {
          c.collected = true;
          this.scene.remove(c.mesh);
          this.coins++;
          this.audio.playCoin();
        }
      }
    }

    // Power-ups
    for (const p of this.tracks.powerups) {
      if (p.collected) continue;
      const dist = Math.hypot(pX - p.x, pY - p.y, pZ - p.z);

      if (dist < 2.4) {
        p.collected = true;
        this.scene.remove(p.mesh);
        this.audio.playPowerup();

        if (p.type === 'jetpack') this.player.jetpackTimer = 500;
        else if (p.type === 'magnet') this.player.magnetTimer = 450;
        else if (p.type === 'multiplier') this.player.multiplierTimer = 450;
        else if (p.type === 'shield') this.player.hasShield = true;
        else if (p.type === 'superjump') this.player.superJumpTimer = 450;
      }
    }
  }

  updateHUD() {
    const scoreEl = document.getElementById('hud-score-val');
    if (scoreEl) scoreEl.textContent = `${Math.floor(this.score)}`;

    const coinsEl = document.getElementById('hud-coins-val');
    if (coinsEl) coinsEl.textContent = `${this.coins}`;

    const multEl = document.getElementById('hud-mult-val');
    if (multEl) {
      const isBoosted = this.player.multiplierTimer > 0;
      multEl.textContent = isBoosted ? 'x4 MULTIPLIER' : 'x2 MULTIPLIER';
      multEl.style.color = isBoosted ? '#ec4899' : '#facc15';
    }

    // Power-up indicators
    const pContainer = document.getElementById('hud-powerups-bar');
    if (pContainer) {
      let html = '';
      if (this.player.jetpackTimer > 0) html += `<div class="powerup-badge badge-jetpack">🚀 JETPACK (${Math.ceil(this.player.jetpackTimer / 60)}s)</div>`;
      if (this.player.magnetTimer > 0) html += `<div class="powerup-badge badge-magnet">🧲 MAGNET (${Math.ceil(this.player.magnetTimer / 60)}s)</div>`;
      if (this.player.hasShield) html += `<div class="powerup-badge badge-shield">🛡️ SHIELD ACTIVE</div>`;
      if (this.player.superJumpTimer > 0) html += `<div class="powerup-badge badge-jump">👟 SUPER JUMP</div>`;
      pContainer.innerHTML = html;
    }
  }

  loop() {
    this.update();
    requestAnimationFrame(() => this.loop());
  }
}

// Boot game when window is ready
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.game = game;
  game.loop();
});
