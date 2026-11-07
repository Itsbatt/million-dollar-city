import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';
import { Vehicle } from './Vehicle.js';

export class PoliceManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.wantedLevel = 0; // 0 to 5
    this.isFlashing = false;
    this.evasionTimer = 0;
    this.evasionRequiredTime = 12.0; // 12s to clear wanted level
    this.policeUnits = [];

    window.addEventListener('crime:committed', (e) => {
      this.addCrime(e.detail.stars || 1);
    });
  }

  addCrime(starsToAdd) {
    const prev = this.wantedLevel;
    this.wantedLevel = Math.min(5, Math.max(this.wantedLevel, starsToAdd));
    this.evasionTimer = 0;
    this.isFlashing = false;

    if (this.wantedLevel > 0 && prev === 0) {
      AudioManager.startPoliceSiren();
      console.log(`[Police] WANTED LEVEL ${this.wantedLevel} ★★★★★! LSPD dispatching units!`);
    }

    this.spawnPoliceReinforcements();
    this.notifyWantedUpdate();
  }

  spawnPoliceReinforcements() {
    if (this.policeUnits.length >= Math.min(3, this.wantedLevel)) return;

    // Spawn cruiser down the street
    const pPos = this.player.getPosition();
    const spawnZ = pPos.z > 0 ? pPos.z - 70 : pPos.z + 70;
    const spawnX = pPos.x > 0 ? 5.5 : -5.5;

    const policeCar = new Vehicle(this.scene, 'police', { x: spawnX, y: 0, z: spawnZ });
    this.policeUnits.push(policeCar);
  }

  update(delta) {
    if (this.wantedLevel === 0) {
      this.clearPoliceUnits();
      return;
    }

    const playerPos = this.player.getPosition();
    let anyPoliceNear = false;

    // Update AI for active police cruisers
    for (const car of this.policeUnits) {
      const carPos = car.getPosition();
      const dist = carPos.distanceTo(playerPos);

      if (dist < 60) anyPoliceNear = true;

      // Simple pursuit AI: drive toward player
      const dir = new THREE.Vector3().subVectors(playerPos, carPos).normalize();
      const targetAngle = Math.atan2(dir.x, dir.z);

      car.mesh.rotation.y = THREE.MathUtils.lerp(car.mesh.rotation.y, targetAngle, delta * 2.5);
      car.currentSpeed = Math.min(car.maxSpeed * 0.85, car.currentSpeed + 16 * delta);

      // Move forward
      const forward = new THREE.Vector3(Math.sin(car.mesh.rotation.y), 0, Math.cos(car.mesh.rotation.y));
      car.position.addScaledVector(forward, car.currentSpeed * delta);
      car.mesh.position.copy(car.position);

      // Ramming damage
      if (dist < 3.2) {
        this.player.takeDamage(12 * delta);
      }
    }

    // Evasion logic
    if (!anyPoliceNear) {
      this.isFlashing = true;
      this.evasionTimer += delta;
      if (this.evasionTimer >= this.evasionRequiredTime) {
        this.clearWantedLevel();
      }
    } else {
      this.isFlashing = false;
      this.evasionTimer = 0;
    }

    this.notifyWantedUpdate();
  }

  clearWantedLevel() {
    this.wantedLevel = 0;
    this.isFlashing = false;
    this.evasionTimer = 0;
    AudioManager.stopPoliceSiren();
    this.clearPoliceUnits();
    this.notifyWantedUpdate();
    console.log('[Police] Evaded pursuit! Wanted level cleared.');
  }

  clearPoliceUnits() {
    for (const car of this.policeUnits) {
      this.scene.remove(car.mesh);
    }
    this.policeUnits = [];
  }

  notifyWantedUpdate() {
    window.dispatchEvent(new CustomEvent('wanted:updated', {
      detail: {
        stars: this.wantedLevel,
        isFlashing: this.isFlashing
      }
    }));
  }

  getWantedLevel() {
    return this.wantedLevel;
  }
}
