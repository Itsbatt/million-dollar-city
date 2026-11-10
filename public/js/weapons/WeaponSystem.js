import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';

export class WeaponSystem {
  constructor(scene, player, camera) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;

    this.weapons = {
      pistol: {
        id: 'pistol',
        name: 'Pistola de Combate 9mm',
        damage: 34,
        magSize: 12,
        currentAmmo: 12,
        reserveAmmo: 60,
        fireRate: 0.22,
        range: 75,
        spread: 0.016,
        recoilPitch: 0.022,
        recoilYaw: 0.008,
        type: 'pistol'
      },
      smg: {
        id: 'smg',
        name: 'Subfusil Táctico SMG Micro',
        damage: 22,
        magSize: 30,
        currentAmmo: 30,
        reserveAmmo: 150,
        fireRate: 0.085,
        range: 60,
        spread: 0.032,
        recoilPitch: 0.018,
        recoilYaw: 0.012,
        type: 'smg'
      },
      shotgun: {
        id: 'shotgun',
        name: 'Escopeta Táctica Remington',
        damage: 90,
        magSize: 8,
        currentAmmo: 8,
        reserveAmmo: 40,
        fireRate: 0.75,
        range: 32,
        spread: 0.065,
        recoilPitch: 0.065,
        recoilYaw: 0.02,
        type: 'shotgun'
      },
      rifle: {
        id: 'rifle',
        name: 'Rifle de Asalto M4 Carbine',
        damage: 42,
        magSize: 30,
        currentAmmo: 30,
        reserveAmmo: 120,
        fireRate: 0.11,
        range: 125,
        spread: 0.018,
        recoilPitch: 0.032,
        recoilYaw: 0.012,
        type: 'rifle'
      },
      sniper: {
        id: 'sniper',
        name: 'Francotirador Barret .50 Cal',
        damage: 175,
        magSize: 5,
        currentAmmo: 5,
        reserveAmmo: 35,
        fireRate: 0.95,
        range: 250,
        spread: 0.003,
        recoilPitch: 0.085,
        recoilYaw: 0.018,
        type: 'sniper'
      }
    };

    this.currentWeaponId = 'pistol';
    this.lastFireTime = 0;
    this.isReloading = false;
    this.infiniteAmmo = false;
    this.recoilKickZ = 0;

    // Visual FX objects
    this.muzzleLight = new THREE.PointLight(0xffa200, 0, 8);
    this.scene.add(this.muzzleLight);

    this.tracers = [];
    this.impactParticles = [];

