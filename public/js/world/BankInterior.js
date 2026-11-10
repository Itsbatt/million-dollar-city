// BankInterior.js - Physical 3D Interior for Maze Bank & Vault 21

import * as THREE from '/vendor/three.module.js';

export class BankInterior {
  constructor(scene) {
    this.scene = scene;
    this.interiorGroup = new THREE.Group();
    this.interiorGroup.name = 'BankInterior';
    this.colliders = [];
    this.interactables = [];

    // Located at subterranean interior coordinates (X = 200, Y = -120, Z = 0)
    this.origin = new THREE.Vector3(200, -120, 0);
    this.interiorGroup.position.copy(this.origin);

    this.initMaterials();
    this.buildBankStructure();
    this.buildTellerCounters();
    this.buildHeavyVault();
    this.buildSecurityAndDecor();

    this.scene.add(this.interiorGroup);
  }

  initMaterials() {
    this.marbleFloorMat = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.18,
      metalness: 0.1
    });

    this.wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Stately slate banking walls
      roughness: 0.7
    });

    this.accentGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.25
    });

    this.steelVaultMat = new THREE.MeshStandardMaterial({
      color: 0x71717a,
      metalness: 0.95,
      roughness: 0.15
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.5
    });

    this.cashMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.8
    });

    this.goldBarMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.98,
      roughness: 0.15
    });
  }

  buildBankStructure() {
    // Floor (28m wide x 22m deep)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 22), this.marbleFloorMat);
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    this.interiorGroup.add(floor);

    // Ceiling with downlight panels
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(28, 0.4, 22), this.wallMat);
    ceiling.position.set(0, 5.8, 0);
    this.interiorGroup.add(ceiling);

    // Outer Walls
    const wallGeoBack = new THREE.BoxGeometry(28, 6, 0.4);
    const wallBack = new THREE.Mesh(wallGeoBack, this.wallMat);
    wallBack.position.set(0, 2.8, -11);
    this.interiorGroup.add(wallBack);
    this.addColliderBox(0, 2.8, -11, 28, 6, 0.4, 'wall');

    const wallGeoFront = new THREE.BoxGeometry(28, 6, 0.4);
    const wallFront = new THREE.Mesh(wallGeoFront, this.wallMat);
    wallFront.position.set(0, 2.8, 11);
    this.interiorGroup.add(wallFront);
    this.addColliderBox(0, 2.8, 11, 28, 6, 0.4, 'wall');

    const wallGeoSide = new THREE.BoxGeometry(0.4, 6, 22);
    const wallLeft = new THREE.Mesh(wallGeoSide, this.wallMat);
    wallLeft.position.set(-14, 2.8, 0);
    this.interiorGroup.add(wallLeft);
    this.addColliderBox(-14, 2.8, 0, 0.4, 6, 22, 'wall');

    const wallRight = new THREE.Mesh(wallGeoSide, this.wallMat);
    wallRight.position.set(14, 2.8, 0);
    this.interiorGroup.add(wallRight);
    this.addColliderBox(14, 2.8, 0, 0.4, 6, 22, 'wall');

    // Interior Ambient Lights
    const bankLight = new THREE.PointLight(0xfff5eb, 2.2, 35);
    bankLight.position.set(0, 5.0, 0);
    this.interiorGroup.add(bankLight);

    const vaultGlow = new THREE.PointLight(0x00f0ff, 1.8, 20);
    vaultGlow.position.set(8.5, 3.5, -5.5);
    this.interiorGroup.add(vaultGlow);

    // Exit Door to City (at Z = 10.5)
    const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), this.accentGoldMat);
    exitDoor.position.set(0, 1.6, 10.7);
    this.interiorGroup.add(exitDoor);

    this.interactables.push({
      type: 'EXIT_TO_CITY',
      position: new THREE.Vector3(200, -120, 9.5),
      label: 'SALIR A LA CIUDAD',
      action: 'EXIT_BANK'
    });
  }

  buildTellerCounters() {
    // Stately marble & wood teller counter separating public from staff
    const counter = new THREE.Mesh(new THREE.BoxGeometry(16, 1.15, 1.2), this.accentGoldMat);
    counter.position.set(-3, 0.58, -1.5);
    this.interiorGroup.add(counter);
    this.addColliderBox(-3, 0.58, -1.5, 16, 1.15, 1.2, 'obstacle');

    // Glass partitions
    for (let i = 0; i < 3; i++) {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.1), this.glassMat);
      glass.position.set(-7 + i * 4.2, 1.75, -1.5);
      this.interiorGroup.add(glass);

      // Teller ATM service trigger
      this.interactables.push({
        type: 'BANK_TELLER',
        position: new THREE.Vector3(200 - 7 + i * 4.2, -120, 0.2),
        label: 'OPERAR CUENTA BANCARIA',
        action: 'OPEN_ATM'
      });
    }
  }

  buildHeavyVault() {
    // Vault Partition Wall
    const vaultWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 10), this.steelVaultMat);
    vaultWall.position.set(4, 2.8, -6);
    this.interiorGroup.add(vaultWall);
    this.addColliderBox(4, 2.8, -6, 0.5, 6, 10, 'wall');

    // Heavy Circular Vault Door
    const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.6, 32), this.steelVaultMat);
    vaultDoor.rotation.z = Math.PI / 2;
    vaultDoor.position.set(4, 1.8, -6);
    this.interiorGroup.add(vaultDoor);

    // Vault Wheel Spokes Lock
    const spokeGeom = new THREE.TorusGeometry(0.65, 0.08, 16, 32);
    const spoke = new THREE.Mesh(spokeGeom, this.accentGoldMat);
    spoke.rotation.y = Math.PI / 2;
    spoke.position.set(3.6, 1.8, -6);
    this.interiorGroup.add(spoke);

    // Inside the Vault: Safe Deposit Boxes
    const lockerWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.5, 7.5), this.steelVaultMat);
    lockerWall.position.set(13.4, 1.75, -6);
    this.interiorGroup.add(lockerWall);

    // Pallets with Gold Bullion Bars
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const goldBar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 1.1), this.goldBarMat);
        goldBar.position.set(8.5 + r * 0.7, 0.2 + c * 0.18, -4.5);
        this.interiorGroup.add(goldBar);
      }
    }

    // Cash Trolley with Stacks of Bills
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.2), this.steelVaultMat);
    trolley.position.set(9.0, 0.45, -7.8);
    this.interiorGroup.add(trolley);

    const cashStack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.0), this.cashMat);
    cashStack.position.set(9.0, 1.05, -7.8);
    this.interiorGroup.add(cashStack);

    // Heist Core Robbery Interaction
    this.interactables.push({
      type: 'VAULT_HEIST_SAFE',
      position: new THREE.Vector3(200 + 9.0, -120, -7.0),
      label: 'ATRACAR CÁMARA ACORAZADA ($250,000)',
      action: 'HEIST_ROB_VAULT'
    });
  }

  buildSecurityAndDecor() {
    // Maze Bank Wall Sign
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    signBoard.position.set(-3, 4.2, -10.8);
    this.interiorGroup.add(signBoard);

    const signText = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.6, 0.25), new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8
    }));
    signText.position.set(-3, 4.2, -10.7);
    this.interiorGroup.add(signText);
  }

  addColliderBox(cx, cy, cz, w, h, d, type = 'wall') {
    this.colliders.push({
      min: new THREE.Vector3(this.origin.x + cx - w / 2, this.origin.y + cy - h / 2, this.origin.z + cz - d / 2),
      max: new THREE.Vector3(this.origin.x + cx + w / 2, this.origin.y + cy + h / 2, this.origin.z + cz + d / 2),
      type
    });
  }
}
