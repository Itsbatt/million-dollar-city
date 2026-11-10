// PenthouseInterior.js - 3D Luxury Penthouse & 15 Suites Floor for Dynasty 8 Plaza
// Million Dollar City

import * as THREE from '/vendor/three.module.js';

export class PenthouseInterior {
  constructor(scene) {
    this.scene = scene;
    this.interiorGroup = new THREE.Group();
    this.interiorGroup.name = 'PenthouseInterior';
    this.colliders = [];
    this.interactables = [];

    // Interior Origin at (X: 300, Y: -120, Z: 0)
    this.origin = new THREE.Vector3(300, -120, 0);
    this.interiorGroup.position.copy(this.origin);

    // Active upgrades cache
    this.upgrades = this.loadUpgrades();
    this.upgradeMeshes = {};
    this.smokeParticles = [];

    this.initMaterials();
    this.buildGrandCorridor();
    this.build15SuiteDoors();
    this.buildPlayerPresidentialSuite();
    this.buildCitySkylineWindow();
    this.refreshUpgradeVisuals();

    this.scene.add(this.interiorGroup);
  }

  loadUpgrades() {
    try {
      const saved = localStorage.getItem('mdc_suite_upgrades');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveUpgrades() {
    try {
      localStorage.setItem('mdc_suite_upgrades', JSON.stringify(this.upgrades));
    } catch (e) {}
  }

  hasUpgrade(id) {
    return !!this.upgrades[id];
  }

  installUpgrade(id) {
    this.upgrades[id] = true;
    this.saveUpgrades();
    this.refreshUpgradeVisuals();
  }

  getOrigin() {
    return this.origin.clone();
  }

  initMaterials() {
    // Luxury materials
    this.carpetMat = new THREE.MeshStandardMaterial({
      color: 0x5a121d, // Deep royal wine velvet carpet
      roughness: 0.85
    });

    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2
    });

    this.woodWallMat = new THREE.MeshStandardMaterial({
      color: 0x241611, // Rich dark mahogany
      roughness: 0.6
    });

    this.marbleFloorMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Polished black Nero Marquina marble
      metalness: 0.3,
      roughness: 0.15
    });

    this.whiteCeilingMat = new THREE.MeshStandardMaterial({
      color: 0xefedea,
      roughness: 0.9
    });

    this.doorMat = new THREE.MeshStandardMaterial({
      color: 0x3d2314, // Dark walnut door
      roughness: 0.5
    });

    this.brassHandleMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      metalness: 0.95,
      roughness: 0.2
    });

    this.leatherSofaMat = new THREE.MeshStandardMaterial({
      color: 0xdedede, // Crisp off-white Italian designer leather
      roughness: 0.4
    });

    this.glassWindowMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transmission: 0.9,
      transparent: true,
      opacity: 0.4,
      roughness: 0.05
    });
  }

  // -------------------------------------------------------------
  // GRAND CORRIDOR (Z = -38 to +38, X = -4.5 to +4.5)
  // -------------------------------------------------------------
  buildGrandCorridor() {
    const corridorLength = 76;
    const corridorWidth = 9;
    const ceilingHeight = 5.2;

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth, 0.4, corridorLength), this.marbleFloorMat);
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    this.interiorGroup.add(floor);

    // Red Carpet Runner
    const runner = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, corridorLength - 4), this.carpetMat);
    runner.position.set(0, 0.02, 0);
    runner.receiveShadow = true;
    this.interiorGroup.add(runner);

    // Ceiling with recessed warm light panels
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth, 0.4, corridorLength), this.whiteCeilingMat);
    ceiling.position.set(0, ceilingHeight, 0);
    this.interiorGroup.add(ceiling);

    // Side Walls
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, ceilingHeight, corridorLength), this.woodWallMat);
    wallLeft.position.set(-corridorWidth / 2, ceilingHeight / 2, 0);
    this.interiorGroup.add(wallLeft);
    this.addColliderBox(-corridorWidth / 2, ceilingHeight / 2, 0, 0.4, ceilingHeight, corridorLength, 'corridor_wall');

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, ceilingHeight, corridorLength), this.woodWallMat);
    wallRight.position.set(corridorWidth / 2, ceilingHeight / 2, 0);
    this.interiorGroup.add(wallRight);
    this.addColliderBox(corridorWidth / 2, ceilingHeight / 2, 0, 0.4, ceilingHeight, corridorLength, 'corridor_wall');

    // End Wall North (Z = -corridorLength/2)
    const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth, ceilingHeight, 0.4), this.woodWallMat);
    wallNorth.position.set(0, ceilingHeight / 2, -corridorLength / 2);
    this.interiorGroup.add(wallNorth);
    this.addColliderBox(0, ceilingHeight / 2, -corridorLength / 2, corridorWidth, ceilingHeight, 0.4, 'corridor_wall');

    // End Wall South (Elevator Exit) (Z = +corridorLength/2)
    const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(corridorWidth, ceilingHeight, 0.4), this.woodWallMat);
    wallSouth.position.set(0, ceilingHeight / 2, corridorLength / 2);
    this.interiorGroup.add(wallSouth);
    this.addColliderBox(0, ceilingHeight / 2, corridorLength / 2, corridorWidth, ceilingHeight, 0.4, 'corridor_wall');

    // Elevator Exit Doors to Dynasty 8 Exterior
    this.buildElevatorExit(0, corridorLength / 2 - 0.3);

    // Corridor Chandelier & Sconce Lighting
    for (let z = -30; z <= 30; z += 12) {
      const light = new THREE.PointLight(0xffeedd, 1.8, 16);
      light.position.set(0, ceilingHeight - 0.6, z);
      this.interiorGroup.add(light);

      // Chandelier brass ring
      const chandelier = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 24), this.goldTrimMat);
      chandelier.position.set(0, ceilingHeight - 0.5, z);
      chandelier.rotation.x = Math.PI / 2;
      this.interiorGroup.add(chandelier);
    }
  }

  buildElevatorExit(x, z) {
    const elGroup = new THREE.Group();
    elGroup.position.set(x, 0, z);

    // Gold elevator trim frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.8, 0.25), this.goldTrimMat);
    frame.position.set(0, 1.9, 0);
    elGroup.add(frame);

    // Sliding mirrored elevator doors
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.95, roughness: 0.1 });
    const doors = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.4, 0.15), mirrorMat);
    doors.position.set(0, 1.7, 0.05);
    elGroup.add(doors);

    // Indicator Light
    const indMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.5 });
    const ind = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.1), indMat);
    ind.position.set(0, 3.6, 0.15);
    elGroup.add(ind);

    this.interiorGroup.add(elGroup);

    // Elevator Exit Trigger
    this.interactables.push({
      type: 'PENTHOUSE_EXIT',
      position: new THREE.Vector3(this.origin.x + x, this.origin.y + 0.8, this.origin.z + z - 2.0),
      promptText: '[E] Salir a Dynasty 8 Plaza (Exterior)',
      radius: 2.8
    });
  }

  // -------------------------------------------------------------
  // 15 SUITE DOORS (Suites 101 to 115)
  // -------------------------------------------------------------
  build15SuiteDoors() {
    const corridorWidth = 9;
    const roomPositions = [
      // Left Wall (X = -4.3): Suites 101, 103, 105, 107 (PLAYER), 109, 111, 113
      { suiteNum: 101, side: 'left', z: -28, isPlayer: false },
      { suiteNum: 103, side: 'left', z: -19, isPlayer: false },
      { suiteNum: 105, side: 'left', z: -10, isPlayer: false },
      { suiteNum: 107, side: 'left', z: 0, isPlayer: true }, // PLAYER PRESIDENTIAL SUITE
      { suiteNum: 109, side: 'left', z: 10, isPlayer: false },
      { suiteNum: 111, side: 'left', z: 19, isPlayer: false },
      { suiteNum: 113, side: 'left', z: 28, isPlayer: false },

      // Right Wall (X = +4.3): Suites 102, 104, 106, 108, 110, 112, 114, 115
      { suiteNum: 102, side: 'right', z: -28, isPlayer: false },
      { suiteNum: 104, side: 'right', z: -20, isPlayer: false },
      { suiteNum: 106, side: 'right', z: -12, isPlayer: false },
      { suiteNum: 108, side: 'right', z: -4, isPlayer: false },
      { suiteNum: 110, side: 'right', z: 4, isPlayer: false },
      { suiteNum: 112, side: 'right', z: 12, isPlayer: false },
      { suiteNum: 114, side: 'right', z: 20, isPlayer: false },
      { suiteNum: 115, side: 'right', z: 28, isPlayer: false }
    ];

    roomPositions.forEach((room) => {
      const isLeft = room.side === 'left';
      const doorX = isLeft ? -corridorWidth / 2 + 0.15 : corridorWidth / 2 - 0.15;
      const doorRotY = isLeft ? Math.PI / 2 : -Math.PI / 2;

      const doorGroup = new THREE.Group();
      doorGroup.position.set(doorX, 0, room.z);
      doorGroup.rotation.y = doorRotY;

      // Door Frame
      const frameMat = room.isPlayer ? this.goldTrimMat : this.woodWallMat;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.4, 0.25), frameMat);
      frame.position.set(0, 1.7, 0);
      doorGroup.add(frame);

      // Door Leaf
      const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.1, 0.12), this.doorMat);
      doorLeaf.position.set(0, 1.55, 0.04);
      doorGroup.add(doorLeaf);

      // Brass Handle
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), this.brassHandleMat);
      handle.position.set(0.65, 1.45, 0.15);
      doorGroup.add(handle);

      // Gold Room Number Plaque
      const plaqueMat = new THREE.MeshStandardMaterial({
        color: room.isPlayer ? 0xffd700 : 0xd4af37,
        emissive: room.isPlayer ? 0xffbb00 : 0x443300,
        emissiveIntensity: room.isPlayer ? 0.6 : 0.2,
        metalness: 0.9,
        roughness: 0.2
      });
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.08), plaqueMat);
      plaque.position.set(0, 3.1, 0.14);
      doorGroup.add(plaque);

      // If player's suite, add an extra luxury golden crown beacon
      if (room.isPlayer) {
        const crownBeacon = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.4, 6),
          new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1.2 })
        );
        crownBeacon.position.set(0, 3.65, 0.15);
        crownBeacon.rotation.z = Math.PI;
        doorGroup.add(crownBeacon);

        const suiteGlow = new THREE.PointLight(0xffd700, 1.4, 8);
        suiteGlow.position.set(0, 2.5, 0.8);
        doorGroup.add(suiteGlow);
      }

      this.interiorGroup.add(doorGroup);

      // Interaction registration
      const triggerPos = new THREE.Vector3(
        this.origin.x + (isLeft ? doorX + 1.6 : doorX - 1.6),
        this.origin.y + 0.8,
        this.origin.z + room.z
      );

      if (room.isPlayer) {
        this.interactables.push({
          type: 'PENTHOUSE_SUITE_DOOR',
          suiteNum: 107,
          position: triggerPos,
          promptText: '[E] Entrar a tu Suite Presidencial (Suite 107)',
          radius: 2.6
        });
      } else {
        this.interactables.push({
          type: 'LOCKED_SUITE_DOOR',
          suiteNum: room.suiteNum,
          position: triggerPos,
          promptText: `[E] Suite ${room.suiteNum} (Acceso VIP Restringido)`,
          radius: 2.2
        });
      }
    });
  }

  // -------------------------------------------------------------
  // PLAYER PRESIDENTIAL SUITE 107 (Interior Room)
  // Situated at X: +35 relative to Penthouse origin (X: 335, Y: -120, Z: 0)
  // -------------------------------------------------------------
  buildPlayerPresidentialSuite() {
    this.suiteOrigin = new THREE.Vector3(35, 0, 0);
    const suiteGroup = new THREE.Group();
    suiteGroup.position.copy(this.suiteOrigin);

    const roomW = 28; // width along X
    const roomD = 22; // depth along Z
    const roomH = 5.6;

    // Floor (Polished black marble)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.4, roomD), this.marbleFloorMat);
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    suiteGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.4, roomD), this.whiteCeilingMat);
    ceiling.position.set(0, roomH, 0);
    suiteGroup.add(ceiling);

    // Walls
    // South Wall (with entrance door back to corridor)
    const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.4), this.woodWallMat);
    wallSouth.position.set(0, roomH / 2, roomD / 2);
    suiteGroup.add(wallSouth);
    this.addColliderBox(35, roomH / 2, roomD / 2, roomW, roomH, 0.4, 'suite_wall');

    // North Wall (Panoramic Floor-to-Ceiling Glass Window overlooking City Skyline)
    const wallNorthFrameTop = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.6, 0.4), this.goldTrimMat);
    wallNorthFrameTop.position.set(0, roomH - 0.3, -roomD / 2);
    suiteGroup.add(wallNorthFrameTop);

    const panoramicWindow = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH - 0.6, 0.2), this.glassWindowMat);
    panoramicWindow.position.set(0, (roomH - 0.6) / 2, -roomD / 2);
    suiteGroup.add(panoramicWindow);
    this.addColliderBox(35, roomH / 2, -roomD / 2, roomW, roomH, 0.4, 'suite_window');

    // West Wall (Dividing corridor and suite)
    const wallWest = new THREE.Mesh(new THREE.BoxGeometry(0.4, roomH, roomD), this.woodWallMat);
    wallWest.position.set(-roomW / 2, roomH / 2, 0);
    suiteGroup.add(wallWest);
    this.addColliderBox(35 - roomW / 2, roomH / 2, 0, 0.4, roomH, roomD, 'suite_wall');

    // East Wall
    const wallEast = new THREE.Mesh(new THREE.BoxGeometry(0.4, roomH, roomD), this.woodWallMat);
    wallEast.position.set(roomW / 2, roomH / 2, 0);
    suiteGroup.add(wallEast);
    this.addColliderBox(35 + roomW / 2, roomH / 2, 0, 0.4, roomH, roomD, 'suite_wall');

    // Exit Door to return to Corridor (at X: -roomW/2 + 0.3, Z: 0)
    const suiteExitGroup = new THREE.Group();
    suiteExitGroup.position.set(-roomW / 2 + 0.2, 0, 0);
    suiteExitGroup.rotation.y = Math.PI / 2;

    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 0.15), this.doorMat);
    doorLeaf.position.set(0, 1.6, 0);
    suiteExitGroup.add(doorLeaf);

    const exitSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.0 })
    );
    exitSign.position.set(0, 3.4, 0.1);
    suiteExitGroup.add(exitSign);
    suiteGroup.add(suiteExitGroup);

    // Register Suite Exit Door Trigger
    this.interactables.push({
      type: 'SUITE_EXIT_TO_CORRIDOR',
      position: new THREE.Vector3(this.origin.x + 35 - roomW / 2 + 2.0, this.origin.y + 0.8, this.origin.z),
      promptText: '[E] Salir al Pasillo de Suites',
      radius: 2.8
    });

    // -----------------------------------------------------------
    // LIVING ROOM FURNITURE
    // -----------------------------------------------------------
    // Large L-Shaped Designer Leather Sofa
    const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 1.6), this.leatherSofaMat);
    sofaMain.position.set(-2, 0.45, -2);
    suiteGroup.add(sofaMain);
    this.addColliderBox(35 - 2, 0.45, -2, 5.2, 0.9, 1.6, 'sofa');

    const sofaL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 3.2), this.leatherSofaMat);
    sofaL.position.set(0.6, 0.45, 0.4);
    suiteGroup.add(sofaL);
    this.addColliderBox(35 + 0.6, 0.45, 0.4, 1.6, 0.9, 3.2, 'sofa');

    // Coffee Table (Tempered glass + gold frame)
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.45, 1.8), this.goldTrimMat);
    coffeeTable.position.set(-2.0, 0.22, 0.6);
    suiteGroup.add(coffeeTable);
    this.addColliderBox(35 - 2.0, 0.22, 0.6, 3.0, 0.45, 1.8, 'coffee_table');

    // Terminal / Tablet on Coffee Table: Suite Customizer Trigger
    const tabletMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.6 });
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.35), tabletMat);
    tablet.position.set(-2.0, 0.48, 0.6);
    suiteGroup.add(tablet);

    this.interactables.push({
      type: 'SUITE_CUSTOMIZER_TERMINAL',
      position: new THREE.Vector3(this.origin.x + 35 - 2.0, this.origin.y + 0.8, this.origin.z + 0.6),
      promptText: '[E] Terminal de Mejoras y Decoraciones de la Suite 👑',
      radius: 2.8
    });

    // -----------------------------------------------------------
    // MASTER BED (Default Base Bed)
    // -----------------------------------------------------------
    this.defaultBedGroup = new THREE.Group();
    this.defaultBedGroup.position.set(8.5, 0, -5.5);

    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 4.8), this.woodWallMat);
    bedBase.position.set(0, 0.3, 0);
    this.defaultBedGroup.add(bedBase);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.5, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
    );
    mattress.position.set(0, 0.7, 0);
    this.defaultBedGroup.add(mattress);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, 0.4), this.goldTrimMat);
    headboard.position.set(0, 1.3, -2.3);
    this.defaultBedGroup.add(headboard);

    suiteGroup.add(this.defaultBedGroup);
    this.addColliderBox(35 + 8.5, 0.6, -5.5, 4.2, 1.2, 4.8, 'bed');

    // Warm Ambient Suite Lights
    const suiteLight1 = new THREE.PointLight(0xffe5cc, 2.2, 25);
    suiteLight1.position.set(-2, 4.8, 0);
    suiteGroup.add(suiteLight1);

    const suiteLight2 = new THREE.PointLight(0xffd700, 1.8, 20);
    suiteLight2.position.set(8.5, 4.8, -5);
    suiteGroup.add(suiteLight2);

    this.interiorGroup.add(suiteGroup);
  }

  // -------------------------------------------------------------
  // PANORAMIC 3D MINIATURE SKYLINE (Visible through windows)
  // -------------------------------------------------------------
  buildCitySkylineWindow() {
    const skylineGroup = new THREE.Group();
    skylineGroup.position.set(35, 0, -18);

    // Distant glowing skyscrapers
    const towerColors = [0x00f0ff, 0xff0055, 0xffd700, 0x7928ca, 0x00ff88];
    for (let i = 0; i < 18; i++) {
      const h = 14 + Math.random() * 22;
      const w = 4 + Math.random() * 5;
      const col = towerColors[i % towerColors.length];
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, w),
        new THREE.MeshStandardMaterial({
          color: 0x090d16,
          emissive: col,
          emissiveIntensity: 0.25,
          roughness: 0.3
        })
      );
      tower.position.set(-28 + i * 3.4 + (Math.random() - 0.5) * 2, h / 2 - 6, -10 - Math.random() * 25);
      skylineGroup.add(tower);

      // Skyscraper beacon on roof
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0033 })
      );
      beacon.position.set(tower.position.x, tower.position.y + h / 2 + 0.3, tower.position.z);
      skylineGroup.add(beacon);
    }

    this.interiorGroup.add(skylineGroup);
  }

  // -------------------------------------------------------------
  // REFRESH 3D UPGRADE OBJECTS
  // -------------------------------------------------------------
  refreshUpgradeVisuals() {
    // 1. SHISHA VIP (On the Coffee Table)
    if (this.hasUpgrade('shisha') && !this.upgradeMeshes.shisha) {
      const shishaGroup = new THREE.Group();
      shishaGroup.position.set(35 - 2.8, 0.45, 0.6);

      // Glass bowl & golden pipe
      const glassBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 12),
        new THREE.MeshPhysicalMaterial({ color: 0xffd700, transmission: 0.85, transparent: true })
      );
      glassBase.position.set(0, 0.2, 0);
      shishaGroup.add(glassBase);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), this.goldTrimMat);
      stem.position.set(0, 0.55, 0);
      shishaGroup.add(stem);

      const coalBowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.08, 0.15, 10),
        new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff4400, emissiveIntensity: 1.5 })
      );
      coalBowl.position.set(0, 0.95, 0);
      shishaGroup.add(coalBowl);

      // Glowing light
      const shishaLight = new THREE.PointLight(0xff6600, 1.2, 4);
      shishaLight.position.set(0, 1.0, 0);
      shishaGroup.add(shishaLight);

      this.interiorGroup.add(shishaGroup);
      this.upgradeMeshes.shisha = shishaGroup;

      // Add puff interactable
      this.interactables.push({
        type: 'SHISHA_PUFF',
        position: new THREE.Vector3(this.origin.x + 35 - 2.8, this.origin.y + 0.8, this.origin.z + 0.6),
        promptText: '[E] Fumar Shisha VIP de Humo Dorado 💨',
        radius: 2.2
      });
    }

    // 2. PANTALLA GIGANTE 8K OLED (On West Wall above console)
    if (this.hasUpgrade('screen8k') && !this.upgradeMeshes.screen8k) {
      const tvGroup = new THREE.Group();
      tvGroup.position.set(35 - 13.7, 2.8, 0);
      tvGroup.rotation.y = Math.PI / 2;

      const tvFrame = new THREE.Mesh(
        new THREE.BoxGeometry(8.5, 4.4, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 })
      );
      tvGroup.add(tvFrame);

      const tvScreen = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 4.1, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x7928ca,
          emissiveIntensity: 1.4,
          roughness: 0.1
        })
      );
      tvScreen.position.set(0, 0, 0.06);
      tvGroup.add(tvScreen);

      const tvGlow = new THREE.PointLight(0x7928ca, 2.5, 15);
      tvGlow.position.set(0, 0, 1.5);
      tvGroup.add(tvGlow);

      this.interiorGroup.add(tvGroup);
      this.upgradeMeshes.screen8k = tvGroup;
    }

    // 3. HI-FI BANG & OLUFSEN SOUND TOWERS
    if (this.hasUpgrade('hifi_audio') && !this.upgradeMeshes.hifi_audio) {
      const hifiGroup = new THREE.Group();
      [-4.6, 4.6].forEach((offsetZ) => {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.35, 3.6, 16),
          new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })
        );
        tower.position.set(35 - 13.5, 1.8, offsetZ);
        hifiGroup.add(tower);

        const neonRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.02, 8, 18),
          new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 2.0 })
        );
        neonRing.position.set(35 - 13.5, 3.2, offsetZ);
        neonRing.rotation.x = Math.PI / 2;
        hifiGroup.add(neonRing);
      });

      this.interiorGroup.add(hifiGroup);
      this.upgradeMeshes.hifi_audio = hifiGroup;
    }

    // 4. CAMA IMPERIAL DE ORO Y SEDA
    if (this.hasUpgrade('gold_bed') && !this.upgradeMeshes.gold_bed) {
      if (this.defaultBedGroup) this.defaultBedGroup.visible = false;

      const goldBedGroup = new THREE.Group();
      goldBedGroup.position.set(35 + 8.5, 0, -5.5);

      // Gilded base
      const goldBase = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 5.0), this.goldTrimMat);
      goldBase.position.set(0, 0.35, 0);
      goldBedGroup.add(goldBase);

      // Deep Red Silk Mattress & Duvet
      const silkDuvet = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.6, 4.6),
        new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.3 })
      );
      silkDuvet.position.set(0, 0.8, 0);
      goldBedGroup.add(silkDuvet);

      // Imperial Gold Pillars & Canopy
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.8, 0.5), this.goldTrimMat);
      headboard.position.set(0, 2.0, -2.4);
      goldBedGroup.add(headboard);

      this.interiorGroup.add(goldBedGroup);
      this.upgradeMeshes.gold_bed = goldBedGroup;
    }

    // 5. JACUZZI PRIVADO LED
    if (this.hasUpgrade('jacuzzi') && !this.upgradeMeshes.jacuzzi) {
      const jacGroup = new THREE.Group();
      jacGroup.position.set(35 + 8.5, 0, 5.5);

      // Marble circular tub
      const tub = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.6, 1.4, 24),
        new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.4, roughness: 0.15 })
      );
      tub.position.set(0, 0.7, 0);
      jacGroup.add(tub);

      // Bubbling Water Surface
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x00c8ff,
        emissive: 0x0077be,
        emissiveIntensity: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
      });
      const water = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.1, 24), waterMat);
      water.position.set(0, 1.25, 0);
      jacGroup.add(water);

      const jacLight = new THREE.PointLight(0x00ffff, 2.2, 8);
      jacLight.position.set(0, 1.6, 0);
      jacGroup.add(jacLight);

      this.interiorGroup.add(jacGroup);
      this.upgradeMeshes.jacuzzi = jacGroup;
      this.addColliderBox(35 + 8.5, 0.7, 5.5, 5.6, 1.4, 5.6, 'jacuzzi');
    }

    // 6. MINIBAR VIP & CAVA DE CHAMPÁN
    if (this.hasUpgrade('minibar') && !this.upgradeMeshes.minibar) {
      const barGroup = new THREE.Group();
      barGroup.position.set(35 - 2.0, 0, 7.5);

      // Luxury walnut and gold cabinet
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 1.4), this.woodWallMat);
      cabinet.position.set(0, 1.3, 0);
      barGroup.add(cabinet);

      // Lit glass showcase
      const showcase = new THREE.Mesh(
        new THREE.BoxGeometry(4.1, 1.8, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.8 })
      );
      showcase.position.set(0, 1.6, 0.6);
      barGroup.add(showcase);

      this.interiorGroup.add(barGroup);
      this.upgradeMeshes.minibar = barGroup;
      this.addColliderBox(35 - 2.0, 1.3, 7.5, 4.5, 2.6, 1.4, 'minibar');

      // Add Minibar interaction to drink champagne!
      this.interactables.push({
        type: 'MINIBAR_CHAMPAGNE',
        position: new THREE.Vector3(this.origin.x + 35 - 2.0, this.origin.y + 0.8, this.origin.z + 6.0),
        promptText: '[E] Servir Copa de Champán VIP de la Cava 🍾',
        radius: 2.6
      });
    }
  }

  addColliderBox(localX, localY, localZ, sizeX, sizeY, sizeZ, id = 'wall') {
    const worldX = this.origin.x + localX;
    const worldY = this.origin.y + localY;
    const worldZ = this.origin.z + localZ;

    const min = new THREE.Vector3(worldX - sizeX / 2, worldY - sizeY / 2, worldZ - sizeZ / 2);
    const max = new THREE.Vector3(worldX + sizeX / 2, worldY + sizeY / 2, worldZ + sizeZ / 2);

    this.colliders.push({
      id: `penthouse_${id}_${this.colliders.length}`,
      box: new THREE.Box3(min, max)
    });
  }

  update(delta) {
    // Dynamic pulsing / animations inside the suite
    if (this.upgradeMeshes.screen8k) {
      const time = performance.now() * 0.002;
      const hue = (Math.sin(time) * 0.5 + 0.5);
      const light = this.upgradeMeshes.screen8k.children.find(c => c.isPointLight);
      if (light) {
        light.intensity = 2.0 + Math.sin(time * 3) * 0.5;
      }
    }
  }
}
