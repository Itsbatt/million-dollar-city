import * as THREE from '/vendor/three.module.js';

// Pre-allocated shared geometries for all pedestrians to maximize GPU cache & eliminate redundant allocations
const sharedGeos = {
  pelvis: new THREE.BoxGeometry(0.34, 0.16, 0.22),
  torso: new THREE.BoxGeometry(0.4, 0.44, 0.24),
  head: new THREE.BoxGeometry(0.22, 0.24, 0.22),
  hair: new THREE.BoxGeometry(0.24, 0.1, 0.24),
  arm: new THREE.BoxGeometry(0.1, 0.48, 0.1),
  leg: new THREE.BoxGeometry(0.14, 0.8, 0.16)
};

// Pre-allocated shared materials palette
const sharedMaterials = {
  skin: new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.8 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.8 }),
  shirts: [
    0x264653, 0x2a9d8f, 0xe76f51, 0x1d3557, 0x457b9d, 0x6d597a
  ].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }))
};

export class PedestrianManager {
  constructor(scene, cityColliders = []) {
    this.scene = scene;
    this.colliders = cityColliders;
    this.pedestrians = [];
    this.maxPedestrians = window.__MDC_GRAPHICS_PRESET?.pedestriansMax || 14;

    this.spawnInitialCrowd();

    window.addEventListener('crime:committed', (e) => {
      this.panicAllNear(e.detail.origin, 35);
    });
  }

  spawnInitialCrowd() {
    const sidewalkX = [-14.5, 14.5];

    for (let i = 0; i < this.maxPedestrians; i++) {
      const sx = sidewalkX[i % 2];
      const sz = -140 + i * 18 + (Math.random() - 0.5) * 8;
      const matIndex = i % sharedMaterials.shirts.length;
      this.createPedestrian(sx, sz, matIndex);
    }
  }

  createPedestrian(x, z, shirtMatIndex = 0) {
    const pedGroup = new THREE.Group();
    pedGroup.position.set(x, 0, z);

    const skinMat = sharedMaterials.skin;
    const hairMat = sharedMaterials.hair;
    const clothesMat = sharedMaterials.shirts[shirtMatIndex];
    const pantsMat = sharedMaterials.pants;

    // Pelvis
    const pelvis = new THREE.Mesh(sharedGeos.pelvis, pantsMat);
    pelvis.position.y = 0.9;
    pedGroup.add(pelvis);

    // Torso
    const torso = new THREE.Mesh(sharedGeos.torso, clothesMat);
    torso.position.y = 1.2;
    pedGroup.add(torso);

    // Head & Hair
    const head = new THREE.Mesh(sharedGeos.head, skinMat);
    head.position.y = 1.55;
    pedGroup.add(head);

    const hair = new THREE.Mesh(sharedGeos.hair, hairMat);
    hair.position.y = 1.68;
    pedGroup.add(hair);

    // Left & Right Arms
    const leftArm = new THREE.Mesh(sharedGeos.arm, clothesMat);
    leftArm.position.set(-0.26, 1.18, 0);
    pedGroup.add(leftArm);

    const rightArm = new THREE.Mesh(sharedGeos.arm, clothesMat);
    rightArm.position.set(0.26, 1.18, 0);
    pedGroup.add(rightArm);

    // Left & Right Legs
    const leftLeg = new THREE.Mesh(sharedGeos.leg, pantsMat);
    leftLeg.position.set(-0.1, 0.42, 0);
    pedGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(sharedGeos.leg, pantsMat);
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

          // Alert LSPD Police (2 Stars for homicide)
          window.dispatchEvent(new CustomEvent('crime:committed', {
            detail: { type: 'homicide', stars: 2 }
          }));
          window.dispatchEvent(new CustomEvent('notification:show', {
            detail: { message: '🚨 HOMICIDIO: ¡La policía ha sido enviada tras de ti! (2 Estrellas ⭐⭐)', type: 'danger' }
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

  update(delta, playerPos, activeVehicles = []) {
    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;

    // Check if moving vehicles hit pedestrians (atropellos)
    if (activeVehicles && activeVehicles.length > 0) {
      for (const v of activeVehicles) {
        if (!v || Math.abs(v.currentSpeed || 0) < 3.0) continue;
        const vx = v.position.x;
        const vz = v.position.z;
        for (const ped of this.pedestrians) {
          if (ped.isDead) continue;
          const dx = ped.pos.x - vx;
          const dz = ped.pos.z - vz;
          if (Math.abs(dx) < 1.35 && Math.abs(dz) < 2.2) {
            ped.takeDamage(100);
            AudioManager.playPunch();
          }
        }
      }
    }

    for (const ped of this.pedestrians) {
      if (ped.isDead) continue;

      // Distance-based LOD & Frustum culling optimization
      const dx = ped.pos.x - px;
      const dz = ped.pos.z - pz;
      const distSq = dx * dx + dz * dz;

      // > 115m: Hide completely (skip all render passes & matrix calculations)
      if (distSq > 13225) { // 115^2
        if (ped.mesh.visible) ped.mesh.visible = false;
        // Still move in background along street at low rate
        ped.pos.z += ped.speed * ped.direction * delta;
        if (ped.pos.z > 280) ped.direction = -1;
        else if (ped.pos.z < -280) ped.direction = 1;
        continue;
      }

      if (!ped.mesh.visible) ped.mesh.visible = true;

      ped.animTime += delta;

      if (ped.state === 'WALKING') {
        // Walk along Z sidewalk
        ped.pos.z += ped.speed * ped.direction * delta;

        // Turn around at street borders
        if (ped.pos.z > 280) {
          ped.direction = -1;
          ped.mesh.rotation.y = Math.PI;
        } else if (ped.pos.z < -280) {
          ped.direction = 1;
          ped.mesh.rotation.y = 0;
        }

        // Only compute trigonometric limb swing if within 60m
        if (distSq < 3600) { // 60^2
          const swing = Math.sin(ped.animTime * 6) * 0.45;
          ped.leftLeg.rotation.x = swing;
          ped.rightLeg.rotation.x = -swing;
          ped.leftArm.rotation.x = -swing;
          ped.rightArm.rotation.x = swing;
        }
      } else if (ped.state === 'FLEEING') {
        // Run away faster
        const fleeSpeed = 5.2;
        ped.pos.z += fleeSpeed * ped.direction * delta;

        if (distSq < 3600) {
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
