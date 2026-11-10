import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';

// Pre-allocated scratch vectors for zero-GC vehicle physics
const _forwardVec = new THREE.Vector3();
const _nextPosVec = new THREE.Vector3();

export class Vehicle {
  constructor(scene, type = 'supercar', initialPos = { x: 5, y: 0, z: 25 }, options = {}) {
    this.scene = scene;
    this.type = type;
    this.mesh = new THREE.Group();
    this.mesh.name = `Vehicle_${type}_${Math.floor(Math.random() * 1000)}`;

    // Vehicle Specs
    this.initSpecs(type, options);

    // Dynamic State
    this.position = new THREE.Vector3(initialPos.x, initialPos.y || 0, initialPos.z);
    this.velocity = new THREE.Vector3();
    this.currentSpeed = 0; // m/s
    this.driftFactor = 0;
    this.steeringAngle = 0; // radians
    this.targetSteering = 0;
    this.isBraking = false;
    this.isHandbraking = false;
    this.isDrifting = false;
    this.isOccupied = false;
    this.driver = null;

    // Visual animation parts
    this.frontLeftWheel = null;
    this.frontRightWheel = null;
    this.rearLeftWheel = null;
    this.rearRightWheel = null;
    this.headlights = [];
    this.taillightMeshes = [];
    this.sirenLights = [];
    this.bodyMeshGroup = null;

    // Suspension & Chassis dynamics
    this.pitch = 0;
    this.roll = 0;

    // Build 3D mesh
    this.buildVehicleModel();
    this.scene.add(this.mesh);

    this.mesh.position.copy(this.position);
    if (initialPos.rotY) this.mesh.rotation.y = initialPos.rotY;
  }

  initSpecs(type, options) {
    if (type === 'supercar') {
      this.name = 'Pegassi Viper GT';
      this.maxSpeed = 46.0; // ~165 km/h
      this.acceleration = 24.0;
      this.reverseSpeed = 12.0;
      this.brakingForce = 34.0;
      this.handling = 1.85;
      this.color = options.color || 0x00e5ff; // Neon Cyan
      this.weight = 1350;
    } else if (type === 'muscle') {
      this.name = 'Vapid Dominator SS';
      this.maxSpeed = 42.0; // ~150 km/h
      this.acceleration = 26.0;
      this.reverseSpeed = 11.0;
      this.brakingForce = 28.0;
      this.handling = 1.6;
      this.color = options.color || 0xd62828; // Crimson Red
      this.weight = 1600;
    } else if (type === 'suv') {
      this.name = 'Benefactor Dubsta 4x4';
      this.maxSpeed = 36.0; // ~130 km/h
      this.acceleration = 20.0;
      this.reverseSpeed = 10.0;
      this.brakingForce = 32.0;
      this.handling = 1.55;
      this.color = options.color || 0x1e252b; // Stealth Matte Black
      this.weight = 2200;
    } else if (type === 'hypercar') {
      this.name = 'Truffade Nero Phantom';
      this.maxSpeed = 52.0; // ~188 km/h (El rey del asfalto)
      this.acceleration = 29.0;
      this.reverseSpeed = 14.0;
      this.brakingForce = 38.0;
      this.handling = 2.05;
      this.color = options.color || 0x7209b7; // Midnight Royal Violet
      this.weight = 1250;
    } else if (type === 'police') {
      this.name = 'LSPD Interceptor Cruiser';
      this.maxSpeed = 34.0; // ~122 km/h (Persecución balanceada para permitir evasión)
      this.acceleration = 18.0;
      this.reverseSpeed = 12.0;
      this.brakingForce = 30.0;
      this.handling = 1.65;
      this.color = 0x111116; // Police Black & White
      this.isPolice = true;
      this.weight = 1750;
    } else {
      // Executive Sedan
      this.name = 'Albany President';
      this.maxSpeed = 38.0; // ~136 km/h
      this.acceleration = 18.0;
      this.reverseSpeed = 10.0;
      this.brakingForce = 30.0;
      this.handling = 1.65;
      this.color = options.color || 0xd4af37; // Champagne Gold
      this.weight = 1800;
    }
  }

