// 3D Cyber Hoverboarder Player Character with Kinematics & Hitboxes
/* global THREE */

export const LANE_WIDTH = 3.5;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

export class CyberSurfer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.laneIndex = 1; // 0 = Left, 1 = Center, 2 = Right
    this.targetX = LANES[1];
    this.x = this.targetX;
    this.y = 0;
    this.z = 0;

    // Movement state
    this.vy = 0;
    this.gravity = -0.038;
    this.jumpForce = 0.72;
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.maxSlideTime = 40;
    this.currentPlatformY = 0; // For running on top of trains!

    // Power-up States
    this.jetpackTimer = 0;
    this.magnetTimer = 0;
    this.multiplierTimer = 0;
    this.hasShield = false;
    this.superJumpTimer = 0;

    this.build3DModel();
    this.scene.add(this.group);
  }

  build3DModel() {
    // 1. Sleek Neon Hoverboard
    const boardGeo = new THREE.BoxGeometry(1.2, 0.15, 2.4);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8
    });
    this.board = new THREE.Mesh(boardGeo, boardMat);
    this.board.position.y = 0.25;
    this.group.add(this.board);

    // Board Neon Edge Stripes
    const edgeGeo = new THREE.BoxGeometry(1.24, 0.08, 2.44);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    this.board.add(edge);

    // Board Thruster Glow (bottom)
    const thrusterGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 16);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const thrusterF = new THREE.Mesh(thrusterGeo, thrusterMat);
    thrusterF.position.set(0, -0.1, 0.6);
    this.board.add(thrusterF);
    const thrusterB = new THREE.Mesh(thrusterGeo, thrusterMat);
    thrusterB.position.set(0, -0.1, -0.6);
    this.board.add(thrusterB);

    // 2. Surfer Body
    this.characterMesh = new THREE.Group();
    this.characterMesh.position.y = 0.4;

    // Torso / Jacket
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.1, 0.6);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 1.1;
    this.characterMesh.add(this.torso);

    // Cyber Helmet & Glowing Visor
    const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.95;
    this.characterMesh.add(this.head);

    const visorGeo = new THREE.BoxGeometry(0.68, 0.22, 0.3);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.05, 0.24);
    this.head.add(visor);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.55, 1.1, 0);
    this.characterMesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.55, 1.1, 0);
    this.characterMesh.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.25, 0.45, 0);
    this.characterMesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.25, 0.45, 0);
    this.characterMesh.add(this.rightLeg);

    this.group.add(this.characterMesh);

    // 3. Shield Sphere Mesh
    const shieldGeo = new THREE.SphereGeometry(1.8, 24, 24);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = 1.3;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // 4. Jetpack Mesh
    const jetpackGeo = new THREE.BoxGeometry(0.7, 0.9, 0.35);
    const jetpackMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7 });
    this.jetpackMesh = new THREE.Mesh(jetpackGeo, jetpackMat);
    this.jetpackMesh.position.set(0, 1.2, -0.45);
    this.jetpackMesh.visible = false;
    this.characterMesh.add(this.jetpackMesh);
  }

  moveLeft(audio) {
    if (this.laneIndex > 0) {
      this.laneIndex--;
      this.targetX = LANES[this.laneIndex];
      if (audio) audio.playLaneSwitch();
    }
  }

  moveRight(audio) {
    if (this.laneIndex < 2) {
      this.laneIndex++;
      this.targetX = LANES[this.laneIndex];
      if (audio) audio.playLaneSwitch();
    }
  }

  jump(audio) {
    if (this.isGrounded && this.jetpackTimer <= 0) {
      const force = this.superJumpTimer > 0 ? this.jumpForce * 1.5 : this.jumpForce;
      this.vy = force;
      this.isGrounded = false;
      this.isSliding = false;
      if (audio) audio.playJump();
    }
  }

  slide(audio) {
    if (this.jetpackTimer <= 0) {
      this.isSliding = true;
      this.slideTimer = this.maxSlideTime;
      if (!this.isGrounded) {
        // Fast-drop downwards
        this.vy = -0.6;
      }
      if (audio) audio.playSlide();
    }
  }

  update(worldZ) {
    this.z = worldZ;

    // 1. Smooth Lane X Lerp & Banking Tilt
    const dx = this.targetX - this.x;
    this.x += dx * 0.22;
    this.group.rotation.z = -dx * 0.12; // Bank into the turn

    // 2. Jetpack Altitude Overdrive
    if (this.jetpackTimer > 0) {
      this.jetpackTimer--;
      this.jetpackMesh.visible = true;
      const targetY = 9.5;
      this.y += (targetY - this.y) * 0.1;
      this.isGrounded = false;
    } else {
      this.jetpackMesh.visible = false;

      // Vertical Gravity & Platforms
      if (!this.isGrounded) {
        this.vy += this.gravity;
        this.y += this.vy;

        // Ground / Train Platform Landing
        if (this.y <= this.currentPlatformY) {
          this.y = this.currentPlatformY;
          this.vy = 0;
          this.isGrounded = true;
        }
      } else {
        // If walked off a train roof, begin falling
        if (this.y > this.currentPlatformY) {
          this.isGrounded = false;
        } else {
          this.y = this.currentPlatformY;
        }
      }
    }

    // 3. Slide crouching animation & hitbox
    if (this.isSliding) {
      this.slideTimer--;
      this.characterMesh.scale.set(1.2, 0.45, 1.2);
      this.characterMesh.position.y = 0.15;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.characterMesh.scale.set(1, 1, 1);
        this.characterMesh.position.y = 0.4;
      }
    } else {
      this.characterMesh.scale.set(1, 1, 1);
      this.characterMesh.position.y = 0.4;
    }

    // 4. Update Power-up Timers
    if (this.magnetTimer > 0) this.magnetTimer--;
    if (this.multiplierTimer > 0) this.multiplierTimer--;
    if (this.superJumpTimer > 0) this.superJumpTimer--;

    this.shieldMesh.visible = this.hasShield;
    if (this.hasShield) {
      this.shieldMesh.rotation.y += 0.05;
    }

    // 5. Idle Hoverboard Bobbing
    const hoverBob = Math.sin(Date.now() * 0.008) * 0.08;
    this.group.position.set(this.x, this.y + hoverBob, this.z);
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      width: 1.2,
      height: this.isSliding ? 0.9 : 2.2,
      depth: 1.6
    };
  }
}
