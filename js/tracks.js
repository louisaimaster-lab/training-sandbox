// Infinite Procedural 3D Track, Maglev Trains, Obstacles & Power-up Spawner
/* global THREE */
import { LANES } from './player.js';

export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];

    this.segmentLength = 60;
    this.visibleSegments = 7;
    this.lastSpawnZ = 0;

    // Materials cache
    this.railMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 });
    this.stripeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2, emissive: 0x854d0e });
    this.trainMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 });
    this.trainWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.laserMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
    this.barrierMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });

    this.initTrack();
  }

  initTrack() {
    for (let i = 0; i < this.visibleSegments; i++) {
      this.spawnSegment(this.lastSpawnZ, i < 2); // First 2 segments are clean starting zone
      this.lastSpawnZ += this.segmentLength;
    }
  }

  spawnSegment(zStart, isSafeStart = false) {
    const group = new THREE.Group();
    group.position.z = zStart;

    // 1. Three-Lane Floating Skyway Rails
    const trackWidth = 14;
    const trackGeo = new THREE.BoxGeometry(trackWidth, 1.2, this.segmentLength);
    const trackMesh = new THREE.Mesh(trackGeo, this.railMat);
    trackMesh.position.set(0, -0.6, this.segmentLength / 2);
    group.add(trackMesh);

    // Neon Lane Dividers
    [-LANES[0] / 2, LANES[0] / 2].forEach(x => {
      const stripeGeo = new THREE.BoxGeometry(0.15, 0.05, this.segmentLength);
      const stripe = new THREE.Mesh(stripeGeo, this.stripeMat);
      stripe.position.set(x, 0.03, this.segmentLength / 2);
      group.add(stripe);
    });

    // Guard Rails (Left and Right)
    [-trackWidth / 2, trackWidth / 2].forEach(x => {
      const railGeo = new THREE.BoxGeometry(0.4, 1.2, this.segmentLength);
      const rail = new THREE.Mesh(railGeo, this.railMat);
      rail.position.set(x, 0.6, this.segmentLength / 2);
      group.add(rail);

      const railGlowGeo = new THREE.BoxGeometry(0.42, 0.1, this.segmentLength);
      const railGlow = new THREE.Mesh(railGlowGeo, this.stripeMat);
      railGlow.position.set(x, 1.25, this.segmentLength / 2);
      group.add(railGlow);
    });

    // Support Pillars / Skyway Girders
    const pillarGeo = new THREE.CylinderGeometry(1.2, 1.2, 40, 16);
    const pillar = new THREE.Mesh(pillarGeo, this.railMat);
    pillar.position.set(0, -20, this.segmentLength / 2);
    group.add(pillar);

    this.scene.add(group);
    this.segments.push({ group, zStart, zEnd: zStart + this.segmentLength });

    // 2. Spawn Obstacles & Collectibles inside segment if not safe start
    if (!isSafeStart) {
      this.populateSegment(zStart);
    }
  }

  populateSegment(zStart) {
    const chunkZ = zStart + 15;
    const patternRoll = Math.random();

    if (patternRoll < 0.35) {
      // Pattern A: Maglev Train in 1 lane + Coin Line on top!
      const trainLane = Math.floor(Math.random() * 3);
      this.spawnTrain(LANES[trainLane], chunkZ);

      // Other lanes get hurdle or laser
      const otherLane = (trainLane + 1) % 3;
      this.spawnHurdle(LANES[otherLane], chunkZ + 15);
    } else if (patternRoll < 0.65) {
      // Pattern B: Laser Gate (Slide Under) + Jump Barrier
      const laserLane = Math.floor(Math.random() * 3);
      this.spawnLaserGate(LANES[laserLane], chunkZ);

      const hurdleLane = (laserLane + 1) % 3;
      this.spawnHurdle(LANES[hurdleLane], chunkZ + 20);

      // Power-up chance in 3rd lane
      const pLane = (laserLane + 2) % 3;
      this.spawnPowerup(LANES[pLane], chunkZ + 10);
    } else {
      // Pattern C: Coin Arches + Barrier
      const lane = Math.floor(Math.random() * 3);
      this.spawnCoinArch(LANES[lane], chunkZ);

      const bLane = (lane + 1) % 3;
      this.spawnHurdle(LANES[bLane], chunkZ + 12);
    }

    // Always spawn coin trails along open paths
    const coinLane = Math.floor(Math.random() * 3);
    for (let z = 5; z < this.segmentLength - 5; z += 4) {
      this.spawnCoin(LANES[coinLane], zStart + z, 1.2);
    }
  }

  spawnTrain(x, z) {
    const length = 24;
    const height = 3.4;
    const group = new THREE.Group();
    group.position.set(x, height / 2, z + length / 2);

    // Train Body
    const bodyGeo = new THREE.BoxGeometry(3.0, height, length);
    const body = new THREE.Mesh(bodyGeo, this.trainMat);
    group.add(body);

    // Front Sloped Nose / Ramp (Allows jumping up onto train roof!)
    const rampGeo = new THREE.BoxGeometry(3.0, 1.5, 3.5);
    const ramp = new THREE.Mesh(rampGeo, this.trainMat);
    ramp.position.set(0, -0.9, -length / 2 - 1.5);
    ramp.rotation.x = -Math.PI / 8;
    group.add(ramp);

    // Glowing Windows
    const winGeo = new THREE.BoxGeometry(3.04, 0.8, length - 4);
    const win = new THREE.Mesh(winGeo, this.trainWindowMat);
    win.position.set(0, 0.4, 0);
    group.add(win);

    // Front Headlight
    const lightGeo = new THREE.BoxGeometry(2.4, 0.4, 0.2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0, 0, -length / 2 - 0.1);
    group.add(light);

    this.scene.add(group);
    this.obstacles.push({
      type: 'train',
      mesh: group,
      x,
      zStart: z - 3,
      zEnd: z + length,
      height,
      platformY: height
    });

    // Coins on train rooftop
    for (let cz = z + 4; cz < z + length - 4; cz += 4) {
      this.spawnCoin(x, cz, height + 1.2);
    }
  }

  spawnHurdle(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.7, z);

    // Barrier Crossbar (Requires Jump)
    const barGeo = new THREE.BoxGeometry(3.2, 1.4, 0.4);
    const bar = new THREE.Mesh(barGeo, this.barrierMat);
    group.add(bar);

    // Hazard Stripes
    const stripeGeo = new THREE.BoxGeometry(3.24, 0.3, 0.44);
    const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    group.add(stripe);

    this.scene.add(group);
    this.obstacles.push({
      type: 'hurdle',
      mesh: group,
      x,
      zStart: z - 0.6,
      zEnd: z + 0.6,
      height: 1.4,
      platformY: 0
    });
  }

  spawnLaserGate(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 2.2, z);

    // High Laser Beam (Requires Slide under)
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 16);
    const beam = new THREE.Mesh(beamGeo, this.laserMat);
    beam.rotation.z = Math.PI / 2;
    group.add(beam);

    // Side Posts
    [-1.6, 1.6].forEach(px => {
      const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 4, 16);
      const post = new THREE.Mesh(postGeo, this.railMat);
      post.position.set(px, 0, 0);
      group.add(post);
    });

    this.scene.add(group);
    this.obstacles.push({
      type: 'laser',
      mesh: group,
      x,
      zStart: z - 0.6,
      zEnd: z + 0.6,
      minY: 1.3,
      maxY: 3.2,
      platformY: 0
    });
  }

  spawnCoin(x, z, y = 1.2) {
    const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.15, 16);
    const coin = new THREE.Mesh(geo, this.coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, y, z);
    this.scene.add(coin);
    this.coins.push({ mesh: coin, x, y, z, collected: false });
  }

  spawnCoinArch(x, zStart) {
    for (let i = 0; i < 7; i++) {
      const cz = zStart + i * 3.5;
      const cy = 1.2 + Math.sin((i / 6) * Math.PI) * 4.5;
      this.spawnCoin(x, cz, cy);
    }
  }

  spawnPowerup(x, z) {
    const types = ['jetpack', 'magnet', 'multiplier', 'shield', 'superjump'];
    const type = types[Math.floor(Math.random() * types.length)];

    let color = 0x38bdf8;
    if (type === 'jetpack') color = 0xef4444;
    else if (type === 'magnet') color = 0xfacc15;
    else if (type === 'multiplier') color = 0xa855f7;
    else if (type === 'shield') color = 0x10b981;

    const geo = new THREE.OctahedronGeometry(0.8, 0);
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.6, z);

    this.scene.add(mesh);
    this.powerups.push({ mesh, type, x, y: 1.6, z, collected: false });
  }

  update(playerZ) {
    // 1. Spawn new segments as player advances
    if (playerZ + (this.visibleSegments - 2) * this.segmentLength > this.lastSpawnZ) {
      this.spawnSegment(this.lastSpawnZ);
      this.lastSpawnZ += this.segmentLength;
    }

    // 2. Remove old distant segments behind player
    while (this.segments.length > 0 && this.segments[0].zEnd < playerZ - 30) {
      const old = this.segments.shift();
      this.scene.remove(old.group);
    }

    // 3. Remove old obstacles
    this.obstacles = this.obstacles.filter(obs => {
      if (obs.zEnd < playerZ - 30) {
        this.scene.remove(obs.mesh);
        return false;
      }
      return true;
    });

    // 4. Animate Coins & Powerups
    this.coins.forEach(c => {
      if (!c.collected) {
        c.mesh.rotation.z += 0.05;
      }
    });

    this.powerups.forEach(p => {
      if (!p.collected) {
        p.mesh.rotation.y += 0.04;
        p.mesh.rotation.x += 0.03;
      }
    });
  }
}
