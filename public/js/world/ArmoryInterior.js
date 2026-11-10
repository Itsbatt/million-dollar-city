// ArmoryInterior.js - Physical 3D Interior for Ammu-Nation Gun Store

import * as THREE from '/vendor/three.module.js';

export class ArmoryInterior {
  constructor(scene) {
    this.scene = scene;
    this.interiorGroup = new THREE.Group();
    this.interiorGroup.name = 'ArmoryInterior';
    this.colliders = [];
    this.interactables = [];

    // Situated at interior coordinates (X = -200, Y = -120, Z = 0)
    this.origin = new THREE.Vector3(-200, -120, 0);
    this.interiorGroup.position.copy(this.origin);

    this.initMaterials();
    this.buildArmoryStructure();
    this.buildWeaponCounters();
    this.buildWallRacks();
    this.buildShopkeeperNPC();

    this.scene.add(this.interiorGroup);
  }

  initMaterials() {
    this.woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.6
    });

    this.wallMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // Gunmetal dark tactical walls
      roughness: 0.8
    });

    this.gunMetalMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.9,
      roughness: 0.25
    });

    this.woodStockMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.5
    });

    this.neonRedMat = new THREE.MeshStandardMaterial({
      color: 0xff2a4d,
      emissive: 0xff2a4d,
      emissiveIntensity: 0.9
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.88,
      transparent: true,
      roughness: 0.1
    });
  }

  buildArmoryStructure() {
    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 18), this.woodFloorMat);
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    this.interiorGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 18), this.wallMat);
    ceiling.position.set(0, 5.4, 0);
    this.interiorGroup.add(ceiling);

    // Outer Walls
    const wallGeoBack = new THREE.BoxGeometry(22, 5.6, 0.4);
    const wallBack = new THREE.Mesh(wallGeoBack, this.wallMat);
    wallBack.position.set(0, 2.6, -9);
    this.interiorGroup.add(wallBack);
    this.addColliderBox(0, 2.6, -9, 22, 5.6, 0.4, 'wall');

    const wallGeoFront = new THREE.BoxGeometry(22, 5.6, 0.4);
    const wallFront = new THREE.Mesh(wallGeoFront, this.wallMat);
    wallFront.position.set(0, 2.6, 9);
    this.interiorGroup.add(wallFront);
    this.addColliderBox(0, 2.6, 9, 22, 5.6, 0.4, 'wall');

    const wallGeoSide = new THREE.BoxGeometry(0.4, 5.6, 18);
    const wallLeft = new THREE.Mesh(wallGeoSide, this.wallMat);
    wallLeft.position.set(-11, 2.6, 0);
    this.interiorGroup.add(wallLeft);
    this.addColliderBox(-11, 2.6, 0, 0.4, 5.6, 18, 'wall');

    const wallRight = new THREE.Mesh(wallGeoSide, this.wallMat);
    wallRight.position.set(11, 2.6, 0);
    this.interiorGroup.add(wallRight);
    this.addColliderBox(11, 2.6, 0, 0.4, 5.6, 18, 'wall');

    // Interior Warm Sodium Lights
    const storeLight = new THREE.PointLight(0xffeedd, 2.4, 30);
    storeLight.position.set(0, 4.5, 0);
    this.interiorGroup.add(storeLight);

    // Ammu-Nation Neon Signboard
    const banner = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.2), this.neonRedMat);
    banner.position.set(0, 4.2, -8.8);
    this.interiorGroup.add(banner);

    // Exit Door (at Z = 8.5)
    const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    exitDoor.position.set(0, 1.6, 8.8);
    this.interiorGroup.add(exitDoor);

    this.interactables.push({
      type: 'EXIT_TO_CITY',
      position: new THREE.Vector3(-200, -120, 7.8),
      label: 'SALIR A LA CIUDAD',
      action: 'EXIT_ARMORY'
    });
  }

  buildWeaponCounters() {
    // Glass Display Counter
    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    counterBase.position.set(0, 0.55, -2.5);
    this.interiorGroup.add(counterBase);
    this.addColliderBox(0, 0.55, -2.5, 12, 1.1, 1.4, 'obstacle');

    const glassTop = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.4, 1.2), this.glassMat);
    glassTop.position.set(0, 1.25, -2.5);
    this.interiorGroup.add(glassTop);

    // Interactive Shop Counter Trigger
    this.interactables.push({
      type: 'ARMORY_SHOP_COUNTER',
      position: new THREE.Vector3(-200, -120, -0.8),
      label: 'ABRIR TIENDA DE ARMAS Y MUNICIÓN',
      action: 'OPEN_ARMORY_STORE'
    });
  }

  buildWallRacks() {
    // Wall Racks along the back wall showing Rifles, Shotguns, and Snipers
    for (let i = 0; i < 5; i++) {
      const rackX = -6 + i * 3.0;

      // Wooden Backboard
      const rack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 0.15), this.woodStockMat);
      rack.position.set(rackX, 2.6, -8.8);
      this.interiorGroup.add(rack);

      // Low-poly Assault Rifle Model on Rack
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6), this.gunMetalMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(rackX, 2.8, -8.65);
      this.interiorGroup.add(barrel);

      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.1), this.gunMetalMat);
      receiver.position.set(rackX, 2.8, -8.65);
      this.interiorGroup.add(receiver);

      const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.08), this.gunMetalMat);
      magazine.position.set(rackX + 0.1, 2.6, -8.65);
      this.interiorGroup.add(magazine);
    }
  }

  buildShopkeeperNPC() {
    // Low-poly Gun Shopkeeper standing behind the counter
    const keeper = new THREE.Group();
    keeper.position.set(0, 0, -4.0);

    // Body (Torso in flannel shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.35), new THREE.MeshStandardMaterial({ color: 0x8b0000 }));
    torso.position.set(0, 1.25, 0);
    keeper.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.38, 0.35), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
    head.position.set(0, 1.85, 0);
    keeper.add(head);

    // Cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    cap.position.set(0, 2.05, 0.05);
    keeper.add(cap);

    this.interiorGroup.add(keeper);
    this.addColliderBox(0, 1.0, -4.0, 0.8, 2.0, 0.8, 'npc');
  }

  addColliderBox(cx, cy, cz, w, h, d, type = 'wall') {
    this.colliders.push({
      min: new THREE.Vector3(this.origin.x + cx - w / 2, this.origin.y + cy - h / 2, this.origin.z + cz - d / 2),
      max: new THREE.Vector3(this.origin.x + cx + w / 2, this.origin.y + cy + h / 2, this.origin.z + cz + d / 2),
      type
    });
  }
}