    // Weapon 3D Models
    this.weaponMeshes = {};
    this.buildWeaponModels();
    this.equip('pistol');
  }

  buildWeaponModels() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.35, metalness: 0.85 });
    const polymerMat = new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });

    // 1. Pistol
    const pistolGroup = new THREE.Group();
    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), polymerMat);
    grip.position.set(0, -0.06, -0.02);
    grip.rotation.x = -0.2;
    pistolGroup.add(grip);
    // Slide & Barrel
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.22), metalMat);
    slide.position.set(0, 0.02, 0.04);
    pistolGroup.add(slide);
    this.weaponMeshes['pistol'] = pistolGroup;

    // 2. SMG
    const smgGroup = new THREE.Group();
    const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.35), polymerMat);
    smgGroup.add(smgBody);
    const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.06), metalMat);
    smgMag.position.set(0, -0.12, 0.05);
    smgGroup.add(smgMag);
    this.weaponMeshes['smg'] = smgGroup;

    // 3. Shotgun
    const shotGroup = new THREE.Group();
    const shotBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.55), metalMat);
    shotGroup.add(shotBody);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8), polymerMat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.04, 0.12);
    shotGroup.add(pump);
    this.weaponMeshes['shotgun'] = shotGroup;

    // 4. Rifle (M4)
    const rifleGroup = new THREE.Group();
    const rifleBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.6), metalMat);
    rifleGroup.add(rifleBody);
    const bananaMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), metalMat);
    bananaMag.position.set(0, -0.14, 0.08);
    bananaMag.rotation.x = 0.25;
    rifleGroup.add(bananaMag);
    this.weaponMeshes['rifle'] = rifleGroup;

    // 5. Heavy Sniper Rifle Barret .50
    const sniperGroup = new THREE.Group();
    // Long receiver & stock
    const sniperBody = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.55), metalMat);
    sniperGroup.add(sniperBody);
    // Heavy long fluted barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.65, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.55);
    sniperGroup.add(barrel);
    // Muzzle brake
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.1), metalMat);
    brake.position.set(0, 0.02, 0.9);
    sniperGroup.add(brake);
    // High-power Telescopic Optical Scope
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.32, 12), polymerMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.11, 0.1);
    sniperGroup.add(scopeTube);
    // Scope mounts
    const mount1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), metalMat);
    mount1.position.set(0, 0.07, 0.02);
    sniperGroup.add(mount1);
    const mount2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), metalMat);
    mount2.position.set(0, 0.07, 0.18);
    sniperGroup.add(mount2);
    // Bipod legs
    const bipodLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), metalMat);
    bipodLeg1.position.set(-0.08, -0.12, 0.45);
    bipodLeg1.rotation.z = 0.35;
    sniperGroup.add(bipodLeg1);
    const bipodLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), metalMat);
    bipodLeg2.position.set(0.08, -0.12, 0.45);
    bipodLeg2.rotation.z = -0.35;
    sniperGroup.add(bipodLeg2);
    this.weaponMeshes['sniper'] = sniperGroup;

    // Attach all to player's weapon socket, hiding initially
    for (const key in this.weaponMeshes) {
      this.weaponMeshes[key].visible = false;
      this.player.weaponSocket.add(this.weaponMeshes[key]);
    }
  }

  equip(weaponId) {
    if (!this.weapons[weaponId]) return;
    this.currentWeaponId = weaponId;

    for (const key in this.weaponMeshes) {
      this.weaponMeshes[key].visible = key === weaponId;
    }

    this.notifyWeaponUpdate();
    console.log(`[Combat] Equipped: ${this.weapons[weaponId].name}`);
  }

  shoot(enemies = [], isAiming = false, cameraManager = null) {
    if (this.player.inVehicle) return; // cannot shoot while driving
    if (!document.pointerLockElement) return; // cannot shoot with free mouse cursor
    if (document.body.classList.contains('ui-active')) return; // cannot shoot while UI is active
    if (document.querySelector('.game-modal.visible, .modal.visible, #phone-container.visible, #lan-lobby-modal.visible')) return;
    const now = performance.now() / 1000;
    const weapon = this.weapons[this.currentWeaponId];

    if (now - this.lastFireTime < weapon.fireRate) return;
    if (this.isReloading) return;

    if (!this.infiniteAmmo && weapon.currentAmmo <= 0) {
      this.reload();
      return;
    }

    this.lastFireTime = now;
    if (!this.infiniteAmmo) {
      weapon.currentAmmo--;
    }

    // Weapon kickback animation along barrel
    this.recoilKickZ = weapon.type === 'sniper' ? 0.14 : (weapon.type === 'shotgun' ? 0.12 : 0.07);

    // Apply procedural camera recoil kick
    if (cameraManager) {
      cameraManager.addRecoil(weapon.recoilPitch, weapon.recoilYaw);
    }

    // Sound
    AudioManager.playGunshot(weapon.type);

    // Muzzle flash light at player hand position
    const handWorldPos = new THREE.Vector3();
    this.player.weaponSocket.getWorldPosition(handWorldPos);
    this.muzzleLight.position.copy(handWorldPos);
    this.muzzleLight.intensity = weapon.type === 'sniper' ? 6.5 : 4.5;
    setTimeout(() => { this.muzzleLight.intensity = 0; }, 40);

    // Raycast from camera center (where crosshair aims)
    this.camera.updateMatrixWorld();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Trace Ray along crosshair line of sight with spread
    const rayDir = raycaster.ray.direction.clone();
    
    // Spread calculation: 85% tighter spread when aiming ADS
    const spreadFactor = isAiming ? (weapon.id === 'sniper' ? 0.0005 : weapon.spread * 0.18) : weapon.spread;
    rayDir.x += (Math.random() - 0.5) * spreadFactor;
    rayDir.y += (Math.random() - 0.5) * spreadFactor;
    rayDir.normalize();

    // Line of sight ray originating from camera
    const aimRay = new THREE.Ray(raycaster.ray.origin, rayDir);

    // Check hit on pedestrians / enemies with headshot detection
    const hitResult = this.checkEnemyHits(aimRay, weapon.damage, enemies, weapon.range);

    const targetPos = hitResult
      ? hitResult.hitPos
      : handWorldPos.clone().addScaledVector(rayDir, weapon.range);

    // Create luminous tracer from gun barrel towards hit point or max distance
    this.createTracer(handWorldPos, targetPos);

    // Police crime detection: Discharging firearm in public -> 2 Stars!
    window.dispatchEvent(new CustomEvent('crime:committed', { detail: { type: 'gunfire', stars: 2 } }));

    this.notifyWeaponUpdate();
  }

  reload() {
    const weapon = this.weapons[this.currentWeaponId];
    if (this.isReloading || weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo <= 0) return;

    this.isReloading = true;
    AudioManager.playReload();

    setTimeout(() => {
      const needed = weapon.magSize - weapon.currentAmmo;
      const amountToLoad = Math.min(needed, weapon.reserveAmmo);
      weapon.currentAmmo += amountToLoad;
      weapon.reserveAmmo -= amountToLoad;
      this.isReloading = false;
      this.notifyWeaponUpdate();
    }, 1200);
  }

  createTracer(start, end) {
    const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: this.currentWeaponId === 'sniper' ? 0x00f0ff : 0xffd166,
      linewidth: this.currentWeaponId === 'sniper' ? 3 : 2
    });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);

    this.tracers.push({ mesh: line, time: 0 });
  }

  checkEnemyHits(aimRay, damage, enemies, maxRange = 85) {
    if (!enemies || !Array.isArray(enemies)) return null;

    let closestHit = null;
    let minDistance = maxRange;

    const dx = aimRay.direction.x;
    const dz = aimRay.direction.z;
    const horizDirSq = dx * dx + dz * dz;

    for (const enemy of enemies) {
      if (!enemy || enemy.isDead) continue;
      const enemyPos = typeof enemy.getPosition === 'function' ? enemy.getPosition() : (enemy.pos || enemy.mesh?.position);
      if (!enemyPos) continue;

      // Vertical 3D Capsule / Cylinder Raycast:
      // Pedestrian vertical bounding cylinder from y to y + 1.95m
      if (horizDirSq < 0.0001) continue;

      const t = ((enemyPos.x - aimRay.origin.x) * dx + (enemyPos.z - aimRay.origin.z) * dz) / horizDirSq;
      if (t <= 0.6 || t > minDistance) continue;

      const px = aimRay.origin.x + t * dx;
      const pz = aimRay.origin.z + t * dz;
      const py = aimRay.origin.y + t * aimRay.direction.y;

      const hDist = Math.hypot(px - enemyPos.x, pz - enemyPos.z);

      // Responsive hit registration: horizontal cylinder radius 0.85m, vertical bounds -0.2 to +2.1m
      if (hDist < 0.85 && py >= (enemyPos.y - 0.2) && py <= (enemyPos.y + 2.1)) {
        minDistance = t;
        const isHeadshot = py >= (enemyPos.y + 1.35);
        closestHit = {
          enemy,
          isHeadshot,
          hitPos: new THREE.Vector3(px, py, pz)
        };
      }
    }

    if (closestHit) {
      const finalDamage = closestHit.isHeadshot ? damage * 2.5 : damage;
      if (typeof closestHit.enemy.takeDamage === 'function') {
        closestHit.enemy.takeDamage(finalDamage);
      }

      // Tactile Hitmarker sound and HUD event
      AudioManager.playHitmarker(closestHit.isHeadshot);
      window.dispatchEvent(new CustomEvent('weapon:hitmarker', {
        detail: { isHeadshot: closestHit.isHeadshot, damage: Math.round(finalDamage) }
      }));

      // Blood impact sparks
      this.createImpactSparks(closestHit.hitPos, closestHit.isHeadshot ? 0xd90429 : 0xaa1122);
      return closestHit;
    }

    return null;
  }

  createImpactSparks(pos, color = 0xffe066) {
    const pGroup = new THREE.Group();
    pGroup.position.copy(pos);

    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color }));
      sp.position.set((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25);
      pGroup.add(sp);
    }

    this.scene.add(pGroup);
    setTimeout(() => this.scene.remove(pGroup), 250);
  }

  update(delta) {
    // Weapon model recoil recovery
    if (this.recoilKickZ > 0.001) {
      this.recoilKickZ = THREE.MathUtils.lerp(this.recoilKickZ, 0, 0.24);
      const activeMesh = this.weaponMeshes[this.currentWeaponId];
      if (activeMesh) {
        activeMesh.position.z = -this.recoilKickZ;
      }
    }

    // Fade tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].time += delta;
      if (this.tracers[i].time > 0.08) {
        this.scene.remove(this.tracers[i].mesh);
        this.tracers.splice(i, 1);
      }
    }
  }

  notifyWeaponUpdate() {
    const w = this.weapons[this.currentWeaponId];
    window.dispatchEvent(new CustomEvent('weapon:updated', {
      detail: {
        id: w.id,
        name: w.name,
        currentAmmo: w.currentAmmo,
        reserveAmmo: w.reserveAmmo,
        isReloading: this.isReloading
      }
    }));
  }
}
