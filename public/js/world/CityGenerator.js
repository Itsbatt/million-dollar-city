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

    // Register Door trigger for entering Casino Interior with wider radius
    this.doors.push({
      id: 'casino_entrance',
      name: 'The Royal Mirage Casino',
      type: 'CASINO_ENTRANCE',
      position: new THREE.Vector3(-16.5, 1.0, 35.0),
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
  // URBAN FURNITURE, STREETLIGHTS & PALM TREES
  // -------------------------------------------------------------

  buildUrbanProps() {
    const propsGroup = new THREE.Group();
    propsGroup.name = 'UrbanStreetProps';
    this.scene.add(propsGroup);

    // Streetlights along Main Boulevard & Parallel Avenues (extended to 320m)
    for (let z = -320; z <= 320; z += 40) {
      this.buildModernStreetLamp(propsGroup, -14.8, z, Math.PI / 2);
      this.buildModernStreetLamp(propsGroup, 14.8, z, -Math.PI / 2);

      // Palm trees spaced along the boulevard sidewalks
      this.buildCaliforniaPalm(propsGroup, -15.8, z + 20);
      this.buildCaliforniaPalm(propsGroup, 15.8, z + 20);

      // Street Benches & Trash Cans
      this.buildStreetBench(propsGroup, -15.5, z - 12, Math.PI / 2);
      this.buildStreetBench(propsGroup, 15.5, z - 12, -Math.PI / 2);
      this.buildFireHydrant(propsGroup, -14.5, z + 10);
    }

    // Traffic Lights at Main Intersection (Z = 0)
    this.buildTrafficLightPole(propsGroup, -13.0, 10.0, 0);
    this.buildTrafficLightPole(propsGroup, 13.0, -10.0, Math.PI);
  }

  buildModernStreetLamp(parent, x, z, rotY) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.8, roughness: 0.3 });
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);
    lampGroup.rotation.y = rotY;

    // Pole
    const poleGeom = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 10);
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.set(0, 3.75, 0);
    pole.castShadow = true;
    lampGroup.add(pole);

    // Arch Arm
    const armGeom = new THREE.BoxGeometry(2.4, 0.1, 0.15);
    const arm = new THREE.Mesh(armGeom, poleMat);
    arm.position.set(1.1, 7.4, 0);
    lampGroup.add(arm);

    // Fixture head
    const headGeom = new THREE.BoxGeometry(0.8, 0.18, 0.35);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfffaed,
      emissive: 0xffe6a3,
      emissiveIntensity: 2.2
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.set(2.2, 7.3, 0);
    lampGroup.add(head);

    // Real dynamic Night Light (PointLight with warm 3000K city tint)
    const light = new THREE.PointLight(0xffdf9e, 1.8, 28, 1.5);
    light.position.set(2.2, 7.1, 0);
    lampGroup.add(light);

    parent.add(lampGroup);
  }

  buildCaliforniaPalm(parent, x, z) {
    const palmGroup = new THREE.Group();
    palmGroup.position.set(x, 0, z);

    // Segmented Trunk with slight natural curve
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const trunkGeom = new THREE.CylinderGeometry(0.24, 0.38, 9.5, 8);
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.set(0, 4.75, 0);
    trunk.rotation.z = (Math.random() - 0.5) * 0.12;
    trunk.castShadow = true;
    palmGroup.add(trunk);

    // Palm Crown (Leaf fronds)
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x1e5e2f, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const frondGeom = new THREE.PlaneGeometry(0.8, 3.8);
      const frond = new THREE.Mesh(frondGeom, frondMat);
      frond.position.set(Math.cos(angle) * 1.5, 9.4, Math.sin(angle) * 1.5);
      frond.rotation.y = angle;
      frond.rotation.x = 0.55;
      frond.castShadow = true;
      palmGroup.add(frond);
    }

    parent.add(palmGroup);
  }

  buildStreetBench(parent, x, z, rotY) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8 });

    // Seat slats
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 1.8), woodMat);
    seat.position.set(0, 0.45, 0);
    benchGroup.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.8), woodMat);
    back.position.set(-0.26, 0.72, 0);
    benchGroup.add(back);

    // Iron legs
    [-0.7, 0.7].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.08), ironMat);
      leg.position.set(0, 0.225, lz);
      benchGroup.add(leg);
    });

    parent.add(benchGroup);
  }

  buildFireHydrant(parent, x, z) {
    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.4, metalness: 0.2 });
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.85, 10), hydrantMat);
    hyd.position.set(x, 0.42, z);
    hyd.castShadow = true;
    parent.add(hyd);
  }

  buildTrafficLightPole(parent, x, z, rotY) {
    const poleGroup = new THREE.Group();
    poleGroup.position.set(x, 0, z);
    poleGroup.rotation.y = rotY;

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x242426, metalness: 0.7 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 6.5, 10), poleMat);
    pole.position.set(0, 3.25, 0);
    poleGroup.add(pole);

    // Horizontal arm reaching over lane
    const arm = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.12, 0.12), poleMat);
    arm.position.set(2.7, 6.2, 0);
    poleGroup.add(arm);

    // Signal Housing Box
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const signalBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), boxMat);
    signalBox.position.set(4.2, 5.8, 0);
    poleGroup.add(signalBox);

    // Red, Yellow, Green Lenses
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.5 });
    const redLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), redMat);
    redLens.position.set(4.2, 6.2, 0.2);
    poleGroup.add(redLens);

    const greenMat = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 0.2 });
    const greenLens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), greenMat);
    greenLens.position.set(4.2, 5.4, 0.2);
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
