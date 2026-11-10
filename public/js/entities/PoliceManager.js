// PoliceManager.js - Dynamic 5-Star LSPD Police Pursuit & Arrest Engine for Million Dollar City
import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';
import { Vehicle } from './Vehicle.js';

// Pre-allocated scratch vectors for zero-GC police AI
const _tempPlayerVel = new THREE.Vector3();
const _tempTargetPos = new THREE.Vector3();

export class PoliceManager {
  constructor(scene, player, colliders = []) {
    this.scene = scene;
    this.player = player;
    this.colliders = colliders;
    this.wantedLevel = 0; // 0 to 5
    this.isFlashing = false;
    this.evasionTimer = 0;
    this.evasionRequiredTime = 12.0; // 12 seconds keeping distance to escape
    this.policeUnits = [];
    this.reinforceCooldown = 0;
    this.arrestTimer = 0;
    this.isArresting = false;

    window.addEventListener('crime:committed', (e) => {
      this.addCrime(e.detail?.stars || 1);
    });

    window.addEventListener('police:rammed', () => {
      this.addCrime(3);
    });
  }

  setColliders(colliders) {
    this.colliders = colliders;
  }

  addCrime(starsToAdd) {
    const prev = this.wantedLevel;
    this.wantedLevel = Math.min(5, Math.max(this.wantedLevel, starsToAdd));
    this.evasionTimer = 0;
    this.isFlashing = false;
    this.arrestTimer = 0;

    if (this.wantedLevel > 0 && prev === 0) {
      AudioManager.startPoliceSiren();
      console.log(`[Police] ALERTA LSPD: Nivel de búsqueda ${this.wantedLevel} ★★★★★ desplegado.`);
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: `🚨 ¡BÚSQUEDA POLICIAL LSPD: ${this.wantedLevel} ESTRELLAS! Escapa o serás arrestado.`, type: 'danger' }
      }));
    }

    this.spawnPoliceReinforcements();
    this.notifyWantedUpdate();
  }

  spawnPoliceReinforcements() {
    if (this.wantedLevel <= 0 || this.isArresting) return;
    const maxUnits = Math.min(4, Math.max(1, this.wantedLevel));
    if (this.policeUnits.length >= maxUnits) return;

    const pPos = this.player.getPosition();
    if (!pPos) return;

    // Determine player heading and forward direction
    let playerHeading = 0;
    if (this.player.inVehicle && this.player.currentVehicle) {
      playerHeading = this.player.currentVehicle.mesh.rotation.y;
    } else {
      playerHeading = this.player.heading || 0;
    }

    const forward = new THREE.Vector3(Math.sin(playerHeading), 0, Math.cos(playerHeading));
    const backward = forward.clone().negate();

    // Responsive Spawning: 38 to 50 meters away (either in front intercepting or behind chasing)
    const isInterception = Math.random() > 0.5;
    const spawnDir = isInterception ? forward : backward;
    const spawnDist = 38 + (Math.random() * 12);
    const spawnPos = pPos.clone().addScaledVector(spawnDir, spawnDist);

    // Keep within road boulevard width (X between -14 and +14)
    spawnPos.x = THREE.MathUtils.clamp(spawnPos.x + (Math.random() > 0.5 ? 4.5 : -4.5), -14, 14);
    spawnPos.y = 0;

    // Spawn facing toward player
    const angleToPlayer = Math.atan2(pPos.x - spawnPos.x, pPos.z - spawnPos.z);

    const policeCar = new Vehicle(this.scene, 'police', {
      x: spawnPos.x,
      y: 0,
      z: spawnPos.z,
      rotY: angleToPlayer
    });

    // Initialize cruiser AI state
    policeCar.aiState = {
      stuckTimer: 0,
      reverseTimer: 0,
      isReversing: false,
      lastPos: policeCar.position.clone(),
      steerAngle: 0
    };

    // Attach dynamic flashing siren light to roof
    this.setupPoliceSirenFX(policeCar);

    this.policeUnits.push(policeCar);
    console.log(`[Police] Patrulla en persecución desplegada en (${spawnPos.x.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
  }

  setupPoliceSirenFX(car) {
    if (!car || !car.mesh) return;
    const sirenPointLight = new THREE.PointLight(0xff0022, 2.0, 20);
    sirenPointLight.position.set(0, 1.4, -0.2);
    car.mesh.add(sirenPointLight);
    car.dynamicSirenLight = sirenPointLight;
  }

  update(delta) {
    if (this.isArresting) return;

    if (this.wantedLevel === 0) {
      if (this.policeUnits.length > 0) {
        this.clearPoliceUnits();
      }
      return;
    }

    // Cooldown check for reinforcements
    this.reinforceCooldown += delta;
    if (this.reinforceCooldown > 6.0) {
      this.reinforceCooldown = 0;
      this.spawnPoliceReinforcements();
    }

    const playerPos = this.player.getPosition();
    if (!playerPos) return;

    const playerInVeh = this.player.inVehicle && this.player.currentVehicle;
    _tempPlayerVel.set(0, 0, 0);
    let playerSpeed = 0;
    if (playerInVeh) {
      const v = this.player.currentVehicle;
      playerSpeed = Math.abs(v.currentSpeed || 0);
      _tempPlayerVel.set(Math.sin(v.mesh.rotation.y), 0, Math.cos(v.mesh.rotation.y)).multiplyScalar(playerSpeed);
    } else if (this.player.velocity) {
      playerSpeed = this.player.velocity.length();
      _tempPlayerVel.copy(this.player.velocity);
    }

    let anyPoliceNear = false;
    let closestDist = Infinity;
    const unitsToKeep = [];

    // Update each cruiser's pursuit AI
    for (const car of this.policeUnits) {
      const carPos = car.getPosition();
      const distToPlayer = carPos.distanceTo(playerPos);
      if (distToPlayer < closestDist) closestDist = distToPlayer;

      // Cruisers within 55m are actively engaging the player
      if (distToPlayer < 55.0) {
        anyPoliceNear = true;
      }

      // Despawn if outrun by more than 160 meters
      if (distToPlayer > 160.0) {
        this.removeCruiserMesh(car);
        continue;
      }

      // Initialize AI state if missing
      if (!car.aiState) {
        car.aiState = {
          stuckTimer: 0,
          reverseTimer: 0,
          isReversing: false,
          lastPos: car.position.clone(),
          steerAngle: 0
        };
      }

      const ai = car.aiState;

      // Interception Target Point without GC allocation
      const leadFactor = THREE.MathUtils.clamp(distToPlayer / 35.0, 0.1, 0.6);
      _tempTargetPos.copy(playerPos).addScaledVector(_tempPlayerVel, leadFactor);

      // Vector to target in XZ plane
      const dirX = _tempTargetPos.x - carPos.x;
      const dirZ = _tempTargetPos.z - carPos.z;
      const targetAngle = Math.atan2(dirX, dirZ);

      // Shortest Signed Angle Difference (Normalized to -PI..PI)
      let currentAngle = car.mesh.rotation.y;
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const absDiff = Math.abs(angleDiff);

      // Stuck Detection Against Obstacles / Walls
      const movedDist = carPos.distanceTo(ai.lastPos);
      ai.lastPos.copy(carPos);

      if (ai.isReversing) {
        ai.reverseTimer -= delta;
        if (ai.reverseTimer <= 0) {
          ai.isReversing = false;
          ai.stuckTimer = 0;
        }
      } else if (movedDist < 0.3 * delta && distToPlayer > 5.0 && Math.abs(car.currentSpeed) > 1.5) {
        ai.stuckTimer += delta;
        if (ai.stuckTimer > 0.8) {
          ai.isReversing = true;
          ai.reverseTimer = 1.2;
        }
      } else {
        ai.stuckTimer = Math.max(0, ai.stuckTimer - delta);
      }

      // Pursuit Driving Dynamics
      if (ai.isReversing) {
        const revSpeed = 10.0;
        car.currentSpeed = THREE.MathUtils.lerp(car.currentSpeed, -revSpeed, delta * 5);
        currentAngle -= Math.sign(angleDiff || 1) * delta * 2.2;
        car.mesh.rotation.y = currentAngle;
      } else {
        let turnSpeed = 5.2;
        let targetSpeed = car.maxSpeed || 32.0;

        if (absDiff > 1.5) {
          targetSpeed = 10.0;
          turnSpeed = 6.0;
        } else if (absDiff > 0.6) {
          targetSpeed = 18.0;
          turnSpeed = 5.2;
        } else if (distToPlayer < 7.0 && !playerInVeh) {
          targetSpeed = 8.0;
        }

        // Acceleration / Braking
        if (car.currentSpeed < targetSpeed) {
          car.currentSpeed = Math.min(targetSpeed, car.currentSpeed + 20.0 * delta);
        } else {
          car.currentSpeed = Math.max(targetSpeed, car.currentSpeed - 28.0 * delta);
        }

        // Steer heading toward target
        const turnStep = Math.sign(angleDiff) * Math.min(absDiff, turnSpeed * delta);
        currentAngle += turnStep;
        car.mesh.rotation.y = currentAngle;

        // Visual front wheel steering
        ai.steerAngle = THREE.MathUtils.clamp(angleDiff * 1.5, -0.6, 0.6);
        if (car.frontLeftWheel && car.frontRightWheel) {
          car.frontLeftWheel.rotation.y = ai.steerAngle;
          car.frontRightWheel.rotation.y = ai.steerAngle;
        }
      }

      // Forward Motion & Building Collision Resolution
      const forward = new THREE.Vector3(
        Math.sin(car.mesh.rotation.y),
        0,
        Math.cos(car.mesh.rotation.y)
      );

      const nextPos = car.position.clone().addScaledVector(forward, car.currentSpeed * delta);

      if (this.colliders && this.colliders.length > 0) {
        car.resolveVehicleCollisions(nextPos, this.colliders);
      }

      nextPos.y = 0;
      car.position.copy(nextPos);
      car.mesh.position.copy(car.position);

      // Roll wheels
      const rollDist = (car.currentSpeed * delta) / 0.35;
      if (car.frontLeftWheel?.userData?.rollGroup) {
        car.frontLeftWheel.userData.rollGroup.rotation.x += rollDist;
      }
      if (car.frontRightWheel?.userData?.rollGroup) {
        car.frontRightWheel.userData.rollGroup.rotation.x += rollDist;
      }

      // Flashing Siren Lightbars
      const isRedPhase = (Math.floor(Date.now() / 130) % 2) === 0;
      if (car.sirenLights && car.sirenLights.length >= 2) {
        car.sirenLights[0].material.emissiveIntensity = isRedPhase ? 4.5 : 0.2;
        car.sirenLights[1].material.emissiveIntensity = !isRedPhase ? 4.5 : 0.2;
      }
      if (car.dynamicSirenLight) {
        car.dynamicSirenLight.color.setHex(isRedPhase ? 0xff0022 : 0x0077ff);
        car.dynamicSirenLight.intensity = isRedPhase ? 2.5 : 2.0;
      }

      // Ramming & Interception Damage
      if (distToPlayer < 4.2) {
        if (playerInVeh) {
          AudioManager.playTireSkid(0.3);
          window.dispatchEvent(new CustomEvent('vehicle:crash', {
            detail: { position: carPos.clone(), speed: car.currentSpeed }
          }));
        } else {
          this.player.takeDamage(18 * delta);
        }
      }

      unitsToKeep.push(car);
    }

    this.policeUnits = unitsToKeep;

    // ARREST / BUSTED LOGIC:
    // If police is very close (< 4.5m) and player is cornered/stopped (< 3.0 m/s)
    if (closestDist < 4.5 && playerSpeed < 3.0) {
      this.arrestTimer += delta;
      if (this.arrestTimer >= 2.0) {
        this.triggerArrest('cornered');
        return;
      }
    } else {
      this.arrestTimer = Math.max(0, this.arrestTimer - delta);
    }

    // Evasion & Search Timer:
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

  triggerArrest(reason = 'cornered') {
    if (this.isArresting) return;
    this.isArresting = true;

    const stars = this.wantedLevel || 1;
    const bail = this.calculateBail(stars);

    console.log(`[Police] ¡ARRESTADO POR EL LSPD! Motivo: ${reason}. Estrellas: ${stars}. Fianza: $${bail}`);

    // Stop sirens and clear units
    AudioManager.stopPoliceSiren();
    this.clearPoliceUnits();
    this.wantedLevel = 0;
    this.isFlashing = false;
    this.evasionTimer = 0;
    this.arrestTimer = 0;
    this.notifyWantedUpdate();

    // If in vehicle, exit vehicle
    if (this.player.inVehicle && this.player.currentVehicle) {
      this.player.currentVehicle.exitDriver();
      if (this.player.mesh) this.player.mesh.visible = true;
    }

    // Teleport player to LSPD Central Jail
    const prisonCellPos = { x: -28.0, y: 0, z: -130.0 };
    this.player.respawn(prisonCellPos);

    // Dispatch event to show Jail / Busted Modal
    window.dispatchEvent(new CustomEvent('police:busted', {
      detail: {
        stars,
        bail,
        reason
      }
    }));

    setTimeout(() => {
      this.isArresting = false;
    }, 1000);
  }

  calculateBail(stars = this.wantedLevel) {
    return Math.max(500, (stars || 1) * 500);
  }

  clearWantedLevel() {
    this.wantedLevel = 0;
    this.isFlashing = false;
    this.evasionTimer = 0;
    this.arrestTimer = 0;
    AudioManager.stopPoliceSiren();
    this.clearPoliceUnits();
    this.notifyWantedUpdate();
    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: '🚓 ¡Has despistado a la policía! Nivel de búsqueda eliminado.', type: 'success' }
    }));
  }

  clearPoliceUnits() {
    for (const car of this.policeUnits) {
      this.removeCruiserMesh(car);
    }
    this.policeUnits = [];
  }

  removeCruiserMesh(car) {
    if (!car) return;
    if (car.mesh) {
      this.scene.remove(car.mesh);
    }
  }

  notifyWantedUpdate() {
    window.dispatchEvent(new CustomEvent('police:wanted-update', {
      detail: {
        wantedLevel: this.wantedLevel,
        isFlashing: this.isFlashing,
        evasionProgress: Math.min(1, this.evasionTimer / this.evasionRequiredTime)
      }
    }));
  }

  getWantedLevel() {
    return this.wantedLevel;
  }
}