  buildVehicleModel() {
    this.chassisGroup = new THREE.Group();
    this.mesh.add(this.chassisGroup);

    // High fidelity materials
    const carPaintMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.2,
      metalness: 0.85,
      envMapIntensity: 1.2
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.4,
      metalness: 0.5
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x051522,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.82
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.95
    });

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
      roughness: 0.2
    });

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xff1111,
      emissive: 0x880000,
      emissiveIntensity: 0.8,
      roughness: 0.3
    });

    // 1. Lower Chassis & Floor
    const floorGeom = new THREE.BoxGeometry(1.9, 0.2, 4.2);
    const floorMesh = new THREE.Mesh(floorGeom, carbonMat);
    floorMesh.position.set(0, 0.25, 0);
    floorMesh.castShadow = true;
    this.chassisGroup.add(floorMesh);

    // 2. Main Bodywork (Aerodynamic Contoured Sections)
    // Central cabin lower
    const bodyGeom = new THREE.BoxGeometry(1.92, 0.45, 2.3);
    const bodyMesh = new THREE.Mesh(bodyGeom, carPaintMat);
    bodyMesh.position.set(0, 0.48, -0.1);
    bodyMesh.castShadow = true;
    this.chassisGroup.add(bodyMesh);

    // Front Hood (sloped wedge)
    const hoodGeom = new THREE.BoxGeometry(1.86, 0.35, 1.4);
    const hoodMesh = new THREE.Mesh(hoodGeom, carPaintMat);
    hoodMesh.position.set(0, 0.42, 1.45);
    hoodMesh.rotation.x = -0.06;
    hoodMesh.castShadow = true;
    this.chassisGroup.add(hoodMesh);

    // Front Bumper & Carbon Splitter
    const bumperGeom = new THREE.BoxGeometry(1.92, 0.28, 0.4);
    const bumperMesh = new THREE.Mesh(bumperGeom, carbonMat);
    bumperMesh.position.set(0, 0.28, 2.15);
    this.chassisGroup.add(bumperMesh);

    // Rear Trunk / Deck
    const trunkGeom = new THREE.BoxGeometry(1.88, 0.4, 1.2);
    const trunkMesh = new THREE.Mesh(trunkGeom, carPaintMat);
    trunkMesh.position.set(0, 0.46, -1.55);
    trunkMesh.castShadow = true;
    this.chassisGroup.add(trunkMesh);

    // 3. Cabin & Glass Canopy (Windshield, Roof, Windows)
    const roofGeom = new THREE.BoxGeometry(1.5, 0.38, 1.8);
    const roofMesh = new THREE.Mesh(roofGeom, carPaintMat);
    roofMesh.position.set(0, 0.85, -0.2);
    roofMesh.castShadow = true;
    this.chassisGroup.add(roofMesh);

    // Windshield (Front sloped glass)
    const windshieldGeom = new THREE.BoxGeometry(1.52, 0.42, 0.08);
    const windshieldMesh = new THREE.Mesh(windshieldGeom, glassMat);
    windshieldMesh.position.set(0, 0.74, 0.75);
    windshieldMesh.rotation.x = 0.52;
    this.chassisGroup.add(windshieldMesh);

    // Rear Window
    const rearGlassGeom = new THREE.BoxGeometry(1.52, 0.38, 0.08);
    const rearGlassMesh = new THREE.Mesh(rearGlassGeom, glassMat);
    rearGlassMesh.position.set(0, 0.74, -1.15);
    rearGlassMesh.rotation.x = -0.48;
    this.chassisGroup.add(rearGlassMesh);

    // Side Windows
    const sideGlassLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 1.55), glassMat);
    sideGlassLeft.position.set(-0.76, 0.74, -0.2);
    this.chassisGroup.add(sideGlassLeft);

    const sideGlassRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 1.55), glassMat);
    sideGlassRight.position.set(0.76, 0.74, -0.2);
    this.chassisGroup.add(sideGlassRight);

    // Interior Steering Wheel
    const wheelSteerGeom = new THREE.TorusGeometry(0.12, 0.02, 8, 16);
    const wheelSteerMesh = new THREE.Mesh(wheelSteerGeom, carbonMat);
    wheelSteerMesh.position.set(-0.35, 0.65, 0.45);
    wheelSteerMesh.rotation.x = 0.4;
    this.chassisGroup.add(wheelSteerMesh);

    // 4. GT Spoiler Wing (Supercar & Muscle)
    if (this.type === 'supercar' || this.type === 'muscle') {
      const wingStandLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.15), carbonMat);
      wingStandLeft.position.set(-0.65, 0.76, -2.0);
      this.chassisGroup.add(wingStandLeft);

      const wingStandRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.15), carbonMat);
      wingStandRight.position.set(0.65, 0.76, -2.0);
      this.chassisGroup.add(wingStandRight);

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.35), carbonMat);
      wingBlade.position.set(0, 0.88, -2.0);
      this.chassisGroup.add(wingBlade);
    }

    // Police Lightbar (If police cruiser)
    if (this.isPolice) {
      const lightbarBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.2), carbonMat);
      lightbarBase.position.set(0, 1.08, -0.2);
      this.chassisGroup.add(lightbarBase);

      const redLightMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2.0
      });
      const blueLightMat = new THREE.MeshStandardMaterial({
        color: 0x0033ff,
        emissive: 0x0033ff,
        emissiveIntensity: 2.0
      });

      const redMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.18), redLightMat);
      redMesh.position.set(-0.3, 1.14, -0.2);
      this.chassisGroup.add(redMesh);

      const blueMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.18), blueLightMat);
      blueMesh.position.set(0.3, 1.14, -0.2);
      this.chassisGroup.add(blueMesh);

      this.sirenLights = [redMesh, blueMesh];

      // White police side decals
      const doorWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
      const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 1.4), doorWhiteMat);
      doorL.position.set(-0.965, 0.48, -0.1);
      this.chassisGroup.add(doorL);

      const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 1.4), doorWhiteMat);
      doorR.position.set(0.965, 0.48, -0.1);
      this.chassisGroup.add(doorR);
    }

    // 5. Headlights (Lenses use bright glowing emissive material without costly GPU SpotLights)
    const hlLeftMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headlightMat);
    hlLeftMesh.position.set(-0.7, 0.44, 2.26);
    this.chassisGroup.add(hlLeftMesh);

    const hlRightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headlightMat);
    hlRightMesh.position.set(0.7, 0.44, 2.26);
    this.chassisGroup.add(hlRightMesh);

    // Optional single high-end headlight beam (only if graphics preset explicitly allows spotlights)
    const isHighEnd = window.__MDC_GRAPHICS_PRESET?.spotlights === true;
    if (isHighEnd) {
      const spotCenter = new THREE.SpotLight(0xfffaed, 2.4, 40, Math.PI / 4, 0.4, 1.2);
      spotCenter.position.set(0, 0.5, 2.3);
      const targetCenter = new THREE.Object3D();
      targetCenter.position.set(0, 0, 25);
      this.chassisGroup.add(targetCenter);
      spotCenter.target = targetCenter;
      this.chassisGroup.add(spotCenter);
      this.headlights.push(spotCenter);
    }

    // 6. Taillights
    const tailGeom = new THREE.BoxGeometry(0.42, 0.1, 0.06);
    const tlLeft = new THREE.Mesh(tailGeom, taillightMat.clone());
    tlLeft.position.set(-0.72, 0.52, -2.15);
    this.chassisGroup.add(tlLeft);
    this.taillightMeshes.push(tlLeft);

    const tlRight = new THREE.Mesh(tailGeom, taillightMat.clone());
    tlRight.position.set(0.72, 0.52, -2.15);
    this.chassisGroup.add(tlRight);
    this.taillightMeshes.push(tlRight);

    // Twin Chrome Exhaust pipes
    const exhaustGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12);
    const exhaustLeft = new THREE.Mesh(exhaustGeom, chromeMat);
    exhaustLeft.rotation.x = Math.PI / 2;
    exhaustLeft.position.set(-0.55, 0.22, -2.15);
    this.chassisGroup.add(exhaustLeft);

    const exhaustRight = new THREE.Mesh(exhaustGeom, chromeMat);
    exhaustRight.rotation.x = Math.PI / 2;
    exhaustRight.position.set(0.55, 0.22, -2.15);
    this.chassisGroup.add(exhaustRight);

    // 7. Wheels & Rims (Pivoting front wheels, rolling on X axis)
    this.frontLeftWheel = this.createWheelPivot('fl');
    this.frontLeftWheel.position.set(-0.95, 0.35, 1.35);
    this.mesh.add(this.frontLeftWheel);

    this.frontRightWheel = this.createWheelPivot('fr');
    this.frontRightWheel.position.set(0.95, 0.35, 1.35);
    this.mesh.add(this.frontRightWheel);

    this.rearLeftWheel = this.createWheelPivot('rl');
    this.rearLeftWheel.position.set(-0.95, 0.35, -1.35);
    this.mesh.add(this.rearLeftWheel);

    this.rearRightWheel = this.createWheelPivot('rr');
    this.rearRightWheel.position.set(0.95, 0.35, -1.35);
    this.mesh.add(this.rearRightWheel);
  }

  createWheelPivot(posKey) {
    const steerPivot = new THREE.Group();

    // Wheel roll group
    const rollGroup = new THREE.Group();
    steerPivot.add(rollGroup);

    // Rubber Tire
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85 });
    const tireGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 20);
    const tireMesh = new THREE.Mesh(tireGeom, tireMat);
    tireMesh.rotation.z = Math.PI / 2;
    tireMesh.castShadow = true;
    rollGroup.add(tireMesh);

    // Alloy Rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.9, roughness: 0.2 });
    const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.29, 14);
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    rimMesh.rotation.z = Math.PI / 2;
    rollGroup.add(rimMesh);

    // Brake Disc
    const brakeMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.3 });
    const brakeGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
    const brakeMesh = new THREE.Mesh(brakeGeom, brakeMat);
    brakeMesh.rotation.z = Math.PI / 2;
    steerPivot.add(brakeMesh); // disc stays fixed in roll

    steerPivot.userData.rollGroup = rollGroup;
    return steerPivot;
  }

  // -------------------------------------------------------------
  // VEHICLE DYNAMICS & INPUT
  // -------------------------------------------------------------

  update(delta, inputManager, colliders = []) {
    // Performance: Early exit for idle parked vehicles to eliminate physics overhead
    if (!this.isOccupied && Math.abs(this.currentSpeed) < 0.05 && Math.abs(this.steeringAngle) < 0.01) {
      this.currentSpeed = 0;
      this.targetSteering = 0;
      this.steeringAngle = 0;
      return;
    }

    if (this.isOccupied && inputManager) {
      this.handleDriverInput(delta, inputManager);
    } else {
      // Natural rolling friction when empty
      this.currentSpeed *= Math.max(0, 1 - delta * 2.5);
      if (Math.abs(this.currentSpeed) < 0.1) this.currentSpeed = 0;
      this.targetSteering = 0;
    }

    // Steer angle smoothing
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, this.targetSteering, delta * 8);

    // Update front wheel steering visual (negated to match screen-relative turning)
    this.frontLeftWheel.rotation.y = -this.steeringAngle;
    this.frontRightWheel.rotation.y = -this.steeringAngle;

    // Move Vehicle
    if (Math.abs(this.currentSpeed) > 0.01) {
      // Rotate vehicle heading based on steering and speed (responsive at low and high speed)
      // Note: In Three.js right-handed system (+Y up), negative yawDelta rotates +Z towards +X (Right)
      const speedRatio = Math.abs(this.currentSpeed) / this.maxSpeed;
      const turnFactor = (0.55 + speedRatio * 0.45) * this.handling;
      const yawDelta = -this.steeringAngle * turnFactor * delta * 3.4 * (this.currentSpeed >= 0 ? 1 : -1);
      this.mesh.rotation.y += yawDelta;

      // Forward vector (+Z is vehicle forward) without GC allocation
      _forwardVec.set(
        Math.sin(this.mesh.rotation.y),
        0,
        Math.cos(this.mesh.rotation.y)
      );

      this.velocity.copy(_forwardVec).multiplyScalar(this.currentSpeed);
      _nextPosVec.copy(this.position).addScaledVector(_forwardVec, this.currentSpeed * delta);

      // Collisions with buildings
      this.resolveVehicleCollisions(_nextPosVec, colliders);

      this.position.copy(_nextPosVec);
      this.mesh.position.copy(this.position);
      if (this.isOccupied && this.driver) {
        this.driver.position.copy(this.position);
      }

      // Roll wheels around X axis
      const rollDist = (this.currentSpeed * delta) / 0.35;
      this.frontLeftWheel.userData.rollGroup.rotation.x += rollDist;
      this.frontRightWheel.userData.rollGroup.rotation.x += rollDist;
      this.rearLeftWheel.userData.rollGroup.rotation.x += rollDist;
      this.rearRightWheel.userData.rollGroup.rotation.x += rollDist;

      // Tire screech sound when drifting or high lateral G
      if (this.isHandbraking && Math.abs(this.currentSpeed) > 8) {
        AudioManager.playTireSkid(0.8);
      }
    }

    // Chassis Suspension Pitch & Roll
    const accelPitch = (this.currentSpeed > 0 && inputManager?.keys.forward ? -0.04 : 0) +
                       (this.isBraking ? 0.06 : 0);
    const turnRoll = -this.steeringAngle * (this.currentSpeed / this.maxSpeed) * 0.12;

    this.pitch = THREE.MathUtils.lerp(this.pitch, accelPitch, delta * 6);
    this.roll = THREE.MathUtils.lerp(this.roll, turnRoll, delta * 6);

    this.chassisGroup.rotation.x = this.pitch;
    this.chassisGroup.rotation.z = this.roll;

    // Taillight brake flare
    const brakeIntensity = (this.isBraking || this.isHandbraking) ? 2.5 : 0.6;
    for (const tl of this.taillightMeshes) {
      tl.material.emissiveIntensity = brakeIntensity;
    }

    // Police flashing lights
    if (this.isPolice && this.isOccupied) {
      const flash = Math.sin(Date.now() * 0.012) > 0;
      this.sirenLights[0].material.emissiveIntensity = flash ? 3.5 : 0.2;
      this.sirenLights[1].material.emissiveIntensity = !flash ? 3.5 : 0.2;
    }

    // Update engine audio
    if (this.isOccupied) {
      const rpmRatio = Math.min(1, Math.abs(this.currentSpeed) / this.maxSpeed);
      AudioManager.updateEngine(rpmRatio, inputManager?.keys.forward);

      // Horn
      if (typeof inputManager?.consumeHorn === 'function' && inputManager.consumeHorn()) {
        AudioManager.playHorn();
      }

      // Radio Toggle (Q)
      if (typeof inputManager?.consumeRadio === 'function' && inputManager.consumeRadio()) {
        const isPlaying = AudioManager.toggleRadio();
        window.dispatchEvent(new CustomEvent('radio:toggled', { detail: { isPlaying } }));
      }
    }
  }

  handleDriverInput(delta, inputManager) {
    const keys = inputManager.keys;

    // Acceleration & Reverse
    if (keys.forward) {
      if (this.currentSpeed < -0.5) {
        // Braking while going backward
        this.currentSpeed += this.brakingForce * delta;
        this.isBraking = true;
      } else {
        // Accelerating forward
        this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + this.acceleration * delta);
        this.isBraking = false;
      }
    } else if (keys.backward) {
      if (this.currentSpeed > 0.5) {
        // Braking while going forward
        this.currentSpeed = Math.max(0, this.currentSpeed - this.brakingForce * delta);
        this.isBraking = true;
      } else {
        // Reverse
        this.currentSpeed = Math.max(-this.reverseSpeed, this.currentSpeed - this.acceleration * 0.5 * delta);
        this.isBraking = false;
      }
    } else {
      // Natural coasting drag
      this.isBraking = false;
      if (this.currentSpeed > 0) {
        this.currentSpeed = Math.max(0, this.currentSpeed - delta * 4.5);
      } else if (this.currentSpeed < 0) {
        this.currentSpeed = Math.min(0, this.currentSpeed + delta * 4.5);
      }
    }

    // Handbrake / Drift (Space)
    if (keys.jump) {
      this.isHandbraking = true;
      this.currentSpeed *= Math.max(0, 1 - delta * 0.9); // smooth drift slide without grinding to a halt
    } else {
      this.isHandbraking = false;
    }

    // Steering with dynamic speed sensitivity (A = Left, D = Right)
    const speedRatio = Math.abs(this.currentSpeed) / this.maxSpeed;
    const maxSteer = 0.65 - speedRatio * 0.20; // responsive turning even at speed

    if (keys.left) {
      this.targetSteering = -maxSteer;
    } else if (keys.right) {
      this.targetSteering = maxSteer;
    } else {
      this.targetSteering = 0;
    }
  }

  resolveVehicleCollisions(targetPos, colliders) {
    const halfWidth = 0.95; // tight, accurate collision box to avoid false sticking
    const halfLength = 1.95;

    for (const item of colliders) {
      if (!item) continue;
      const box = item.box || item;
      if (!box.min || !box.max) continue;
      // Skip ground planes and thin triggers
      if (box.max.y - box.min.y < 0.8) continue;
      // Skip interior colliders if vehicle is out on surface
      if (box.max.y < -10 || box.min.y > targetPos.y + 2.5 || box.max.y < targetPos.y - 0.5) continue;

      if (
        targetPos.x >= box.min.x - halfWidth &&
        targetPos.x <= box.max.x + halfWidth &&
        targetPos.z >= box.min.z - halfLength &&
        targetPos.z <= box.max.z + halfLength
      ) {
        // Calculate collision normal to slide along walls instead of sticking/halting permanently
        const overlapLeft = (targetPos.x) - (box.min.x - halfWidth);
        const overlapRight = (box.max.x + halfWidth) - (targetPos.x);
        const overlapBottom = (targetPos.z) - (box.min.z - halfLength);
        const overlapTop = (box.max.z + halfLength) - (targetPos.z);

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapBottom, overlapTop);

        if (minOverlap === overlapLeft) {
          targetPos.x = box.min.x - halfWidth - 0.05;
        } else if (minOverlap === overlapRight) {
          targetPos.x = box.max.x + halfWidth + 0.05;
        } else if (minOverlap === overlapBottom) {
          targetPos.z = box.min.z - halfLength - 0.05;
        } else {
          targetPos.z = box.max.z + halfLength + 0.05;
        }

        // Retain 65% forward velocity sliding along walls instead of freezing dead!
        const prevSpeed = this.currentSpeed;
        this.currentSpeed = Math.sign(this.currentSpeed) * Math.max(Math.abs(this.currentSpeed) * 0.65, 3.0);
        AudioManager.playTireSkid(0.3);

        if (Math.abs(prevSpeed) > 7.0) {
          window.dispatchEvent(new CustomEvent('vehicle:crash', {
            detail: { position: targetPos.clone(), speed: Math.abs(prevSpeed) }
          }));
        }
        return;
      }
    }
  }

  enterDriver(player) {
    this.isOccupied = true;
    this.driver = player;
    player.inVehicle = true;
    player.currentVehicle = this;

    // Hide character mesh so they are inside the vehicle, not standing outside
    if (player.mesh) {
      player.mesh.visible = false;
    }

    // Start engine audio
    AudioManager.startEngine(this.type === 'supercar' ? 'sports' : 'muscle');
    if (this.isPolice) AudioManager.startPoliceSiren();

    console.log(`[Vehicle] Entered ${this.name}`);
  }

  exitDriver() {
    if (!this.driver) return;
    const player = this.driver;
    this.isOccupied = false;
    this.driver = null;

    player.inVehicle = false;
    player.currentVehicle = null;

    // Position player slightly to the left of the car
    const leftDir = new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    player.position.copy(this.position).addScaledVector(leftDir, 1.8);
    player.position.y = 0;
    if (player.velocity) player.velocity.set(0, 0, 0);
    if (player.mesh) {
      player.mesh.position.copy(player.position);
      player.mesh.visible = true; // Show character model again upon exiting
    }

    // Stop engine sound
    AudioManager.stopEngine();
    if (this.isPolice) AudioManager.stopPoliceSiren();

    console.log(`[Vehicle] Exited ${this.name}`);
  }

  get speed() {
    return Math.abs(this.currentSpeed);
  }

  getPosition() {
    return this.position;
  }
}
