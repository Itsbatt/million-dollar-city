import * as THREE from '/vendor/three.module.js';

export class PedestrianManager {
  constructor(scene, cityColliders = []) {
    this.scene = scene;
    this.colliders = cityColliders;
    this.pedestrians = [];
    this.maxPedestrians = 28;

    this.spawnInitialCrowd();

    window.addEventListener('crime:committed', (e) => {
      this.panicAllNear(e.detail.origin, 35);
    });
  }

  spawnInitialCrowd() {
    const sidewalkX = [-14.5, 14.5];
    const colors = [0x264653, 0x2a9d8f, 0xe76f51, 0x1d3557, 0x457b9d, 0x6d597a];

    for (let i = 0; i < this.maxPedestrians; i++) {
      const sx = sidewalkX[i % 2];
      const sz = -140 + i * 18 + (Math.random() - 0.5) * 8;
      const color = colors[i % colors.length];
      this.createPedestrian(sx, sz, color);
    }
  }

  createPedestrian(x, z, shirtColor) {
    const pedGroup = new THREE.Group();
    pedGroup.position.set(x, 0, z);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.8 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.8 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0x050505 });

    // Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), pantsMat);
    pelvis.position.y = 0.9;
    pelvis.castShadow = true;
    pedGroup.add(pelvis);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.24), clothesMat);
    torso.position.y = 1.2;
    torso.castShadow = true;
    pedGroup.add(torso);

    // Head & Hair
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skinMat);
    head.position.y = 1.55;
    head.castShadow = true;
    pedGroup.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.24), hairMat);
    hair.position.y = 1.68;
    pedGroup.add(hair);

    // Left & Right Arms
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.1), clothesMat);
    leftArm.position.set(-0.26, 1.18, 0);
    pedGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.1), clothesMat);
    rightArm.position.set(0.26, 1.18, 0);
    pedGroup.add(rightArm);

    // Left & Right Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.16), pantsMat);
    leftLeg.position.set(-0.1, 0.42, 0);
    pedGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.16), pantsMat);
    rightLeg.position.set(0.1, 0.42, 0);
    pedGroup.add(rightLeg);

    this.scene.add(pedGroup);

    const pedData = {
      mesh: pedGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      pos: pedGroup.position,
      speed: 1.6 + Math.random() * 0.8,
      direction: Math.random() > 0.5 ? 1 : -1,
      state: 'WALKING', // 'WALKING', 'FLEEING', 'DEAD'
      health: 45,
      isDead: false,
      animTime: Math.random() * 10,
      getPosition() {
        return pedGroup.position;
      },
      takeDamage(amount) {
        if (this.isDead) return;
        this.health -= amount;
        if (this.health <= 0) {
          this.isDead = true;
          this.state = 'DEAD';
          pedGroup.rotation.x = -Math.PI / 2;
          pedGroup.position.y = 0.12;
          window.dispatchEvent(new CustomEvent('pedestrian:killed', {
            detail: { pos: pedGroup.position.clone(), reward: Math.floor(Math.random() * 80) + 25 }
          }));
        } else {
          this.state = 'FLEEING';
          this.direction = pedGroup.position.z > 0 ? 1 : -1;
          pedGroup.rotation.y = this.direction === 1 ? 0 : Math.PI;
        }
      }
    };

    this.pedestrians.push(pedData);
    return pedData;
  }

  update(delta, playerPos) {
    for (const ped of this.pedestrians) {
      if (ped.isDead) continue;

      ped.animTime += delta;

      if (ped.state === 'WALKING') {
        // Walk along Z sidewalk
        ped.pos.z += ped.speed * ped.direction * delta;

        // Turn around at expanded street borders
        if (ped.pos.z > 280) {
          ped.direction = -1;
          ped.mesh.rotation.y = Math.PI;
        } else if (ped.pos.z < -280) {
          ped.direction = 1;
          ped.mesh.rotation.y = 0;
        }

        // Walk swing animation
        const swing = Math.sin(ped.animTime * 6) * 0.45;
        ped.leftLeg.rotation.x = swing;
        ped.rightLeg.rotation.x = -swing;
        ped.leftArm.rotation.x = -swing;
        ped.rightArm.rotation.x = swing;
      } else if (ped.state === 'FLEEING') {
        // Run away faster
        const fleeSpeed = 5.2;
        ped.pos.z += fleeSpeed * ped.direction * delta;

        const runSwing = Math.sin(ped.animTime * 14) * 0.9;
        ped.leftLeg.rotation.x = runSwing;
        ped.rightLeg.rotation.x = -runSwing;
        ped.leftArm.rotation.x = -runSwing;
        ped.rightArm.rotation.x = runSwing;
        ped.leftArm.rotation.z = 0.5;
        ped.rightArm.rotation.z = -0.5;
      }
    }
  }

  panicAllNear(origin, radius = 30) {
    for (const ped of this.pedestrians) {
      if (ped.isDead) continue;
      if (!origin || ped.pos.distanceTo(origin) < radius) {
        ped.state = 'FLEEING';
        ped.direction = ped.pos.z > 0 ? 1 : -1;
        ped.mesh.rotation.y = ped.direction === 1 ? 0 : Math.PI;
      }
    }
  }

  getPedestrians() {
    return this.pedestrians;
  }
}
