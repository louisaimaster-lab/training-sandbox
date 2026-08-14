// Animated Cyber-Enforcer Hover Drone Chaser
/* global THREE */

export class CyberChaser {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.targetOffsetZ = -14;
    this.offsetZ = -14;
    this.sirenTimer = 0;

    this.build3DModel();
    this.scene.add(this.group);
  }

  build3DModel() {
    // 1. Heavy Enforcer Hover-Chassis
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.2, 3.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 1.6;
    this.group.add(this.body);

    // Front Searchlight
    const lightGeo = new THREE.CylinderGeometry(0.4, 0.6, 0.5, 16);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.rotation.x = Math.PI / 2;
    light.position.set(0, 1.6, 1.7);
    this.group.add(light);

    // Flashing Siren Bar (Red / Blue)
    const sirenGeo = new THREE.BoxGeometry(1.6, 0.25, 0.4);
    this.sirenMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.siren = new THREE.Mesh(sirenGeo, this.sirenMat);
    this.siren.position.set(0, 2.3, 0);
    this.group.add(this.siren);

    // Dual Heavy Thrusters
    const thrustGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 16);
    const thrustMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const tL = new THREE.Mesh(thrustGeo, thrustMat);
    tL.rotation.x = Math.PI / 2;
    tL.position.set(-0.8, 1.4, -1.8);
    this.group.add(tL);

    const tR = new THREE.Mesh(thrustGeo, thrustMat);
    tR.rotation.x = Math.PI / 2;
    tR.position.set(0.8, 1.4, -1.8);
    this.group.add(tR);
  }

  triggerStumble() {
    // Surge forward right behind the player!
    this.offsetZ = -5.5;
  }

  update(player) {
    this.sirenTimer++;
    if (Math.floor(this.sirenTimer / 12) % 2 === 0) {
      this.sirenMat.color.setHex(0xef4444);
    } else {
      this.sirenMat.color.setHex(0x3b82f6);
    }

    // Slowly drift back to safe distance if not stumbling
    this.offsetZ += (this.targetOffsetZ - this.offsetZ) * 0.02;

    const bob = Math.sin(this.sirenTimer * 0.1) * 0.15;
    const targetX = player.x * 0.85;

    this.group.position.set(
      this.group.position.x + (targetX - this.group.position.x) * 0.1,
      player.y + bob + 0.2,
      player.z + this.offsetZ
    );
  }
}
