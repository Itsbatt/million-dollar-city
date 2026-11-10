// ParticleManager.js - Zero-Allocation Pooled Particle Engine for 60 FPS

import * as THREE from '/vendor/three.module.js';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.maxParticles = 32;
    this.pool = [];
    this.nextIndex = 0;

    // Shared low-poly geometries (minimal vertex counts for low-end iGPUs)
    this.smokeGeo = new THREE.SphereGeometry(0.25, 4, 4);
    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.5
    });

    this.sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.95
    });

    this.bloodGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    this.bloodMat = new THREE.MeshBasicMaterial({
      color: 0xcc0022
    });

    // Pre-spawn pooled meshes in scene (hidden initially)
    for (let i = 0; i < this.maxParticles; i++) {
      const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
        type: 'smoke'
      });
    }
  }

  getAvailableParticle() {
    for (let i = 0; i < this.maxParticles; i++) {
      const idx = (this.nextIndex + i) % this.maxParticles;
      if (!this.pool[idx].active) {
        this.nextIndex = (idx + 1) % this.maxParticles;
        return this.pool[idx];
      }
    }
    // Recycle oldest active particle
    const p = this.pool[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % this.maxParticles;
    return p;
  }

  emitTireSmoke(position, velocity) {
    const p = this.getAvailableParticle();
    if (!p) return;

    p.mesh.geometry = this.smokeGeo;
    p.mesh.material = this.smokeMat;
    p.mesh.position.copy(position);
    p.mesh.position.x += (Math.random() - 0.5) * 0.25;
    p.mesh.position.z += (Math.random() - 0.5) * 0.25;
    p.mesh.position.y += 0.15;

    const s = 0.5 + Math.random() * 0.4;
    p.mesh.scale.set(s, s, s);
    p.mesh.visible = true;

    p.velocity.set(
      (Math.random() - 0.5) * 0.4 + (velocity?.x || 0) * 0.15,
      Math.random() * 0.6 + 0.3,
      (Math.random() - 0.5) * 0.4 + (velocity?.z || 0) * 0.15
    );
    p.life = 0;
    p.maxLife = 0.6 + Math.random() * 0.3;
    p.type = 'smoke';
    p.active = true;
  }

  emitCrashSparks(position, count = 6) {
    const safeCount = Math.min(count, 6);
    for (let i = 0; i < safeCount; i++) {
      const p = this.getAvailableParticle();
      if (!p) break;

      p.mesh.geometry = this.sparkGeo;
      p.mesh.material = this.sparkMat;
      p.mesh.position.copy(position);
      p.mesh.scale.set(1, 1, 1);
      p.mesh.visible = true;

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 4.0;
      p.velocity.set(Math.cos(angle) * speed, Math.random() * 3.5 + 1.0, Math.sin(angle) * speed);
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.2;
      p.type = 'spark';
      p.active = true;
    }
  }

  emitBloodImpact(position, count = 5) {
    const safeCount = Math.min(count, 5);
    for (let i = 0; i < safeCount; i++) {
      const p = this.getAvailableParticle();
      if (!p) break;

      p.mesh.geometry = this.bloodGeo;
      p.mesh.material = this.bloodMat;
      p.mesh.position.copy(position);
      p.mesh.scale.set(1, 1, 1);
      p.mesh.visible = true;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      p.velocity.set(Math.cos(angle) * speed, Math.random() * 2.5 + 0.5, Math.sin(angle) * speed);
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.25;
      p.type = 'blood';
      p.active = true;
    }
  }

  emitHitFeedback(position, isHeadshot = false) {
    if (isHeadshot) {
      this.emitCrashSparks(position, 6);
    }
    this.emitBloodImpact(position, isHeadshot ? 5 : 3);
  }

  update(delta) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += delta;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      // Physics integration
      p.mesh.position.addScaledVector(p.velocity, delta);

      if (p.type === 'smoke') {
        const progress = p.life / p.maxLife;
        const s = 0.8 + progress * 1.5;
        p.mesh.scale.set(s, s, s);
        p.velocity.y += delta * 0.3;
      } else if (p.type === 'spark' || p.type === 'blood') {
        p.velocity.y -= delta * 14; // gravity
        if (p.mesh.position.y < 0.05) {
          p.mesh.position.y = 0.05;
          p.velocity.x *= 0.5;
          p.velocity.z *= 0.5;
          p.velocity.y = 0;
        }
      }
    }
  }
}
