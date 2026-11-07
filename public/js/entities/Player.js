import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';

export class Player {
  constructor(scene, startPos = { x: 0, y: 0, z: 28 }) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.mesh.name = 'Player';

    // Character State
    this.position = new THREE.Vector3(startPos.x, startPos.y || 0, startPos.z);
    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.targetHeading = 0;
    this.groundY = 0; // Ground elevation for current zone (0 for city, -120 for casino interior)

    this.isGrounded = true;
    this.inVehicle = false;
    this.currentVehicle = null;

    // Attributes
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.maxArmor = 100;
    this.stamina = 100;
    this.maxStamina = 100;

    // Tactical & OP Flags
    this.isAiming = false;
    this.isGodMode = false;
    this.isSuperSpeed = false;
    this.cameraPitch = 0;

    // Movement Speeds
    this.walkSpeed = 4.2;
    this.runSpeed = 8.6;
    this.jumpForce = 7.5;
    this.gravity = 20.0;

    // Animation Timers & State
    this.animTime = 0;
    this.animState = 'idle'; // 'idle', 'walk', 'run', 'jump', 'seated'
    this.stepTimer = 0;

    // Build the anatomical 3D character model
    this.buildHumanoidModel();
    this.scene.add(this.mesh);

    this.mesh.position.copy(this.position);
  }

  buildHumanoidModel() {
    // High quality stylized materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe0a899,
      roughness: 0.6,
      metalness: 0.1
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1f1917,
      roughness: 0.8
    });

    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x141e28, // Midnight navy blazer
      roughness: 0.7
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xd82638, // Crimson inner shirt / open collar
      roughness: 0.6
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x222226, // Charcoal tailored trousers
      roughness: 0.8
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f0f,
      roughness: 0.4
    });

    const shoeSoleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5
    });

    const glassesMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.9
    });

    // Root Group
    this.root = new THREE.Group();
    this.mesh.add(this.root);

    // 1. Pelvis / Hips (Y: ~0.95m)
    this.pelvis = new THREE.Group();
    this.pelvis.position.set(0, 0.95, 0);
    this.root.add(this.pelvis);

    const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.24), pantsMat);
    pelvisMesh.castShadow = true;
    this.pelvis.add(pelvisMesh);

    // 2. Spine & Torso
    this.torso = new THREE.Group();
    this.torso.position.set(0, 0.09, 0);
    this.pelvis.add(this.torso);

    // Chest jacket
    const chestGeom = new THREE.BoxGeometry(0.44, 0.48, 0.28);
    const chestMesh = new THREE.Mesh(chestGeom, jacketMat);
    chestMesh.position.set(0, 0.24, 0);
    chestMesh.castShadow = true;
    this.torso.add(chestMesh);

    // Inner shirt lapel
    const shirtGeom = new THREE.BoxGeometry(0.2, 0.38, 0.06);
    const shirtMesh = new THREE.Mesh(shirtGeom, shirtMat);
    shirtMesh.position.set(0, 0.25, 0.12);
    this.torso.add(shirtMesh);

    // Gold Chain / Lapel Pin
    const pinGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const pinMesh = new THREE.Mesh(pinGeom, goldMat);
    pinMesh.position.set(-0.12, 0.35, 0.15);
    pinMesh.rotation.x = Math.PI / 2;
    this.torso.add(pinMesh);

    // 3. Neck & Head
    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.48, 0);
    this.torso.add(this.neck);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), skinMat);
    neckMesh.position.set(0, 0.05, 0);
    this.neck.add(neckMesh);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.12, 0);
    this.neck.add(this.head);

    // Head base (jaw and skull)
    const headGeom = new THREE.BoxGeometry(0.24, 0.28, 0.26);
    const headMesh = new THREE.Mesh(headGeom, skinMat);
    headMesh.position.set(0, 0.14, 0);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Hair
    const hairGeom = new THREE.BoxGeometry(0.26, 0.14, 0.28);
    const hairMesh = new THREE.Mesh(hairGeom, hairMat);
    hairMesh.position.set(0, 0.24, -0.01);
    this.head.add(hairMesh);

    // Hair quiff front
    const quiffGeom = new THREE.BoxGeometry(0.24, 0.08, 0.1);
    const quiffMesh = new THREE.Mesh(quiffGeom, hairMat);
    quiffMesh.position.set(0, 0.25, 0.12);
    this.head.add(quiffMesh);

    // Sunglasses (Cool criminal look)
    const glassGeom = new THREE.BoxGeometry(0.22, 0.06, 0.06);
    const glassMesh = new THREE.Mesh(glassGeom, glassesMat);
    glassMesh.position.set(0, 0.15, 0.14);
    this.head.add(glassMesh);

    // 4. Arms (Left & Right)
    this.leftArm = this.createArm('left', skinMat, jacketMat, goldMat);
    this.leftArm.position.set(-0.27, 0.42, 0);
    this.torso.add(this.leftArm);

    this.rightArm = this.createArm('right', skinMat, jacketMat, goldMat);
    this.rightArm.position.set(0.27, 0.42, 0);
    this.torso.add(this.rightArm);

    // Weapon socket in right hand
    this.weaponSocket = new THREE.Group();
    this.rightArm.userData.forearm.userData.hand.add(this.weaponSocket);
    this.weaponSocket.position.set(0, -0.18, 0.08);
    this.weaponSocket.rotation.x = Math.PI / 2;

    // 5. Legs (Left & Right)
    this.leftLeg = this.createLeg('left', pantsMat, shoeMat, shoeSoleMat);
    this.leftLeg.position.set(-0.13, -0.05, 0);
    this.pelvis.add(this.leftLeg);

    this.rightLeg = this.createLeg('right', pantsMat, shoeMat, shoeSoleMat);
    this.rightLeg.position.set(0.13, -0.05, 0);
    this.pelvis.add(this.rightLeg);
  }

  createArm(side, skinMat, jacketMat, goldMat) {
    const armPivot = new THREE.Group();

    // Shoulder & Bicep
    const bicepGeom = new THREE.BoxGeometry(0.13, 0.28, 0.14);
    const bicepMesh = new THREE.Mesh(bicepGeom, jacketMat);
    bicepMesh.position.set(0, -0.14, 0);
    bicepMesh.castShadow = true;
    armPivot.add(bicepMesh);

    // Elbow / Forearm Pivot
    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.28, 0);
    armPivot.add(forearmPivot);

    const forearmGeom = new THREE.BoxGeometry(0.12, 0.25, 0.13);
    const forearmMesh = new THREE.Mesh(forearmGeom, jacketMat);
    forearmMesh.position.set(0, -0.125, 0);
    forearmMesh.castShadow = true;
    forearmPivot.add(forearmMesh);

    // Watch on left wrist
    if (side === 'left') {
      const watchGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12);
      const watchMesh = new THREE.Mesh(watchGeom, goldMat);
      watchMesh.position.set(0, -0.22, 0);
      forearmPivot.add(watchMesh);
    }

    // Hand
    const handPivot = new THREE.Group();
    handPivot.position.set(0, -0.25, 0);
    forearmPivot.add(handPivot);

    const handGeom = new THREE.BoxGeometry(0.09, 0.1, 0.08);
    const handMesh = new THREE.Mesh(handGeom, skinMat);
    handMesh.position.set(0, -0.05, 0);
    handMesh.castShadow = true;
    handPivot.add(handMesh);

    forearmPivot.userData.hand = handPivot;
    armPivot.userData.forearm = forearmPivot;

    return armPivot;
  }

  createLeg(side, pantsMat, shoeMat, shoeSoleMat) {
    const legPivot = new THREE.Group();

    // Thigh
    const thighGeom = new THREE.BoxGeometry(0.16, 0.42, 0.18);
    const thighMesh = new THREE.Mesh(thighGeom, pantsMat);
    thighMesh.position.set(0, -0.21, 0);
    thighMesh.castShadow = true;
    legPivot.add(thighMesh);

    // Knee / Calf Pivot
    const calfPivot = new THREE.Group();
    calfPivot.position.set(0, -0.42, 0);
    legPivot.add(calfPivot);

    const calfGeom = new THREE.BoxGeometry(0.14, 0.38, 0.16);
    const calfMesh = new THREE.Mesh(calfGeom, pantsMat);
    calfMesh.position.set(0, -0.19, 0);
    calfMesh.castShadow = true;
    calfPivot.add(calfMesh);

    // Ankle / Foot
    const footPivot = new THREE.Group();
    footPivot.position.set(0, -0.38, 0);
    calfPivot.add(footPivot);

    // Shoe upper
    const shoeGeom = new THREE.BoxGeometry(0.13, 0.09, 0.22);
    const shoeMesh = new THREE.Mesh(shoeGeom, shoeMat);
    shoeMesh.position.set(0, -0.045, 0.03);
    shoeMesh.castShadow = true;
    footPivot.add(shoeMesh);

    // White sneaker sole
    const soleGeom = new THREE.BoxGeometry(0.14, 0.03, 0.23);
    const soleMesh = new THREE.Mesh(soleGeom, shoeSoleMat);
    soleMesh.position.set(0, -0.095, 0.03);
    footPivot.add(soleMesh);

    legPivot.userData.calf = calfPivot;
    legPivot.userData.foot = footPivot;

    return legPivot;
  }

  // -------------------------------------------------------------
  // UPDATE & ANIMATIONS
  // -------------------------------------------------------------

  update(delta, inputManager, cameraYaw = 0, colliders = [], isAiming = false, cameraPitch = 0) {
    if (this.inVehicle) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    this.isAiming = isAiming;
    this.cameraPitch = cameraPitch;

    // Movement Inputs
    let moveX = 0;
    let moveZ = 0;

    if (inputManager.keys.forward) moveZ -= 1;
    if (inputManager.keys.backward) moveZ += 1;
    if (inputManager.keys.left) moveX -= 1;
    if (inputManager.keys.right) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;
    let isSprinting = !isAiming && inputManager.keys.sprint && isMoving && this.stamina > 5;

    // Stamina depletion & regeneration
    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - delta * 18);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 14);
    }

    let currentSpeed = isSprinting ? this.runSpeed : this.walkSpeed;
    if (isAiming) {
      currentSpeed = this.walkSpeed * 0.65; // Tactical ADS walk speed
    }

    if (isMoving) {
      // Calculate movement vector relative to camera yaw
      const moveAngle = Math.atan2(moveX, moveZ);
      const targetAngle = cameraYaw + moveAngle;

      this.targetHeading = targetAngle;

      if (isAiming) {
        // When aiming, character orientation locks with crosshair raycast (camera yaw + PI)
        this.heading = cameraYaw + Math.PI;
        this.mesh.rotation.y = this.heading;
      } else {
        // Smooth heading turn
        let angleDiff = this.targetHeading - this.heading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.heading += angleDiff * Math.min(1, delta * 14);
        this.mesh.rotation.y = this.heading;
      }

      // Apply horizontal velocity
      const forwardDir = new THREE.Vector3(Math.sin(targetAngle), 0, Math.cos(targetAngle)).normalize();
      this.velocity.x = forwardDir.x * currentSpeed;
      this.velocity.z = forwardDir.z * currentSpeed;

      this.animState = isSprinting ? 'run' : 'walk';

      // Footstep sound trigger
      this.stepTimer += delta * (isSprinting ? 2.8 : 1.8);
      if (this.stepTimer >= 1.0) {
        this.stepTimer = 0;
        AudioManager.playFootstep();
      }
    } else {
      if (isAiming) {
        this.heading = cameraYaw + Math.PI;
        this.mesh.rotation.y = this.heading;
      }
      // Decelerate
      this.velocity.x *= 0.7;
      this.velocity.z *= 0.7;
      if (Math.abs(this.velocity.x) < 0.05) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.05) this.velocity.z = 0;
      this.animState = 'idle';
      this.stepTimer = 0.8;
    }

    // Jump
    if (inputManager.keys.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.animState = 'jump';
      AudioManager.playJump();
    }

    // Gravity
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * delta;
    }

    // Integrate Position with collision
    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * delta;
    nextPos.y += this.velocity.y * delta;
    nextPos.z += this.velocity.z * delta;

    // Ground check for current zone (0 for city, -120 for casino interior)
    if (nextPos.y <= this.groundY) {
      nextPos.y = this.groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Simple building bounds collision resolution
    this.resolveCollisions(nextPos, colliders);

    this.position.copy(nextPos);
    this.mesh.position.copy(this.position);

    // Apply procedural skeletal animation
    this.animateBones(delta);
  }

  setGroundY(y) {
    this.groundY = y;
    if (this.position.y < y) this.position.y = y;
  }

  resolveCollisions(targetPos, colliders) {
    const playerRadius = 0.45;
    for (const box of colliders) {
      if (!box) continue;
      // Skip interior colliders if player is outside in the city (or vice versa)
      if (box.max.y < -10 && targetPos.y > -10) continue;
      if (box.min.y > -10 && targetPos.y < -10) continue;

      // Expand box by player radius and verify 3D height overlap
      if (
        targetPos.x >= box.min.x - playerRadius &&
        targetPos.x <= box.max.x + playerRadius &&
        targetPos.z >= box.min.z - playerRadius &&
        targetPos.z <= box.max.z + playerRadius &&
        targetPos.y + 1.85 >= box.min.y &&
        targetPos.y <= box.max.y
      ) {
        // Resolve on closest axis
        const distMinX = Math.abs(targetPos.x - (box.min.x - playerRadius));
        const distMaxX = Math.abs(targetPos.x - (box.max.x + playerRadius));
        const distMinZ = Math.abs(targetPos.z - (box.min.z - playerRadius));
        const distMaxZ = Math.abs(targetPos.z - (box.max.z + playerRadius));

        const minDist = Math.min(distMinX, distMaxX, distMinZ, distMaxZ);

        if (minDist === distMinX) {
          targetPos.x = box.min.x - playerRadius;
          this.velocity.x = 0;
        } else if (minDist === distMaxX) {
          targetPos.x = box.max.x + playerRadius;
          this.velocity.x = 0;
        } else if (minDist === distMinZ) {
          targetPos.z = box.min.z - playerRadius;
          this.velocity.z = 0;
        } else {
          targetPos.z = box.max.z + playerRadius;
          this.velocity.z = 0;
        }
      }
    }
  }

  animateBones(delta) {
    this.animTime += delta;

    const leftCalf = this.leftLeg.userData.calf;
    const rightCalf = this.rightLeg.userData.calf;
    const leftForearm = this.leftArm.userData.forearm;
    const rightForearm = this.rightArm.userData.forearm;

    if (this.animState === 'idle') {
      // Natural subtle breathing
      const breath = Math.sin(this.animTime * 2.5);
      this.torso.position.y = 0.09 + breath * 0.012;
      this.neck.rotation.x = breath * 0.02;

      // Relax arms and legs to neutral
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 0.15);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 0.15);
      leftCalf.rotation.x = THREE.MathUtils.lerp(leftCalf.rotation.x, 0, 0.15);
      rightCalf.rotation.x = THREE.MathUtils.lerp(rightCalf.rotation.x, 0, 0.15);

      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0.05, 0.15);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0.05, 0.15);
      this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, 0.08, 0.15);
      this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, -0.08, 0.15);
      leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, 0.1, 0.15);
      rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, 0.1, 0.15);

      this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0, 0.15);
    } else if (this.animState === 'walk' || this.animState === 'run') {
      const isSprint = this.animState === 'run';
      const freq = isSprint ? 13.5 : 8.5;
      const legAmp = isSprint ? 0.95 : 0.65;
      const armAmp = isSprint ? 0.9 : 0.55;

      const cycle = this.animTime * freq;
      const sinCycle = Math.sin(cycle);
      const cosCycle = Math.cos(cycle);

      // Legs swing in opposite phases
      this.leftLeg.rotation.x = sinCycle * legAmp;
      this.rightLeg.rotation.x = -sinCycle * legAmp;

      // Knees bend during backward swing
      leftCalf.rotation.x = Math.max(0, -sinCycle * (legAmp * 1.2));
      rightCalf.rotation.x = Math.max(0, sinCycle * (legAmp * 1.2));

      // Arms swing in counter-phase to legs
      this.leftArm.rotation.x = -sinCycle * armAmp;
      this.rightArm.rotation.x = sinCycle * armAmp;

      // Forearms bend naturally
      leftForearm.rotation.x = 0.25 + Math.abs(sinCycle) * 0.35;
      rightForearm.rotation.x = 0.25 + Math.abs(sinCycle) * 0.35;

      // Torso leans slightly forward when sprinting + subtle hip bob
      const targetLean = isSprint ? 0.22 : 0.08;
      this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, targetLean, 0.2);
      this.pelvis.position.y = 0.95 + Math.abs(cosCycle) * (isSprint ? 0.04 : 0.02);
    } else if (this.animState === 'jump') {
      // Jump pose: legs tucked slightly, arms raised for balance
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0.4, 0.2);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, -0.3, 0.2);
      leftCalf.rotation.x = 0.6;
      rightCalf.rotation.x = 0.4;
      this.leftArm.rotation.x = -0.6;
      this.rightArm.rotation.x = -0.6;
    }

    // Override arms for Tactical Aiming Stance (ADS)
    if (this.isAiming) {
      this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, -this.cameraPitch * 0.5, 0.25);

      // Right arm raised aiming down sights
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -Math.PI / 2 + 0.12, 0.28);
      this.rightArm.rotation.y = THREE.MathUtils.lerp(this.rightArm.rotation.y, -0.15, 0.28);
      this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, 0, 0.28);
      rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, 0.18, 0.28);

      // Left arm supports the barrel / handguard
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, -Math.PI / 2 + 0.24, 0.28);
      this.leftArm.rotation.y = THREE.MathUtils.lerp(this.leftArm.rotation.y, 0.38, 0.28);
      this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, 0.1, 0.28);
      leftForearm.rotation.x = THREE.MathUtils.lerp(leftForearm.rotation.x, 0.55, 0.28);
    }
  }

  takeDamage(amount) {
    if (this.isGodMode) return; // God Mode invincibility!

    if (this.armor > 0) {
      if (this.armor >= amount) {
        this.armor -= amount;
        return;
      } else {
        const remaining = amount - this.armor;
        this.armor = 0;
        this.health = Math.max(0, this.health - remaining);
      }
    } else {
      this.health = Math.max(0, this.health - amount);
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    console.log('[Player] WASTED / Eliminated');
    // Trigger Wasted Event
    window.dispatchEvent(new CustomEvent('player:wasted'));
  }

  respawn(pos = { x: 0, y: 0, z: 28 }) {
    this.health = 100;
    this.armor = 0;
    this.position.set(pos.x, pos.y || 0, pos.z);
    this.velocity.set(0, 0, 0);
    this.inVehicle = false;
    this.mesh.visible = true;
    this.mesh.position.copy(this.position);
  }

  getPosition() {
    return this.position;
  }
}
