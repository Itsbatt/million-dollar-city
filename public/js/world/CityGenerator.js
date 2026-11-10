import * as THREE from '/vendor/three.module.js';

export class CityGenerator {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.trafficLights = [];
    this.neonSigns = [];
    this.doors = []; // interactive entrances (Casino, Bank, etc.)
    this.landmarks = {};

    this.initCityMaterials();
  }

  initCityMaterials() {
    // High-end PBR and architectural materials
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.85,
      metalness: 0.1
    });

    this.roadLineWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xefefef,
      roughness: 0.5
    });

    this.roadLineYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      roughness: 0.5
    });

    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x6e7075,
      roughness: 0.7,
      metalness: 0.05
    });

    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0x4a4b4e,
      roughness: 0.8
    });

    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.75
    });

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.25
    });

    this.marbleMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.35,
      metalness: 0.1
    });

    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x44464d,
      roughness: 0.9
    });

    this.darkBrickMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d30,
      roughness: 0.85
    });
  }

  generate() {
    console.log('[World] Building Diamond Strip & Downtown Metropolis...');

    // 1. Ground Plane (Surrounding base expanded for metropolis)
    const groundGeom = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Roads & Boulevard Grid
    this.buildRoadNetwork();

    // 3. Iconic Landmark Buildings
    this.buildRoyalMirageCasino();
    this.buildVault21Bank();
    this.buildAmmuNation();
    this.buildClubVelvet();
    this.buildLiquorStore();
    this.buildDealership();
    this.buildChopShopGarage();
    this.buildPoliceHeadquarters();
    this.buildStreetDealerAlley();
    this.buildDowntownSkyscrapers();
    this.buildCommercialBoutiques();
    this.buildExpandedMetropolisDistricts();

    // 4. Urban Furniture & Props (Traffic lights, streetlamps, trees, benches, hydrants)
    this.buildUrbanProps();

    console.log(`[World] Generated city with ${this.colliders.length} collision sectors.`);
    return {
      colliders: this.colliders,
      doors: this.doors,
      neonSigns: this.neonSigns,
      trafficLights: this.trafficLights,
      landmarks: this.landmarks
    };
  }

  // -------------------------------------------------------------
  // ROAD NETWORK & BOULEVARDS
  // -------------------------------------------------------------

  buildRoadNetwork() {
    const roadGroup = new THREE.Group();
    roadGroup.name = 'RoadNetwork';
    this.scene.add(roadGroup);

    // Central Boulevard: "Diamond Strip" (Runs Z: -360 to +360, width: 28m)
    const mainAvenueGeom = new THREE.PlaneGeometry(28, 720);
    const mainAvenue = new THREE.Mesh(mainAvenueGeom, this.asphaltMat);
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.receiveShadow = true;
    roadGroup.add(mainAvenue);

    // Main Avenue Road Markings: Double yellow center line
    for (let z = -350; z < 350; z += 8) {
      const yellowL = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.5), this.roadLineYellowMat);
      yellowL.rotation.x = -Math.PI / 2;
      yellowL.position.set(-0.25, 0.01, z);
      roadGroup.add(yellowL);

      const yellowR = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.5), this.roadLineYellowMat);
      yellowR.rotation.x = -Math.PI / 2;
      yellowR.position.set(0.25, 0.01, z);
      roadGroup.add(yellowR);

      // White lane dividers (left & right lanes)
      const whiteL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 4.0), this.roadLineWhiteMat);
      whiteL.rotation.x = -Math.PI / 2;
      whiteL.position.set(-6.5, 0.01, z);
      roadGroup.add(whiteL);

      const whiteR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 4.0), this.roadLineWhiteMat);
      whiteR.rotation.x = -Math.PI / 2;
      whiteR.position.set(6.5, 0.01, z);
      roadGroup.add(whiteR);
    }

    // Cross Street 1: "Fortune Way" (X: -260 to +260, Z: 0, width: 20m)
    const crossStreet1 = new THREE.Mesh(new THREE.PlaneGeometry(520, 20), this.asphaltMat);
    crossStreet1.rotation.x = -Math.PI / 2;
    crossStreet1.position.set(0, 0.005, 0);
    crossStreet1.receiveShadow = true;
    roadGroup.add(crossStreet1);

    // Cross Street 2: "Sunset Boulevard" (Z: 165, width: 20m)
    const crossStreet2 = new THREE.Mesh(new THREE.PlaneGeometry(520, 20), this.asphaltMat);
    crossStreet2.rotation.x = -Math.PI / 2;
    crossStreet2.position.set(0, 0.005, 165);
    crossStreet2.receiveShadow = true;
    roadGroup.add(crossStreet2);

    // Cross Street 3: "Industrial & Port Highway" (Z: -165, width: 20m)
    const crossStreet3 = new THREE.Mesh(new THREE.PlaneGeometry(520, 20), this.asphaltMat);
    crossStreet3.rotation.x = -Math.PI / 2;
    crossStreet3.position.set(0, 0.005, -165);
    crossStreet3.receiveShadow = true;
    roadGroup.add(crossStreet3);

    // East Parallel Avenue: "Ocean Drive East" (X: 110, Z: -360 to 360, width: 18m)
    const eastAvenue = new THREE.Mesh(new THREE.PlaneGeometry(18, 720), this.asphaltMat);
    eastAvenue.rotation.x = -Math.PI / 2;
    eastAvenue.position.set(110, 0.006, 0);
    eastAvenue.receiveShadow = true;
    roadGroup.add(eastAvenue);

    // West Parallel Avenue: "Vinewood Boulevard West" (X: -110, Z: -360 to 360, width: 18m)
    const westAvenue = new THREE.Mesh(new THREE.PlaneGeometry(18, 720), this.asphaltMat);
    westAvenue.rotation.x = -Math.PI / 2;
    westAvenue.position.set(-110, 0.006, 0);
    westAvenue.receiveShadow = true;
    roadGroup.add(westAvenue);

    // Pedestrian Zebra Crossings at Intersections
    this.buildZebraCrossing(0, 14, 28, true);
    this.buildZebraCrossing(0, -14, 28, true);
    this.buildZebraCrossing(14, 0, 20, false);
    this.buildZebraCrossing(-14, 0, 20, false);
    this.buildZebraCrossing(0, 179, 28, true);
    this.buildZebraCrossing(0, 151, 28, true);
    this.buildZebraCrossing(0, -151, 28, true);
    this.buildZebraCrossing(0, -179, 28, true);

    // Sidewalks along Main Boulevard (Left: X = -17.5, Right: X = +17.5, width: 7m, length: 720m)
    this.buildSidewalkBlock(-17.5, 0, 7, 720);
    this.buildSidewalkBlock(17.5, 0, 7, 720);
    this.buildSidewalkBlock(110 - 12.5, 0, 5, 720);
    this.buildSidewalkBlock(110 + 12.5, 0, 5, 720);
    this.buildSidewalkBlock(-110 - 12.5, 0, 5, 720);
    this.buildSidewalkBlock(-110 + 12.5, 0, 5, 720);
  }

  buildZebraCrossing(cx, cz, roadWidth, isHorizontal) {
    const numStripes = 8;
    for (let i = 0; i < numStripes; i++) {
      const stripeGeom = new THREE.PlaneGeometry(isHorizontal ? 2.5 : 0.9, isHorizontal ? 0.9 : 2.5);
      const stripe = new THREE.Mesh(stripeGeom, this.roadLineWhiteMat);
      stripe.rotation.x = -Math.PI / 2;
      if (isHorizontal) {
        stripe.position.set(cx - roadWidth / 2 + 2 + (i * (roadWidth - 4)) / (numStripes - 1), 0.02, cz);
      } else {
        stripe.position.set(cx, 0.02, cz - roadWidth / 2 + 2 + (i * (roadWidth - 4)) / (numStripes - 1));
      }
      this.scene.add(stripe);
    }
  }

  buildSidewalkBlock(x, z, width, length) {
    const swGeom = new THREE.BoxGeometry(width, 0.22, length);
    const swMesh = new THREE.Mesh(swGeom, this.sidewalkMat);
    swMesh.position.set(x, 0.11, z);
    swMesh.receiveShadow = true;
    this.scene.add(swMesh);
  }

  // -------------------------------------------------------------
  // THE ROYAL MIRAGE CASINO & RESORT (Centerpiece Landmark)
  // -------------------------------------------------------------

  buildRoyalMirageCasino() {
    const casinoGroup = new THREE.Group();
    casinoGroup.name = 'RoyalMirageCasino';
    const posX = -42;
    const posZ = 50;
    casinoGroup.position.set(posX, 0, posZ);
    this.scene.add(casinoGroup);

    // Casino Architecture: Luxury multi-tiered palace with gold & black facade
    const casinoWallMat = new THREE.MeshStandardMaterial({
      color: 0x16181f,
      roughness: 0.35,
      metalness: 0.4
    });

    // 1. Grand Podium / Ground Tier (W: 46m, H: 14m, D: 55m)
    const podiumGeom = new THREE.BoxGeometry(46, 14, 55);
    const podiumMesh = new THREE.Mesh(podiumGeom, casinoWallMat);
    podiumMesh.position.set(0, 7, 0);
    podiumMesh.castShadow = true;
    podiumMesh.receiveShadow = true;
    casinoGroup.add(podiumMesh);
    
    // Collider configuration: main body + flanking wings, leaving entrance portico open
    this.addColliderBox(posX - 3, 7, posZ, 40, 14, 55);
    this.addColliderBox(posX + 20, 7, posZ - 18, 6, 14, 19);
    this.addColliderBox(posX + 20, 7, posZ + 18, 6, 14, 19);

    // 2. Hotel Tower Tier 2 (W: 34m, H: 26m, D: 40m)
    const towerGeom = new THREE.BoxGeometry(34, 26, 40);
    const towerMesh = new THREE.Mesh(towerGeom, casinoWallMat);
    towerMesh.position.set(0, 27, 0);
    towerMesh.castShadow = true;
    casinoGroup.add(towerMesh);
    this.addColliderBox(posX, 27, posZ, 34, 26, 40);

    // Lit Tower Windows (Emissive golden hotel suites)
    for (let floor = 16; floor < 38; floor += 3.5) {
      for (let side = -14; side <= 14; side += 4) {
        const winGeom = new THREE.PlaneGeometry(1.8, 1.8);
        const winMat = new THREE.MeshStandardMaterial({
          color: 0xffe8aa,
          emissive: 0xffbf42,
          emissiveIntensity: Math.random() > 0.3 ? 0.8 : 0.1
        });
        const winMesh = new THREE.Mesh(winGeom, winMat);
        winMesh.position.set(side, floor, 20.1);
        casinoGroup.add(winMesh);
      }
    }

    // Windows facing East towards the Main Boulevard
    for (let floor = 16; floor < 38; floor += 3.5) {
      for (let zOff = -15; zOff <= 15; zOff += 4) {
        const winGeom = new THREE.PlaneGeometry(1.8, 1.8);
        const winMat = new THREE.MeshStandardMaterial({
          color: 0xffe8aa,
          emissive: 0xffbf42,
          emissiveIntensity: Math.random() > 0.25 ? 1.0 : 0.15
        });
        const winMesh = new THREE.Mesh(winGeom, winMat);
        winMesh.position.set(17.1, floor, zOff);
        winMesh.rotation.y = Math.PI / 2;
        casinoGroup.add(winMesh);
      }
    }

    // 3. High Roller Penthouse Crown (W: 24m, H: 8m, D: 26m)
    const crownGeom = new THREE.BoxGeometry(24, 8, 26);
    const crownMesh = new THREE.Mesh(crownGeom, this.goldMat);
    crownMesh.position.set(0, 44, 0);
    crownMesh.castShadow = true;
    casinoGroup.add(crownMesh);

    // 4. Grand Entrance Marquee & Golden Pillars (Front facing east: X = 23)
    const marqueeGeom = new THREE.BoxGeometry(10, 1.2, 16);
    const marqueeMesh = new THREE.Mesh(marqueeGeom, this.goldMat);
    marqueeMesh.position.set(26, 5.2, 0);
    casinoGroup.add(marqueeMesh);

    // Four Grand Golden Columns supporting marquee
    [-6, 6].forEach((colZ) => {
      const colGeom = new THREE.CylinderGeometry(0.45, 0.45, 5.2, 16);
      const colMesh = new THREE.Mesh(colGeom, this.goldMat);
      colMesh.position.set(30, 2.6, colZ);
      colMesh.castShadow = true;
      casinoGroup.add(colMesh);
    });

    // 5. Giant Illuminated Neon Signboard: "THE ROYAL MIRAGE CASINO"
    const signBoardGeom = new THREE.BoxGeometry(1.5, 4.2, 18);
    const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.2 });
    const signBoard = new THREE.Mesh(signBoardGeom, signBoardMat);
    signBoard.position.set(23.2, 11, 0);
    casinoGroup.add(signBoard);

    // Neon Lettering Emissive Strips
    const neonMat1 = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffae00,
      emissiveIntensity: 2.5
    });
    const neonStripTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 16), neonMat1);
    neonStripTop.position.set(24.0, 11.8, 0);
    casinoGroup.add(neonStripTop);

    const neonMat2 = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 2.2
    });
    const neonStripBottom = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 14), neonMat2);
    neonStripBottom.position.set(24.0, 10.0, 0);
    casinoGroup.add(neonStripBottom);

    this.neonSigns.push(neonStripTop, neonStripBottom);

    // 6. Giant 3D Golden Spinning Dice on Marquee Roof
    const diceGeom = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const diceMesh = new THREE.Mesh(diceGeom, this.goldMat);
    diceMesh.position.set(27, 7.5, 0);
    diceMesh.rotation.set(0.6, 0.7, 0.4);
    casinoGroup.add(diceMesh);
    casinoGroup.userData.spinningDice = diceMesh;

    // 7. Red VIP Carpet leading from entrance to the sidewalk
    const carpetGeom = new THREE.PlaneGeometry(16, 4.5);
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x990018, roughness: 0.8 });
    const carpetMesh = new THREE.Mesh(carpetGeom, carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(26, 0.12, 0);
    casinoGroup.add(carpetMesh);

    // Velvet Ropes & Brass Stanchions
    [-2.4, 2.4].forEach((ropeZ) => {
      for (let stX = 18; stX <= 32; stX += 3.5) {
        const postGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 10);
        const postMesh = new THREE.Mesh(postGeom, this.goldMat);
        postMesh.position.set(stX, 0.5, ropeZ);
        casinoGroup.add(postMesh);
      }
    });

    // 8. Entrance Doors & 3D Interactive Beacon
    const doorFrameGeom = new THREE.BoxGeometry(0.4, 4.0, 6.0);
    const doorFrame = new THREE.Mesh(doorFrameGeom, this.goldMat);
    doorFrame.position.set(23.1, 2.0, 0);
    casinoGroup.add(doorFrame);

    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 5.4), this.glassMat);
    doorGlass.position.set(23.1, 2.0, 0);
    casinoGroup.add(doorGlass);

    // Glowing Entrance Marquee Arch
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffb703,
      emissiveIntensity: 3.0
    });
    const entranceArch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), archMat);
    entranceArch.position.set(23.2, 4.2, 0);
    casinoGroup.add(entranceArch);

    // Red carpet glowing ground indicator
    const carpetRingMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 3.5
    });
    const carpetRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.85, 24), carpetRingMat);
    carpetRing.rotation.x = -Math.PI / 2;
    carpetRing.position.set(25.5, 0.14, 0);
    casinoGroup.add(carpetRing);

    // Floating Golden Diamond Entrance Beacon & Cyan Light
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 3.0,
      metalness: 0.9,
      roughness: 0.1
    });
    const beaconGeom = new THREE.OctahedronGeometry(0.85, 0);
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.set(25.5, 3.2, 0);
    casinoGroup.add(beaconMesh);
    this.entranceBeacon = beaconMesh;

    const beaconLight = new THREE.PointLight(0xffd700, 3.5, 18);
    beaconLight.position.set(25.5, 3.2, 0);
    casinoGroup.add(beaconLight);

    // Register Door trigger for entering Casino Interior with accurate rectified coordinates
    this.doors.push({
      id: 'casino_entrance',
      name: 'The Royal Mirage Casino',
      type: 'CASINO_ENTRANCE',
      position: new THREE.Vector3(-17.5, 1.0, 50.0),
      radius: 8.5,
      interactionPrompt: '[E] Entrar al Casino The Royal Mirage',
      targetLocation: 'CASINO_INTERIOR'
    });

    this.landmarks['casino'] = casinoGroup;
  }

  // -------------------------------------------------------------
  // VAULT 21 NATIONAL BANK
  // -------------------------------------------------------------

  buildVault21Bank() {
    const bankGroup = new THREE.Group();
    bankGroup.name = 'Vault21Bank';
    const posX = 45;
    const posZ = 38;
    bankGroup.position.set(posX, 0, posZ);
    this.scene.add(bankGroup);

    // Neoclassical stone facade with grand pillars
    const bankStoneMat = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.4,
      metalness: 0.05
    });

    // Main Bank Building Box (W: 42m, H: 18m, D: 45m)
    const mainBoxGeom = new THREE.BoxGeometry(42, 18, 45);
    const mainBox = new THREE.Mesh(mainBoxGeom, bankStoneMat);
    mainBox.position.set(0, 9, 0);
    mainBox.castShadow = true;
    mainBox.receiveShadow = true;
    bankGroup.add(mainBox);
    this.addColliderBox(posX, 9, posZ, 42, 18, 45);

    // Bank Portico Colonnade (Front facing west: X = -21)
    const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, 22), bankStoneMat);
    porticoRoof.position.set(-23.5, 11, 0);
    bankGroup.add(porticoRoof);

    // Stone Pillars
    [-8, -3, 3, 8].forEach((pz) => {
      const pillarGeom = new THREE.CylinderGeometry(0.55, 0.65, 11, 16);
      const pillarMesh = new THREE.Mesh(pillarGeom, bankStoneMat);
      pillarMesh.position.set(-25.5, 5.5, pz);
      pillarMesh.castShadow = true;
      bankGroup.add(pillarMesh);
    });

    // Bank Neon Sign: "VAULT 21 BANK"
    const bankNeonMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00e676,
      emissiveIntensity: 2.2
    });
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, 14), bankNeonMat);
    signMesh.position.set(-21.2, 13.5, 0);
    bankGroup.add(signMesh);
    this.neonSigns.push(signMesh);

    // Exterior Wall ATM Terminals (Playable banking spots)
    const atmMat = new THREE.MeshStandardMaterial({ color: 0x0047ba, roughness: 0.3 });
    const atmScreenMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b4d8,
      emissiveIntensity: 1.5
    });

    [-12, -15].forEach((az) => {
      const atmBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 1.2), atmMat);
      atmBody.position.set(-21.2, 1.2, az);
      bankGroup.add(atmBody);

      const atmScreen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.8), atmScreenMat);
      atmScreen.position.set(-21.65, 1.45, az);
      bankGroup.add(atmScreen);

      this.doors.push({
        id: `atm_bank_${az}`,
        name: 'Cajero Automático ATM (Maze Bank)',
        type: 'ATM',
        position: new THREE.Vector3(posX - 22.5, 1.0, posZ + az),
        interactionPrompt: '[E] Usar Cajero ATM'
      });
    });

    // Bank Main Entrance Door
    this.doors.push({
      id: 'bank_entrance',
      name: 'Vault 21 National Bank',
      type: 'BANK_ENTRANCE',
      position: new THREE.Vector3(posX - 21.0, 1.0, posZ),
      interactionPrompt: '[E] Entrar al Banco Vault 21',
      targetLocation: 'BANK_INTERIOR'
    });

    this.landmarks['bank'] = bankGroup;
  }

  // -------------------------------------------------------------
  // AMMU-NATION ARMS & GEAR
  // -------------------------------------------------------------

  buildAmmuNation() {
    const ammuGroup = new THREE.Group();
    ammuGroup.name = 'AmmuNation';
    const posX = 45;
    const posZ = -45;
    ammuGroup.position.set(posX, 0, posZ);
    this.scene.add(ammuGroup);

    const storeMat = new THREE.MeshStandardMaterial({ color: 0x242426, roughness: 0.7 });
    const mainBox = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 36), storeMat);
    mainBox.position.set(0, 5, 0);
    mainBox.castShadow = true;
    ammuGroup.add(mainBox);
    this.addColliderBox(posX, 5, posZ, 32, 10, 36);

    // Red Crosshair Logo / Signboard
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xd90429,
      emissiveIntensity: 2.4
    });
    const logoRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.25, 8, 24), redMat);
    logoRing.rotation.y = Math.PI / 2;
    logoRing.position.set(-16.2, 7.5, 0);
    ammuGroup.add(logoRing);

    const ammuSign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 12), redMat);
    ammuSign.position.set(-16.2, 5.0, 0);
    ammuGroup.add(ammuSign);

    this.doors.push({
      id: 'ammu_store',
      name: 'Ammu-Nation Armería',
      type: 'ARMORY',
      position: new THREE.Vector3(posX - 16.5, 1.0, posZ),
      interactionPrompt: '[E] Comprar Armas y Munición'
    });

    this.landmarks['ammu'] = ammuGroup;
  }

  // -------------------------------------------------------------
  // CLUB VELVET (Nightclub)
  // -------------------------------------------------------------

  buildClubVelvet() {
    const clubGroup = new THREE.Group();
    clubGroup.name = 'ClubVelvet';
    const posX = -42;
    const posZ = -50;
    clubGroup.position.set(posX, 0, posZ);
    this.scene.add(clubGroup);

    const clubMat = new THREE.MeshStandardMaterial({ color: 0x121118, roughness: 0.3 });
    const clubBox = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 38), clubMat);
    clubBox.position.set(0, 6, 0);
    clubBox.castShadow = true;
    clubGroup.add(clubBox);
    this.addColliderBox(posX, 6, posZ, 36, 12, 38);

    // Pulsing Magenta/Violet Neon Strips
    const velvetNeonMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xd0006f,
      emissiveIntensity: 2.8
    });
    const neonStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 28), velvetNeonMat);
    neonStrip1.position.set(18.2, 10.5, 0);
    clubGroup.add(neonStrip1);

    const neonStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 28), velvetNeonMat);
    neonStrip2.position.set(18.2, 8.5, 0);
    clubGroup.add(neonStrip2);

    this.doors.push({
      id: 'club_velvet',
      name: 'Club Velvet Lounge',
      type: 'NIGHTCLUB',
      position: new THREE.Vector3(posX + 18.5, 1.0, posZ),
      interactionPrompt: '[E] Entrar a Club Velvet'
    });

    this.landmarks['club'] = clubGroup;
  }

  // -------------------------------------------------------------
  // DIAMOND LIQUORS & 24/7 STORE (Z: -15)
  // -------------------------------------------------------------

  buildLiquorStore() {
    const storeGroup = new THREE.Group();
    storeGroup.name = 'DiamondLiquorStore';
    const posX = -42;
    const posZ = -15;
    storeGroup.position.set(posX, 0, posZ);
    this.scene.add(storeGroup);

    // Main Brick Building (W: 24, H: 8.5, D: 22)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1f2421,
      roughness: 0.7,
      metalness: 0.2
    });
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(24, 8.5, 22), wallMat);
    mainBuilding.position.set(0, 4.25, 0);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    storeGroup.add(mainBuilding);
    this.addColliderBox(posX, 4.25, posZ, 24, 8.5, 22);

    // Storefront Window (Glass facing boulevard at X: 12.1)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a2f1d,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85
    });
    const glassWindow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.0, 16), glassMat);
    glassWindow.position.set(12.1, 3.2, 0);
    storeGroup.add(glassWindow);

    // Neon Awning Canopy (Emerald Green & Gold)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.4 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 17), canopyMat);
    canopy.position.set(13.6, 6.2, 0);
    canopy.rotation.z = -0.15;
    storeGroup.add(canopy);

    // Neon Illuminated Sign: "24/7 LIQUOR & DRINKS"
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x52b788,
      emissive: 0x40916c,
      emissiveIntensity: 3.2
    });
    const neonSign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 15), signMat);
    neonSign.position.set(12.3, 7.4, 0);
    storeGroup.add(neonSign);

    // Neon Beer Mug / Bottle Accent
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xfb8500,
      emissiveIntensity: 2.8
    });
    const bottleSign = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8), accentMat);
    bottleSign.position.set(12.3, 7.4, 7.5);
    storeGroup.add(bottleSign);

    // Entrance Beacon / Door Ring
    const doorRing = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x52b788, side: THREE.DoubleSide })
    );
    doorRing.rotation.x = -Math.PI / 2;
    doorRing.position.set(14.5, 0.05, 0);
    storeGroup.add(doorRing);

    // Interactive Door Trigger
    this.doors.push({
      id: 'liquor_store',
      name: 'Diamond 24/7 Liquors & Drinks',
      type: 'LIQUOR_STORE',
      position: new THREE.Vector3(-27.0, 1.0, -15.0),
      radius: 4.8,
      interactionPrompt: '[E] Comprar Bebidas y Alcohol en Diamond 24/7',
      action: 'OPEN_LIQUOR_STORE'
    });

    this.landmarks['liquor'] = storeGroup;
  }

  // -------------------------------------------------------------
  // LUXURY MOTORSPORT CAR DEALERSHIP (Z: 120)
  // -------------------------------------------------------------

  buildDealership() {
    const dealerGroup = new THREE.Group();
    dealerGroup.name = 'LuxuryMotorsportDealership';
    const posX = 45;
    const posZ = 120;
    dealerGroup.position.set(posX, 0, posZ);
    this.scene.add(dealerGroup);

    // Main Showroom Building (W: 32, H: 10, D: 36)
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.3,
      metalness: 0.6
    });
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 36), buildingMat);
    mainBuilding.position.set(0, 5, 0);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    dealerGroup.add(mainBuilding);
    this.addColliderBox(posX, 5, posZ, 32, 10, 36);

    // Panoramic Curved Glass Facade facing boulevard (X: -16.1)
    const showroomGlassMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.78
    });
    const glassFacade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 28), showroomGlassMat);
    glassFacade.position.set(-16.1, 4.2, 0);
    dealerGroup.add(glassFacade);

    // Polished Chrome Showroom Pillars
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.1 });
    [-12, -4, 4, 12].forEach((pz) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9.5, 12), chromeMat);
      col.position.set(-15.8, 5, pz);
      dealerGroup.add(col);
    });

    // Rotating Showroom Car Display Turntable inside
    const turntableMat = new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.8, roughness: 0.2 });
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.8, 0.4, 24), turntableMat);
    turntable.position.set(-8.0, 0.2, 0);
    dealerGroup.add(turntable);

    // Showroom Display Sports Car on turntable
    const showcaseCarGroup = new THREE.Group();
    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.7, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xff0055, metalness: 0.9, roughness: 0.15 })
    );
    carBody.position.y = 0.55;
    showcaseCarGroup.add(carBody);
    const carCabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0a1120, metalness: 0.9, roughness: 0.1 })
    );
    carCabin.position.set(0, 1.05, -0.2);
    showcaseCarGroup.add(carCabin);
    showcaseCarGroup.position.set(-8.0, 0.4, 0);
    dealerGroup.add(showcaseCarGroup);
    dealerGroup.userData.turntableCar = showcaseCarGroup;

    // Giant Illuminated Dealership Sign: "LUXURY MOTORSPORT DEALERSHIP"
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00b4d8,
      emissiveIntensity: 3.5
    });
    const dealerSign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 26), signMat);
    dealerSign.position.set(-16.3, 8.8, 0);
    dealerGroup.add(dealerSign);

    // Exterior Delivery Bay (Yellow chevron ground box for purchased cars)
    const bayMat = new THREE.MeshBasicMaterial({ color: 0xffb703, side: THREE.DoubleSide });
    const bayMarking = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), bayMat);
    bayMarking.rotation.x = -Math.PI / 2;
    bayMarking.position.set(-23.0, 0.05, 0);
    dealerGroup.add(bayMarking);

    // Delivery bay signpost
    const baySign = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.2, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xffb703, emissive: 0xffb703, emissiveIntensity: 1.5 })
    );
    baySign.position.set(-20.0, 2.0, 6.0);
    dealerGroup.add(baySign);

    // Interactive Door Trigger
    this.doors.push({
      id: 'car_dealership',
      name: 'Concesionario Luxury Motorsport',
      type: 'DEALERSHIP',
      position: new THREE.Vector3(25.0, 1.0, 120.0),
      radius: 5.2,
      interactionPrompt: '[E] Comprar Vehículos en Luxury Motorsport',
      action: 'OPEN_DEALERSHIP',
      deliveryBay: { x: 22.0, y: 0, z: 120.0, rotY: Math.PI / 2 }
    });

    this.landmarks['dealership'] = dealerGroup;
  }

  // -------------------------------------------------------------
  // CHOP SHOP & SAFE GARAGE (GARAJE DE OCULTACIÓN - Z: -90)
  // -------------------------------------------------------------

  buildChopShopGarage() {
    const garageGroup = new THREE.Group();
    garageGroup.name = 'ChopShopGarage';
    const posX = 32;
    const posZ = -90;
    garageGroup.position.set(posX, 0, posZ);
    this.scene.add(garageGroup);

    // Main Warehouse Body (W: 20m, H: 8.5m, D: 22m)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.8,
      metalness: 0.3
    });
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(20, 8.5, 22), wallMat);
    mainBuilding.position.set(0, 4.25, 0);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    garageGroup.add(mainBuilding);
    this.addColliderBox(posX, 4.25, posZ, 20, 8.5, 22);

    // Roll-up industrial garage shutter door
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x3a3f47,
      roughness: 0.45,
      metalness: 0.8
    });
    const garageDoor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.6, 9.5), doorMat);
    garageDoor.position.set(-10.1, 2.8, 0);
    garageGroup.add(garageDoor);

    // Horizontal grooves on roll-up door
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20 });
    for (let r = 1; r < 7; r++) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 9.3), lineMat);
      groove.position.set(-10.12, r * 0.8, 0);
      garageGroup.add(groove);
    }

    // Hazard Stripes on Door Frame
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.5
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 11), hazardMat);
    lintel.position.set(-10.2, 5.9, 0);
    garageGroup.add(lintel);

    // Illuminated Neon Signboard: "GARAJE DE OCULTACIÓN"
    const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x111317 });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 14), signBoardMat);
    signBoard.position.set(-10.2, 7.2, 0);
    garageGroup.add(signBoard);

    const signTextMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 2.5
    });
    const signText = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 12.5), signTextMat);
    signText.position.set(-10.22, 7.2, 0);
    garageGroup.add(signText);
    this.neonSigns.push(signText);

    // Subtitle Neon: "CHOP SHOP • GARAJE SEGURO"
    const subSignMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00c8e6,
      emissiveIntensity: 2.2
    });
    const subSign = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 8.5), subSignMat);
    subSign.position.set(-10.22, 6.4, 0);
    garageGroup.add(subSign);
    this.neonSigns.push(subSign);

    // Outdoor Amber Industrial Security Lamp
    const lampLight = new THREE.PointLight(0xffa834, 2.8, 25, 1.4);
    lampLight.position.set(-11.5, 6.8, 0);
    garageGroup.add(lampLight);

    // Ground Drop-Off Delivery Zone Beacon (at X = 18, Z = -90 in world coords)
    const dropZone = new THREE.Group();
    dropZone.position.set(-14, 0.05, 0);

    // Outer neon ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.5,
      roughness: 0.3
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.16, 8, 36), ringMat);
    ring.rotation.x = -Math.PI / 2;
    dropZone.add(ring);

    // Vertical translucent light column beam
    const beamGeo = new THREE.CylinderGeometry(4.2, 4.2, 8, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 4, 0);
    dropZone.add(beam);

    garageGroup.add(dropZone);

    // Register Door/Interaction Trigger
    this.doors.push({
      id: 'chop_shop_garage',
      name: 'Garaje de Ocultación (Chop Shop)',
      type: 'GARAGE',
      position: new THREE.Vector3(18, 1.0, posZ),
      radius: 9.0,
      interactionPrompt: '[E] Reparar y Tunear Vehículo'
    });

    this.landmarks['garage'] = garageGroup;
  }

  // -------------------------------------------------------------
  // LSPD CENTRAL POLICE DEPARTMENT & PRISON (Z: -130)
  // -------------------------------------------------------------

  buildPoliceHeadquarters() {
    const policeGroup = new THREE.Group();
    policeGroup.name = 'LSPD_Police_HQ';
    const posX = -32;
    const posZ = -130;
    policeGroup.position.set(posX, 0, posZ);
    this.scene.add(policeGroup);

    // Main Police Precinct Building (W: 24m, H: 11m, D: 24m)
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e2530,
      roughness: 0.7,
      metalness: 0.3
    });
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(24, 11, 24), buildingMat);
    mainBuilding.position.set(0, 5.5, 0);
    policeGroup.add(mainBuilding);
    this.addColliderBox(posX, 5.5, posZ, 24, 11, 24);

    // Blue Municipal Trim Band
    const blueTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0044cc,
      roughness: 0.4,
      metalness: 0.4
    });
    const trimMesh = new THREE.Mesh(new THREE.BoxGeometry(24.2, 0.8, 24.2), blueTrimMat);
    trimMesh.position.set(0, 9.8, 0);
    policeGroup.add(trimMesh);

    // Entrance portico & double security doors facing Main Boulevard (East, +X)
    const porticoMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.5 });
    const portico = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.2, 6.0), porticoMat);
    portico.position.set(12.8, 2.1, 0);
    policeGroup.add(portico);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x002244, metalness: 0.8 });
    const doors = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 3.6), doorMat);
    doors.position.set(12.1, 1.6, 0);
    policeGroup.add(doors);

    // Massive LSPD Police Signboard
    const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.8 });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 14.0), signBoardMat);
    signBoard.position.set(12.3, 7.8, 0);
    policeGroup.add(signBoard);

    // Blue & White LSPD Neon Letters
    const lspdNeonMat = new THREE.MeshStandardMaterial({
      color: 0x00a2ff,
      emissive: 0x0066ff,
      emissiveIntensity: 2.8
    });
    const lspdSign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 12.0), lspdNeonMat);
    lspdSign.position.set(12.4, 7.8, 0);
    policeGroup.add(lspdSign);
    this.neonSigns.push(lspdSign);

    // Rooftop Police Communication Tower
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 7.0, 6), towerMat);
    tower.position.set(4, 14.5, 4);
    policeGroup.add(tower);

    // Red warning beacon on top of tower
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff0033, emissive: 0xff0033, emissiveIntensity: 3.0 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), beaconMat);
    beacon.position.set(4, 18.0, 4);
    policeGroup.add(beacon);

    // Interactive Police Station & Jail Entrance trigger
    this.doors.push({
      id: 'lspd_hq',
      name: 'Comisaría Central LSPD y Prisión',
      type: 'POLICE',
      position: new THREE.Vector3(-16.5, 1.0, posZ),
      radius: 6.5,
      interactionPrompt: '[E] Comisaría Central LSPD y Pago de Fianzas'
    });

    this.landmarks['police'] = policeGroup;
  }

  // -------------------------------------------------------------
  // SHADY STREET DEALER ALLEY (NARCOTICS & PSYCHEDELICS)
  // -------------------------------------------------------------
  buildStreetDealerAlley() {
    const dealerGroup = new THREE.Group();
    dealerGroup.name = 'StreetDealerAlley';
    const posX = -26.0;
    const posZ = 18.0;
    dealerGroup.position.set(posX, 0, posZ);

    // 1. Shady Dealer NPC Model (Stylized low-poly)
    const npcGroup = new THREE.Group();
    npcGroup.position.set(0, 0, 0);

    // Dark Hoodie Torso
    const hoodieMat = new THREE.MeshStandardMaterial({ color: 0x18181f, roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), hoodieMat);
    torso.position.set(0, 1.15, 0);
    torso.castShadow = true;
    npcGroup.add(torso);

    // Head with Hood
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x121217, roughness: 0.9 });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.36), hoodMat);
    hood.position.set(0, 1.62, 0.02);
    npcGroup.add(hood);

    // Sunglasses
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.9, roughness: 0.1 });
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.08), glassesMat);
    glasses.position.set(0, 1.62, 0.19);
    npcGroup.add(glasses);

    // Gold Chain
    const chainMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), chainMat);
    chain.position.set(0, 1.35, 0.16);
    chain.rotation.x = Math.PI / 3;
    npcGroup.add(chain);

    // Jeans Legs
    const jeansMat = new THREE.MeshStandardMaterial({ color: 0x223048, roughness: 0.8 });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.2), jeansMat);
    leftLeg.position.set(-0.12, 0.4, 0);
    npcGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.2), jeansMat);
    rightLeg.position.set(0.12, 0.4, 0);
    npcGroup.add(rightLeg);

    // Face towards the sidewalk
    npcGroup.rotation.y = Math.PI / 2;
    dealerGroup.add(npcGroup);

    // 2. Alley Props (Dumpster & Crate)
    const dumpsterMat = new THREE.MeshStandardMaterial({ color: 0x2d4030, roughness: 0.7 });
    const dumpster = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 2.4), dumpsterMat);
    dumpster.position.set(-1.4, 0.65, 0);
    dealerGroup.add(dumpster);
    this.addColliderBox(posX - 1.4, 0.65, posZ, 1.6, 1.3, 2.4, 'dumpster');

    // 3. Shady Purple Neon Glow Sign
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xc77dff,
      emissive: 0x9d4edd,
      emissiveIntensity: 2.2,
      roughness: 0.2
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 2.2), signMat);
    sign.position.set(1.4, 2.8, 0);
    dealerGroup.add(sign);

    const purpleGlow = new THREE.PointLight(0x9d4edd, 2.4, 12);
    purpleGlow.position.set(0.4, 2.4, 0);
    dealerGroup.add(purpleGlow);

    this.scene.add(dealerGroup);

    // 4. Register Door / Interaction Trigger
    this.doors.push({
      id: 'street_dealer',
      name: 'Dealer Callejero • Sustancias & Psicodelia',
      type: 'STREET_DEALER',
      position: new THREE.Vector3(posX, 0.8, posZ),
      radius: 4.0,
      interactionPrompt: '[E] Hablar con el Dealer Callejero 💊',
      action: 'OPEN_DEALER'
    });

    this.landmarks['dealer'] = dealerGroup;
  }

  // -------------------------------------------------------------
  // DOWNTOWN SKYSCRAPERS & TOWERS
  // -------------------------------------------------------------

  buildDowntownSkyscrapers() {
    const towers = [
      { x: -50, z: 110, w: 38, h: 90, d: 38, color: 0x152238, name: 'Centurion Tower' },
      { x: 50, z: 110, w: 34, h: 75, d: 34, color: 0x1d2d44, name: 'Maze Financial' },
      { x: -52, z: -110, w: 36, h: 80, d: 36, color: 0x222228, name: 'Eclipse Heights' },
      { x: 52, z: -110, w: 40, h: 105, d: 40, color: 0x0f1b29, name: 'Dynasty 8 Plaza' }
    ];

    towers.forEach((t) => {
      const towerGroup = new THREE.Group();
      towerGroup.position.set(t.x, 0, t.z);

      // Glass Tower Body
      const towerMat = new THREE.MeshStandardMaterial({
        color: t.color,
        roughness: 0.15,
        metalness: 0.85
      });
      const towerMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), towerMat);
      towerMesh.position.set(0, t.h / 2, 0);
      towerMesh.castShadow = true;
      towerGroup.add(towerMesh);
      this.addColliderBox(t.x, t.h / 2, t.z, t.w, t.h, t.d);

      // Lit office window bands (Cyberpunk / Metropolis architectural glow)
      const winFloorSpacing = 6;
      const numBands = Math.floor((t.h - 12) / winFloorSpacing);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0x98d4ff,
        emissive: 0x3088cc,
        emissiveIntensity: 0.9,
        roughness: 0.2
      });
      for (let b = 1; b <= numBands; b++) {
        const bandY = b * winFloorSpacing;
        // North/South bands
        const bandZ = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.9, 1.2, t.d + 0.1), bandMat);
        bandZ.position.set(0, bandY, 0);
        towerGroup.add(bandZ);
        // East/West bands
        const bandX = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.1, 1.2, t.d * 0.9), bandMat);
        bandX.position.set(0, bandY, 0);
        towerGroup.add(bandX);
      }

      // Rooftop Helipad
      const helipadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
      const helipad = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.7, 0.6, t.d * 0.7), helipadMat);
      helipad.position.set(0, t.h + 0.3, 0);
      towerGroup.add(helipad);

      // Rooftop Antenna with blinking red beacon
      const antennaGeom = new THREE.CylinderGeometry(0.15, 0.4, 12, 8);
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });
      const antenna = new THREE.Mesh(antennaGeom, antennaMat);
      antenna.position.set(0, t.h + 6, 0);
      towerGroup.add(antenna);

      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 3.0
      });
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), beaconMat);
      beacon.position.set(0, t.h + 12, 0);
      towerGroup.add(beacon);

      // Special Grand Entrance for Dynasty 8 Plaza (Penthouse Suite & Freeplay)
      if (t.name === 'Dynasty 8 Plaza') {
        const entranceCanopy = new THREE.Mesh(
          new THREE.BoxGeometry(3.0, 0.5, 9.0),
          new THREE.MeshStandardMaterial({ color: 0x111624, metalness: 0.9, roughness: 0.3 })
        );
        entranceCanopy.position.set(-t.w / 2 - 1.5, 4.2, 0);
        towerGroup.add(entranceCanopy);

        // Golden Neon Penthouse Signboard
        const goldNeonMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 3.2
        });
        const signMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 8.5), goldNeonMat);
        signMesh.position.set(-t.w / 2 - 2.8, 4.8, 0);
        towerGroup.add(signMesh);
        this.neonSigns.push(signMesh);

        // Interactive Door / Elevator to Penthouse
        this.doors.push({
          id: 'dynasty8_penthouse',
          name: 'Dynasty 8 Plaza • Suite Presidencial',
          type: 'PENTHOUSE',
          position: new THREE.Vector3(29.0, 1.0, -110.0),
          radius: 9.5,
          interactionPrompt: '[E] Reclamar Suite Presidencial y Modo Libre'
        });
      }

      this.scene.add(towerGroup);
    });
  }

  // -------------------------------------------------------------
  // COMMERCIAL BOUTIQUES & CAFE TERRACES
  // -------------------------------------------------------------

  buildCommercialBoutiques() {
    // Boutiques along Sunset Avenue
    const cafeGroup = new THREE.Group();
    cafeGroup.position.set(45, 0, 85);

    const cafeMat = new THREE.MeshStandardMaterial({ color: 0x3d352e, roughness: 0.7 });
    const cafeMesh = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 20), cafeMat);
    cafeMesh.position.set(0, 4, 0);
    cafeMesh.castShadow = true;
    cafeGroup.add(cafeMesh);
    this.addColliderBox(45, 4, 85, 30, 8, 20);

    // Striped Awning
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.6 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 3.5), awningMat);
    awning.position.set(-15.5, 4.2, 0);
    awning.rotation.z = -0.2;
    cafeGroup.add(awning);

    // Outdoor dining tables & chairs
    [-4, 0, 4].forEach((tz) => {
      const tableMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.8, 12), tableMat);
      table.position.set(-18.5, 0.4, tz);
      cafeGroup.add(table);
    });

    this.scene.add(cafeGroup);
  }

  // -------------------------------------------------------------
  // EXPANDED METROPOLIS DISTRICTS & SKYSCRAPERS
  // -------------------------------------------------------------

  buildExpandedMetropolisDistricts() {
    const districtsGroup = new THREE.Group();
    districtsGroup.name = 'ExpandedDistricts';
    this.scene.add(districtsGroup);

    // District 1: East Financial & Luxury Hotel Hub (X: 110)
    const eastTowers = [
      { x: 145, z: 80, w: 32, h: 85, d: 32, color: 0x112233, name: 'Lombank Tower' },
      { x: 145, z: -80, w: 36, h: 100, d: 36, color: 0x1c2541, name: 'Arcadius Center' },
      { x: 145, z: 225, w: 30, h: 70, d: 30, color: 0x0b132b, name: 'Schlongberg Plaza' },
      { x: 145, z: -225, w: 34, h: 95, d: 34, color: 0x22333b, name: 'Vangelico Vaults' }
    ];

    // District 2: West Vinewood & Media Entertainment Hub (X: -110)
    const westTowers = [
      { x: -145, z: 80, w: 35, h: 90, d: 35, color: 0x2b2d42, name: 'Weazel News Tower' },
      { x: -145, z: -80, w: 32, h: 80, d: 32, color: 0x1a1a24, name: 'Richman Executive' },
      { x: -145, z: 225, w: 38, h: 110, d: 38, color: 0x14213d, name: 'Galileo Observatory Tower' },
      { x: -145, z: -225, w: 30, h: 75, d: 30, color: 0x264653, name: 'Badger Telecom Tower' }
    ];

    // District 3: North Strip Grand Casinos & Resorts (Z: 250)
    const northStrip = [
      { x: -65, z: 250, w: 42, h: 65, d: 45, color: 0x4a0e4e, name: 'The Bellagio Luxe Casino' },
      { x: 65, z: 250, w: 45, h: 70, d: 42, color: 0x1a4329, name: 'Caesars Grand Palace' }
    ];

    // District 4: South Strip Port & Industrial Warehouses (Z: -250)
    const southStrip = [
      { x: -65, z: -250, w: 48, h: 22, d: 55, color: 0x242426, name: 'Port Logistics Hub' },
      { x: 65, z: -250, w: 50, h: 25, d: 50, color: 0x1f2022, name: 'Federal Cargo Terminal' }
    ];

    const allNewBuildings = [...eastTowers, ...westTowers, ...northStrip, ...southStrip];

    allNewBuildings.forEach(b => {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, 0, b.z);

      const bMat = new THREE.MeshStandardMaterial({
        color: b.color,
        roughness: 0.25,
        metalness: 0.75
      });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bMat);
      bMesh.position.set(0, b.h / 2, 0);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      bGroup.add(bMesh);

      // Lit windows
      const winFloorSpacing = 5.5;
      const bands = Math.floor((b.h - 8) / winFloorSpacing);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xffa700,
        emissiveIntensity: 0.8,
        roughness: 0.3
      });

      for (let i = 1; i <= bands; i++) {
        const by = i * winFloorSpacing;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.92, 1.1, b.d + 0.1), bandMat);
        stripe.position.set(0, by, 0);
        bGroup.add(stripe);
      }

      // Add collider
      this.addColliderBox(b.x, b.h / 2, b.z, b.w, b.h, b.d);
      districtsGroup.add(bGroup);
    });
  }

  // -------------------------------------------------------------
  // URBAN FURNITURE, STREETLIGHTS & PALM TREES (HIGH-PERFORMANCE SHARED ASSETS)
  // -------------------------------------------------------------

  initUrbanPropsAssets() {
    if (this._propsAssets) return;
    this._propsAssets = {
      // Shared Materials (Eliminates hundreds of shader compiles on Intel HD / UHD GPUs)
      lampPoleMat: new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.6, roughness: 0.4 }),
      lampHeadMat: new THREE.MeshStandardMaterial({
        color: 0xfffaed,
        emissive: 0xffe6a3,
        emissiveIntensity: 2.5
      }),
      palmTrunkMat: new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 }),
      palmFrondMat: new THREE.MeshStandardMaterial({ color: 0x1e5e2f, roughness: 0.7, side: THREE.DoubleSide }),
      benchWoodMat: new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.7 }),
      benchIronMat: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6 }),
      hydrantMat: new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.4 }),
      trafficPoleMat: new THREE.MeshStandardMaterial({ color: 0x242426, metalness: 0.6 }),
      trafficBoxMat: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }),

      // Shared Low-Poly Geometries (Low vertex footprint, maximum GPU cache locality)
      lampPoleGeom: new THREE.CylinderGeometry(0.12, 0.16, 7.5, 6),
      lampArmGeom: new THREE.BoxGeometry(2.4, 0.1, 0.15),
      lampHeadGeom: new THREE.BoxGeometry(0.8, 0.18, 0.35),
      palmTrunkGeom: new THREE.CylinderGeometry(0.24, 0.36, 9.5, 6),
      palmFrondGeom: new THREE.PlaneGeometry(0.8, 3.8),
      benchSeatGeom: new THREE.BoxGeometry(0.6, 0.08, 1.8),
      benchBackGeom: new THREE.BoxGeometry(0.08, 0.45, 1.8),
      benchLegGeom: new THREE.BoxGeometry(0.55, 0.45, 0.08),
      hydrantGeom: new THREE.CylinderGeometry(0.16, 0.18, 0.85, 6),
      trafficPoleGeom: new THREE.CylinderGeometry(0.15, 0.18, 6.5, 6),
      trafficArmGeom: new THREE.BoxGeometry(5.5, 0.12, 0.12),
      trafficBoxGeom: new THREE.BoxGeometry(0.35, 1.1, 0.35)
    };
  }

  buildUrbanProps() {
    this.initUrbanPropsAssets();

    const propsGroup = new THREE.Group();
    propsGroup.name = 'UrbanStreetProps';
    this.scene.add(propsGroup);

    // Optimized street zone (-180m to +180m: covers Casino, Bank, Dealership, Chop Shop, Ammu-Nation)
    for (let z = -180; z <= 180; z += 45) {
      this.buildModernStreetLamp(propsGroup, -14.8, z, Math.PI / 2);
      this.buildModernStreetLamp(propsGroup, 14.8, z, -Math.PI / 2);

      // Palm trees spaced along boulevard sidewalks
      this.buildCaliforniaPalm(propsGroup, -15.8, z + 22);
      this.buildCaliforniaPalm(propsGroup, 15.8, z + 22);

      // Street Benches & Hydrants
      this.buildStreetBench(propsGroup, -15.5, z - 12, Math.PI / 2);
      this.buildStreetBench(propsGroup, 15.5, z - 12, -Math.PI / 2);
      this.buildFireHydrant(propsGroup, -14.5, z + 10);
    }

    // Single central warm plaza illumination light at the main intersection (Z = 0)
    // Replaces 34 expensive PointLights with 1 efficient central city light
    const centralStreetGlow = new THREE.PointLight(0xffdf9e, 2.2, 45, 1.4);
    centralStreetGlow.position.set(0, 8.5, 0);
    propsGroup.add(centralStreetGlow);

    // Traffic Lights at Main Intersection (Z = 0)
    this.buildTrafficLightPole(propsGroup, -13.0, 10.0, 0);
    this.buildTrafficLightPole(propsGroup, 13.0, -10.0, Math.PI);
  }

  buildModernStreetLamp(parent, x, z, rotY) {
    const a = this._propsAssets;
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);
    lampGroup.rotation.y = rotY;

    // Pole
    const pole = new THREE.Mesh(a.lampPoleGeom, a.lampPoleMat);
    pole.position.set(0, 3.75, 0);
    lampGroup.add(pole);

    // Arch Arm
    const arm = new THREE.Mesh(a.lampArmGeom, a.lampPoleMat);
    arm.position.set(1.1, 7.4, 0);
    lampGroup.add(arm);

    // High-emissive lantern head (simulates bright sodium light without GPU point light penalty)
    const head = new THREE.Mesh(a.lampHeadGeom, a.lampHeadMat);
    head.position.set(2.2, 7.3, 0);
    lampGroup.add(head);

    parent.add(lampGroup);
  }

  buildCaliforniaPalm(parent, x, z) {
    const a = this._propsAssets;
    const palmGroup = new THREE.Group();
    palmGroup.position.set(x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(a.palmTrunkGeom, a.palmTrunkMat);
    trunk.position.set(0, 4.75, 0);
    palmGroup.add(trunk);

    // Fronds (6 optimized fan fronds reusing shared plane geometry)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(a.palmFrondGeom, a.palmFrondMat);
      frond.position.set(Math.cos(angle) * 1.4, 9.4, Math.sin(angle) * 1.4);
      frond.rotation.y = angle;
      frond.rotation.x = 0.55;
      palmGroup.add(frond);
    }

    parent.add(palmGroup);
  }

  buildStreetBench(parent, x, z, rotY) {
    const a = this._propsAssets;
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = rotY;

    // Seat
    const seat = new THREE.Mesh(a.benchSeatGeom, a.benchWoodMat);
    seat.position.set(0, 0.45, 0);
    benchGroup.add(seat);

    // Backrest
    const back = new THREE.Mesh(a.benchBackGeom, a.benchWoodMat);
    back.position.set(-0.26, 0.72, 0);
    benchGroup.add(back);

    // Iron legs
    const legL = new THREE.Mesh(a.benchLegGeom, a.benchIronMat);
    legL.position.set(0, 0.225, -0.7);
    benchGroup.add(legL);

    const legR = new THREE.Mesh(a.benchLegGeom, a.benchIronMat);
    legR.position.set(0, 0.225, 0.7);
    benchGroup.add(legR);

    parent.add(benchGroup);
  }

  buildFireHydrant(parent, x, z) {
    const a = this._propsAssets;
    const hyd = new THREE.Mesh(a.hydrantGeom, a.hydrantMat);
    hyd.position.set(x, 0.42, z);
    parent.add(hyd);
  }

  buildTrafficLightPole(parent, x, z, rotY) {
    const a = this._propsAssets;
    const poleGroup = new THREE.Group();
    poleGroup.position.set(x, 0, z);
    poleGroup.rotation.y = rotY;

    const pole = new THREE.Mesh(a.trafficPoleGeom, a.trafficPoleMat);
    pole.position.set(0, 3.25, 0);
    poleGroup.add(pole);

    const arm = new THREE.Mesh(a.trafficArmGeom, a.trafficPoleMat);
    arm.position.set(2.7, 6.2, 0);
    poleGroup.add(arm);

    // Signal head box
    const signalBox = new THREE.Mesh(a.trafficBoxGeom, a.trafficBoxMat);
    signalBox.position.set(4.2, 5.7, 0);
    poleGroup.add(signalBox);

    // Red and Green Lenses
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.5 });
    const redLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), redMat);
    redLens.position.set(4.2, 6.1, 0.2);
    poleGroup.add(redLens);

    const greenMat = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 0.2 });
    const greenLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), greenMat);
    greenLens.position.set(4.2, 5.3, 0.2);
    poleGroup.add(greenLens);

    this.trafficLights.push({ redLens, greenLens, state: 'red' });
    parent.add(poleGroup);
  }

  addColliderBox(cx, cy, cz, w, h, d) {
    this.colliders.push({
      min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
      max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2)
    });
  }
}
