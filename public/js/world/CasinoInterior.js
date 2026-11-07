import * as THREE from '/vendor/three.module.js';

export class CasinoInterior {
  constructor(scene) {
    this.scene = scene;
    this.interiorGroup = new THREE.Group();
    this.interiorGroup.name = 'CasinoInterior';
    this.colliders = [];
    this.interactables = [];
    this.animatedReels = [];
    this.rouletteWheels = [];
    this.rouletteBalls = [];
    this.marqueeLights = [];
    this.patronMeshes = [];
    this.wheelOfFortuneDisc = null;
    this.wheelSpinSpeed = 0.25;
    this.wheelNeedle = null;
    this.pachinkoBalls = [];
    this.time = 0;

    // Interior is situated at separate interior coordinates (Y = -120)
    this.origin = new THREE.Vector3(0, -120, 0);
    this.interiorGroup.position.copy(this.origin);

    this.initMaterials();
    this.buildGrandCasino();
    this.scene.add(this.interiorGroup);
  }

  initMaterials() {
    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.2
    });

    this.carpetMat = new THREE.MeshStandardMaterial({
      color: 0x58080f, // Rich royal burgundy velvet
      roughness: 0.85
    });

    this.greenFeltMat = new THREE.MeshStandardMaterial({
      color: 0x14452f, // Classic Monaco emerald felt
      roughness: 0.9
    });

    this.blueFeltMat = new THREE.MeshStandardMaterial({
      color: 0x0f2b48, // High-Roller VIP navy felt
      roughness: 0.9
    });

    this.marbleMat = new THREE.MeshStandardMaterial({
      color: 0x121318, // Polished Nero Marquina black marble
      roughness: 0.25,
      metalness: 0.4
    });

    this.woodTrimMat = new THREE.MeshStandardMaterial({
      color: 0x2b1308, // Hand-rubbed dark Cuban mahogany
      roughness: 0.35,
      metalness: 0.2
    });

    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xe0ab6e,
      metalness: 0.95,
      roughness: 0.2
    });

    this.leatherMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.65
    });

    // Procedural Reel Texture
    this.reelTexture = this.createReelTexture();
    this.reelMat = new THREE.MeshStandardMaterial({
      map: this.reelTexture,
      roughness: 0.4,
      metalness: 0.1
    });
  }

  createReelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 128, 512);

    const symbols = [
      { text: '777', color: '#d90429', bg: '#ffe3e3' },
      { text: '💎', color: '#00b4d8', bg: '#e0f7fa' },
      { text: '🍒', color: '#e63946', bg: '#ffebee' },
      { text: 'BAR', color: '#d4af37', bg: '#fff9db' },
      { text: '🔔', color: '#f59e0b', bg: '#fef3c7' }
    ];

    const slotH = 512 / symbols.length;
    symbols.forEach((sym, i) => {
      const y = i * slotH;
      ctx.fillStyle = sym.bg;
      ctx.fillRect(6, y + 4, 116, slotH - 8);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(6, y + 4, 116, slotH - 8);

      ctx.fillStyle = sym.color;
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym.text, 64, y + slotH / 2);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  buildGrandCasino() {
    // 1. Room Shell (W: 66m, L: 88m, H: 8.5m)
    const floorGeom = new THREE.PlaneGeometry(68, 90);
    const floor = new THREE.Mesh(floorGeom, this.carpetMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.interiorGroup.add(floor);

    // Decorative velvet carpet border runners
    const runnerGeom = new THREE.PlaneGeometry(10, 80);
    const runnerMat = new THREE.MeshStandardMaterial({ color: 0x800f2f, roughness: 0.8 });
    const runner = new THREE.Mesh(runnerGeom, runnerMat);
    runner.rotation.x = -Math.PI / 2;
    runner.position.set(0, 0.01, 0);
    this.interiorGroup.add(runner);

    // Ceiling with gold recessed coffers
    const ceilingGeom = new THREE.PlaneGeometry(68, 90);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.9 });
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 8.5;
    this.interiorGroup.add(ceiling);

    // Perimeter Marble Walls
    this.buildWall(0, 4.25, -44, 68, 8.5, 1.2); // North wall
    this.buildWall(0, 4.25, 44, 68, 8.5, 1.2); // South wall (Entrance)
    this.buildWall(-33, 4.25, 0, 1.2, 8.5, 90); // West wall
    this.buildWall(33, 4.25, 0, 1.2, 8.5, 90); // East wall

    // Warm perimeter wall sconces illuminating marble and gold mouldings
    this.buildWallSconces();

    // Central Overhead Grand Marquee
    this.buildOverheadMarquee();

    // Grand Imperial Marble Columns
    for (let x = -20; x <= 20; x += 20) {
      for (let z = -25; z <= 25; z += 25) {
        this.buildPillar(x, z);
      }
    }

    // 2. Crystal Chandeliers (Warm luxurious golden light)
    this.buildChandelier(0, 7.2, 0);
    this.buildChandelier(-15, 7.2, 12);
    this.buildChandelier(15, 7.2, 12);
    this.buildChandelier(-15, 7.2, -15);
    this.buildChandelier(15, 7.2, -15);
    this.buildChandelier(0, 7.2, -30);

    // 3. Foyer & Exit back to City
    this.buildEntranceFoyer();

    // 4. Blackjack Tables with Suited Croupiers
    this.buildBlackjackPit();

    // 5. European Roulette Pit with spinning wheel & ball
    this.buildRoulettePit();

    // 6. ANIMATED SLOTS BANKS (Multi-theme, spinning 3D reels, flashing LED marquees)
    this.buildSlotMachineBanks();

    // 6b. Pharaoh's Gold Luxury Egyptian Slots
    this.buildPharaohSlotsBank();

    // 6c. Mega 3D Wheel of Fortune (Centerpiece Grand Attraction)
    this.buildMegaWheelOfFortune();

    // 6d. Video Poker Terminals Arcade
    this.buildVideoPokerBank();

    // 6e. Tokyo Neon Cyber Pachinko / Pinball Cabinets
    this.buildPachinkoArcade();

    // 6f. Las Vegas Craps Dice Pit
    this.buildCrapsPit();

    // 7. VIP High-Roller Lounge (Raised Platform)
    this.buildVIPLounge();

    // 8. Luxury Cocktail Bar with Bartender
    this.buildCasinoBar();

    // 9. Cashier Cage & Exchange
    this.buildCashierCage();

    // 10. Maze Bank ATMs
    this.buildCasinoATMs();

    // 11. Casino Patron NPCs & Ambience Props
    this.buildCasinoPatrons();
  }

  // -------------------------------------------------------------
  // LA GRAN RULETA DE LA FORTUNA 3D (MEGA WHEEL OF FORTUNE)
  // -------------------------------------------------------------

  buildMegaWheelOfFortune() {
    const wheelGroup = new THREE.Group();
    const wx = 0;
    const wz = 6.0;
    wheelGroup.position.set(wx, 0, wz);

    // 1. Heavy Black Marble & Gold Stepped Pedestal
    const baseGeom = new THREE.CylinderGeometry(1.9, 2.1, 0.45, 24);
    const base = new THREE.Mesh(baseGeom, this.marbleMat);
    base.position.y = 0.225;
    base.receiveShadow = true;
    wheelGroup.add(base);

    const baseTrim = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.08, 24), this.goldTrimMat);
    baseTrim.position.y = 0.45;
    wheelGroup.add(baseTrim);

    // 2. Dual Fluted Brass Support Pylons
    [-1.3, 1.3].forEach(px => {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 16), this.brassMat);
      pylon.position.set(px, 1.95, 0);
      wheelGroup.add(pylon);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), this.goldTrimMat);
      cap.position.set(px, 3.65, 0);
      wheelGroup.add(cap);
    });

    // Cross brace axle housing
    const axleHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.8, 16), this.brassMat);
    axleHousing.rotation.z = Math.PI / 2;
    axleHousing.position.set(0, 3.3, 0);
    wheelGroup.add(axleHousing);

    // 3. Central Axis Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 20), this.goldTrimMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(0, 3.3, 0.22);
    wheelGroup.add(hub);

    // 4. THE SPINNING WHEEL DISC (Diameter 3.4m, 12 colorful segments)
    const discGroup = new THREE.Group();
    discGroup.position.set(0, 3.3, 0.32);

    const discGeom = new THREE.CylinderGeometry(1.7, 1.7, 0.12, 32);
    const discBackMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.5 });
    const discBack = new THREE.Mesh(discGeom, discBackMat);
    discBack.rotation.x = Math.PI / 2;
    discGroup.add(discBack);

    // 12 Colorful Radial Wedges
    const segmentColors = [
      0x3a86ff, 0x8338ec, 0xff006e, 0x3a86ff,
      0xfb5607, 0x8338ec, 0xffbe0b, 0x3a86ff,
      0x00f0ff, 0x8338ec, 0xff006e, 0xffd700
    ];

    const segAngle = (Math.PI * 2) / 12;
    for (let i = 0; i < 12; i++) {
      const wedgeGeom = new THREE.CircleGeometry(1.68, 8, i * segAngle, segAngle);
      const isJackpot = i === 11;
      const wedgeMat = new THREE.MeshStandardMaterial({
        color: segmentColors[i],
        emissive: isJackpot ? 0xffaa00 : segmentColors[i],
        emissiveIntensity: isJackpot ? 1.2 : 0.25,
        roughness: 0.3
      });
      const wedge = new THREE.Mesh(wedgeGeom, wedgeMat);
      wedge.position.z = 0.065;
      discGroup.add(wedge);

      // Gold divider radial spoke
      const spokeGeom = new THREE.BoxGeometry(0.04, 1.68, 0.03);
      const spoke = new THREE.Mesh(spokeGeom, this.brassMat);
      spoke.position.set(Math.cos(i * segAngle) * 0.84, Math.sin(i * segAngle) * 0.84, 0.08);
      spoke.rotation.z = i * segAngle - Math.PI / 2;
      discGroup.add(spoke);

      // Brass Rim Pegs
      const pegGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8);
      const peg = new THREE.Mesh(pegGeom, this.brassMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(Math.cos(i * segAngle) * 1.62, Math.sin(i * segAngle) * 1.62, 0.12);
      discGroup.add(peg);
    }

    // Golden Central Star Emblem
    const starCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16), this.goldTrimMat);
    starCenter.rotation.x = Math.PI / 2;
    starCenter.position.z = 0.09;
    discGroup.add(starCenter);

    wheelGroup.add(discGroup);
    this.wheelOfFortuneDisc = discGroup;

    // 5. Clicking Needle Pointer at 12 o'clock (Top)
    const pointerGroup = new THREE.Group();
    pointerGroup.position.set(0, 5.05, 0.42);

    const pointerBody = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 10), new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.2,
      metalness: 0.4
    }));
    pointerBody.rotation.z = Math.PI;
    pointerGroup.add(pointerBody);

    wheelGroup.add(pointerGroup);
    this.wheelNeedle = pointerGroup;

    // 6. Glowing Overhead Neon Marquee Arch
    const marqueeMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 3.0
    });
    const archBanner = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 0.25), marqueeMat);
    archBanner.position.set(0, 5.65, 0.2);
    wheelGroup.add(archBanner);

    // Decorative Flashing Bulbs along the perimeter
    for (let b = 0; b < 16; b++) {
      const bAngle = (b / 16) * Math.PI * 2;
      const bulbGeom = new THREE.SphereGeometry(0.06, 8, 8);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: b % 2 === 0 ? 0xffd700 : 0x00f0ff,
        emissiveIntensity: 2.5
      });
      const bulb = new THREE.Mesh(bulbGeom, bulbMat);
      bulb.position.set(Math.cos(bAngle) * 1.82, 3.3 + Math.sin(bAngle) * 1.82, 0.26);
      wheelGroup.add(bulb);
      this.marqueeLights.push(bulb);
    }

    this.interiorGroup.add(wheelGroup);

    // Colliders & Interactable Trigger
    const worldPos = new THREE.Vector3(this.origin.x + wx, this.origin.y, this.origin.z + wz);
    this.colliders.push({
      min: new THREE.Vector3(worldPos.x - 2.2, worldPos.y, worldPos.z - 1.2),
      max: new THREE.Vector3(worldPos.x + 2.2, worldPos.y + 6.0, worldPos.z + 1.2)
    });

    this.interactables.push({
      id: 'mega_wheel_of_fortune',
      name: 'La Gran Ruleta de la Fortuna 3D',
      type: 'WHEEL_OF_FORTUNE',
      minBet: 50,
      maxBet: 10000,
      discRef: discGroup,
      position: new THREE.Vector3(worldPos.x, worldPos.y + 1.0, worldPos.z + 3.2),
      prompt: '[E] Girar La Gran Ruleta de la Fortuna (Apuestas $50 - $10,000 | Multiplicador 100X)',
      cameraFocus: {
        pos: new THREE.Vector3(worldPos.x, worldPos.y + 3.3, worldPos.z + 5.5),
        target: new THREE.Vector3(worldPos.x, worldPos.y + 3.3, worldPos.z)
      }
    });
  }

  // -------------------------------------------------------------
  // TRAGAPERRAS EGIPCIAS: EL TESORO DEL FARAÓN (PHARAOH'S GOLD)
  // -------------------------------------------------------------

  buildPharaohSlotsBank() {
    const pharaohGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.18
    });

    const lapisMat = new THREE.MeshStandardMaterial({
      color: 0x0d2b5c,
      metalness: 0.4,
      roughness: 0.35
    });

    const positions = [
      { x: -9, z: -16, rot: 0 },
      { x: -5, z: -16, rot: 0 },
      { x: 5, z: -16, rot: 0 },
      { x: 9, z: -16, rot: 0 }
    ];

    positions.forEach((pos, idx) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(pos.x, 0, pos.z);
      pGroup.rotation.y = pos.rot;

      // Base cabinet in royal lapis blue
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.1), lapisMat);
      base.position.y = 0.6;
      pGroup.add(base);

      // Gold Egyptian trims
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 1.12), pharaohGoldMat);
      trim.position.y = 1.15;
      pGroup.add(trim);

      // Upper cabinet housing
      const upper = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 0.95), lapisMat);
      upper.position.set(0, 1.9, -0.05);
      pGroup.add(upper);

      // Egyptian Nemes Sphinx Topper Crest
      const sphinxCrest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.3), pharaohGoldMat);
      sphinxCrest.position.set(0, 2.85, -0.05);
      pGroup.add(sphinxCrest);

      // Glowing Turquoise Scarab Eyes
      [-0.25, 0.25].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 3.5
        }));
        eye.position.set(ex, 2.85, 0.12);
        pGroup.add(eye);
        this.marqueeLights.push(eye);
      });

      // 3 Rotating Cylindrical Drums
      const drumGroup = new THREE.Group();
      drumGroup.position.set(0, 1.9, 0.38);

      const drums = [];
      [-0.32, 0, 0.32].forEach((dx, dIdx) => {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.28, 20), this.reelMat);
        drum.rotation.z = Math.PI / 2;
        drum.position.x = dx;
        drumGroup.add(drum);

        const drumObj = {
          mesh: drum,
          speed: 4.2 + dIdx * 1.5,
          phaseOffset: dIdx * 0.5
        };
        this.animatedReels.push(drumObj);
        drums.push(drumObj);
      });
      pGroup.add(drumGroup);

      // Golden Ankh Pull Lever
      const lever = new THREE.Group();
      lever.position.set(0.74, 1.5, 0.1);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), pharaohGoldMat);
      rod.position.set(0.1, 0.2, 0);
      rod.rotation.z = -0.3;
      lever.add(rod);
      const ankhTop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 16), pharaohGoldMat);
      ankhTop.position.set(0.22, 0.4, 0);
      lever.add(ankhTop);
      pGroup.add(lever);

      // Velvet Barstool
      const stool = this.createStool(0, 0, 1.25);
      pGroup.add(stool);

      this.interiorGroup.add(pGroup);

      const worldPos = new THREE.Vector3(this.origin.x + pos.x, this.origin.y, this.origin.z + pos.z);
      this.colliders.push({
        min: new THREE.Vector3(worldPos.x - 0.8, worldPos.y, worldPos.z - 0.8),
        max: new THREE.Vector3(worldPos.x + 0.8, worldPos.y + 3.0, worldPos.z + 0.8)
      });

      this.interactables.push({
        id: `slot_pharaoh_${idx}`,
        name: `Tragaperras El Faraón Dorado (#${idx + 1})`,
        type: 'SLOT_MACHINE',
        theme: 'El Faraón Dorado 5000X',
        minBet: 50,
        maxBet: 5000,
        leverRef: lever,
        reels: drums,
        position: new THREE.Vector3(worldPos.x, worldPos.y + 1.0, worldPos.z + 1.5),
        prompt: `[E] Jugar El Faraón Dorado (Apuesta $50 - $5,000 | Jackpot Hieroglífico)`,
        cameraFocus: {
          pos: new THREE.Vector3(worldPos.x, worldPos.y + 1.9, worldPos.z + 2.4),
          target: new THREE.Vector3(worldPos.x, worldPos.y + 1.9, worldPos.z)
        }
      });
    });
  }

  // -------------------------------------------------------------
  // TERMINALES DE VIDEO POKER 3D (JACKS OR BETTER)
  // -------------------------------------------------------------

  buildVideoPokerBank() {
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0x241120, // Vintage deep plum lacquer
      metalness: 0.6,
      roughness: 0.3
    });

    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0088cc,
      emissiveIntensity: 2.8,
      roughness: 0.1
    });

    const vpPositions = [
      { x: -18, z: 0, rot: Math.PI / 2 },
      { x: -14, z: 0, rot: Math.PI / 2 },
      { x: 14, z: 0, rot: -Math.PI / 2 },
      { x: 18, z: 0, rot: -Math.PI / 2 }
    ];

    vpPositions.forEach((pos, idx) => {
      const vpGroup = new THREE.Group();
      vpGroup.position.set(pos.x, 0, pos.z);
      vpGroup.rotation.y = pos.rot;

      // Lower arcade pedestal
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), cabinetMat);
      lower.position.y = 0.5;
      vpGroup.add(lower);

      // Slanted CRT console section
      const consoleGeom = new THREE.BoxGeometry(1.2, 0.45, 0.85);
      const cons = new THREE.Mesh(consoleGeom, cabinetMat);
      cons.position.set(0, 1.15, 0.15);
      cons.rotation.x = -0.3;
      vpGroup.add(cons);

      // 5 Interactive Card Hold Buttons on the deck
      [-0.36, -0.18, 0, 0.18, 0.36].forEach(bx => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), new THREE.MeshStandardMaterial({
          color: 0xffd700,
          roughness: 0.3
        }));
        btn.rotation.x = -0.3;
        btn.position.set(bx, 1.25, 0.42);
        vpGroup.add(btn);
      });

      // Slanted CRT Monitor displaying card hands
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.65), screenMat);
      screen.position.set(0, 1.85, 0.28);
      screen.rotation.x = -0.15;
      vpGroup.add(screen);

      // Neon Top Header: "VIDEO POKER ROYAL FLUSH"
      const topperMat = new THREE.MeshStandardMaterial({
        color: 0xff007f,
        emissive: 0xff007f,
        emissiveIntensity: 2.5
      });
      const topper = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 0.25), topperMat);
      topper.position.set(0, 2.45, -0.05);
      vpGroup.add(topper);
      this.marqueeLights.push(topper);

      // Stool
      const stool = this.createStool(0, 0, 1.15);
      vpGroup.add(stool);

      this.interiorGroup.add(vpGroup);

      const worldPos = new THREE.Vector3(this.origin.x + pos.x, this.origin.y, this.origin.z + pos.z);
      this.colliders.push({
        min: new THREE.Vector3(worldPos.x - 0.7, worldPos.y, worldPos.z - 0.7),
        max: new THREE.Vector3(worldPos.x + 0.7, worldPos.y + 2.7, worldPos.z + 0.7)
      });

      this.interactables.push({
        id: `video_poker_${idx}`,
        name: `Terminal Video Poker Jacks or Better (#${idx + 1})`,
        type: 'VIDEO_POKER',
        minBet: 25,
        maxBet: 2500,
        position: new THREE.Vector3(worldPos.x, worldPos.y + 1.0, worldPos.z),
        prompt: '[E] Jugar Video Poker Jacks or Better (Apuesta $25 - $2,500)',
        cameraFocus: {
          pos: new THREE.Vector3(worldPos.x + Math.sin(pos.rot) * 1.8, worldPos.y + 1.8, worldPos.z + Math.cos(pos.rot) * 1.8),
          target: new THREE.Vector3(worldPos.x, worldPos.y + 1.8, worldPos.z)
        }
      });
    });
  }

  // -------------------------------------------------------------
  // ARCADE PACHINKO / PINBALL TOKIO CYBER NEON 3D
  // -------------------------------------------------------------

  buildPachinkoArcade() {
    const pachinkoMat = new THREE.MeshStandardMaterial({
      color: 0x050c1a,
      metalness: 0.8,
      roughness: 0.2
    });

    const neonPinkMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 3.0
    });

    const positions = [
      { x: 28, z: -12 },
      { x: 28, z: -6 },
      { x: 28, z: 0 },
      { x: 28, z: 6 }
    ];

    positions.forEach((pos, idx) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(pos.x, 0, pos.z);
      pGroup.rotation.y = -Math.PI / 2; // Facing West into casino aisle

      // Vertical pinball casing
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.6), pachinkoMat);
      cabinet.position.y = 1.15;
      pGroup.add(cabinet);

      // Internal pin field with glowing bumpers
      const playfieldMat = new THREE.MeshStandardMaterial({
        color: 0x1a0933,
        emissive: 0x4a0e4e,
        emissiveIntensity: 0.8
      });
      const playfield = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.45), playfieldMat);
      playfield.position.set(0, 1.35, 0.22);
      pGroup.add(playfield);

      // Brass Pin Pegs in staggered pattern
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 6; c++) {
          const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), this.brassMat);
          pin.rotation.x = Math.PI / 2;
          pin.position.set(-0.35 + c * 0.14 + (r % 2) * 0.07, 0.95 + r * 0.22, 0.24);
          pGroup.add(pin);
        }
      }

      // Front Protective Glass
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1
      }));
      glass.position.set(0, 1.35, 0.3);
      pGroup.add(glass);

      // Anime Cyber Marquee Topper: "PACHINKO 777"
      const topper = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 0.2), neonPinkMat);
      topper.position.set(0, 2.45, 0.05);
      pGroup.add(topper);
      this.marqueeLights.push(topper);

      this.interiorGroup.add(pGroup);

      const worldPos = new THREE.Vector3(this.origin.x + pos.x, this.origin.y, this.origin.z + pos.z);
      this.colliders.push({
        min: new THREE.Vector3(worldPos.x - 0.6, worldPos.y, worldPos.z - 0.6),
        max: new THREE.Vector3(worldPos.x + 0.6, worldPos.y + 2.6, worldPos.z + 0.6)
      });

      this.interactables.push({
        id: `pachinko_${idx}`,
        name: `Pachinko Tokyo Neon Fever (#${idx + 1})`,
        type: 'PACHINKO',
        minBet: 10,
        maxBet: 1000,
        position: new THREE.Vector3(worldPos.x - 1.2, worldPos.y + 1.0, worldPos.z),
        prompt: '[E] Jugar Pachinko Tokio Cyber (Apuesta $10 - $1,000)',
        cameraFocus: {
          pos: new THREE.Vector3(worldPos.x - 2.2, worldPos.y + 1.6, worldPos.z),
          target: new THREE.Vector3(worldPos.x, worldPos.y + 1.6, worldPos.z)
        }
      });
    });
  }

  // -------------------------------------------------------------
  // MESA DE CRAPS (DADOS DE LAS VEGAS) 3D
  // -------------------------------------------------------------

  buildCrapsPit() {
    const crapsGroup = new THREE.Group();
    const cx = 12;
    const cz = -2;
    crapsGroup.position.set(cx, 0, cz);

    // 1. Heavy Mahogany Base & Trestle Legs
    const tableGeom = new THREE.BoxGeometry(4.6, 0.85, 2.3);
    const tableBase = new THREE.Mesh(tableGeom, this.woodTrimMat);
    tableBase.position.y = 0.425;
    tableBase.castShadow = true;
    crapsGroup.add(tableBase);

    // 2. High Recessed Craps Walls & Armrest Rail
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.6 });
    const wallFrame = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.35, 2.4), railMat);
    wallFrame.position.y = 0.95;
    crapsGroup.add(wallFrame);

    // 3. Deep Monaco Emerald Craps Felt
    const feltGeom = new THREE.PlaneGeometry(4.2, 1.9);
    const crapsFelt = new THREE.Mesh(feltGeom, this.greenFeltMat);
    crapsFelt.rotation.x = -Math.PI / 2;
    crapsFelt.position.y = 0.88;
    crapsGroup.add(crapsFelt);

    // 4. White Dice Markings (Pass line, Field, Come, Hardways)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerBorder = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.04), lineMat);
    centerBorder.rotation.x = -Math.PI / 2;
    centerBorder.position.set(0, 0.885, 0);
    crapsGroup.add(centerBorder);

    // 5. Red Translucent Acrylic Dice resting on table
    const diceMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.1
    });
    const d1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), diceMat);
    d1.position.set(0.4, 0.92, 0.1);
    d1.rotation.set(0.3, 0.4, 0.1);
    crapsGroup.add(d1);

    const d2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), diceMat);
    d2.position.set(0.55, 0.92, 0.25);
    d2.rotation.set(0.1, 0.8, 0.4);
    crapsGroup.add(d2);

    // 6. Chip Stacks on the edge
    const chipColors = [0xd90429, 0x00f0ff, 0x111111, 0x00e676];
    chipColors.forEach((color, idx) => {
      const chipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3
      }));
      chipMesh.position.set(-1.6 + idx * 0.18, 0.91, -0.75);
      crapsGroup.add(chipMesh);
    });

    this.interiorGroup.add(crapsGroup);

    const worldPos = new THREE.Vector3(this.origin.x + cx, this.origin.y, this.origin.z + cz);
    this.colliders.push({
      min: new THREE.Vector3(worldPos.x - 2.5, worldPos.y, worldPos.z - 1.4),
      max: new THREE.Vector3(worldPos.x + 2.5, worldPos.y + 1.4, worldPos.z + 1.4)
    });

    this.interactables.push({
      id: 'craps_table_01',
      name: 'Mesa de Craps de Las Vegas (Dados)',
      type: 'CRAPS_TABLE',
      minBet: 25,
      maxBet: 5000,
      position: new THREE.Vector3(worldPos.x, worldPos.y + 1.0, worldPos.z + 1.8),
      prompt: '[E] Jugar Dados / Craps de Las Vegas (Apuesta $25 - $5,000)',
      cameraFocus: {
        pos: new THREE.Vector3(worldPos.x, worldPos.y + 2.4, worldPos.z + 2.2),
        target: new THREE.Vector3(worldPos.x, worldPos.y + 0.9, worldPos.z)
      }
    });
  }

  buildWall(x, y, z, w, h, d) {
    const wallGeom = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(wallGeom, this.marbleMat);
    wall.position.set(x, y, z);
    wall.receiveShadow = true;
    this.interiorGroup.add(wall);

    // Gold baseboard & crown molding trim
    const trimGeom = new THREE.BoxGeometry(w + 0.1, 0.4, d + 0.1);
    const baseTrim = new THREE.Mesh(trimGeom, this.goldTrimMat);
    baseTrim.position.set(x, 0.2, z);
    this.interiorGroup.add(baseTrim);

    const crownTrim = new THREE.Mesh(trimGeom, this.goldTrimMat);
    crownTrim.position.set(x, 8.3, z);
    this.interiorGroup.add(crownTrim);

    this.colliders.push({
      min: new THREE.Vector3(this.origin.x + x - w / 2, this.origin.y, this.origin.z + z - d / 2),
      max: new THREE.Vector3(this.origin.x + x + w / 2, this.origin.y + h, this.origin.z + z + d / 2)
    });
  }

  buildPillar(x, z) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, 0, z);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 8.5, 16), this.marbleMat);
    shaft.position.y = 4.25;
    shaft.castShadow = true;
    pGroup.add(shaft);

    const capGeom = new THREE.BoxGeometry(1.9, 0.5, 1.9);
    const base = new THREE.Mesh(capGeom, this.goldTrimMat);
    base.position.y = 0.25;
    pGroup.add(base);

    const capital = new THREE.Mesh(capGeom, this.goldTrimMat);
    capital.position.y = 8.25;
    pGroup.add(capital);

    this.interiorGroup.add(pGroup);

    this.colliders.push({
      min: new THREE.Vector3(this.origin.x + x - 0.95, this.origin.y, this.origin.z + z - 0.95),
      max: new THREE.Vector3(this.origin.x + x + 0.95, this.origin.y + 8.5, this.origin.z + z + 0.95)
    });
  }

  buildChandelier(x, y, z) {
    const cGroup = new THREE.Group();
    cGroup.position.set(x, y, z);

    [2.4, 1.6, 0.9].forEach((radius, idx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.08, 8, 24), this.brassMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -idx * 0.45;
      cGroup.add(ring);
    });

    const light = new THREE.PointLight(0xffdf99, 2.8, 36, 1.3);
    light.position.set(0, -1.0, 0);
    cGroup.add(light);

    this.interiorGroup.add(cGroup);
  }

  buildWallSconces() {
    // North Wall sconces
    for (let x = -24; x <= 24; x += 16) {
      this.createSconce(x, 4.5, -43.3, 0);
    }
    // South Wall sconces
    for (let x = -24; x <= 24; x += 16) {
      if (Math.abs(x) > 6) this.createSconce(x, 4.5, 43.3, Math.PI);
    }
    // East Wall sconces
    for (let z = -32; z <= 32; z += 16) {
      this.createSconce(32.3, 4.5, z, -Math.PI / 2);
    }
    // West Wall sconces
    for (let z = -32; z <= 32; z += 16) {
      this.createSconce(-32.3, 4.5, z, Math.PI / 2);
    }
  }

  createSconce(x, y, z, rotY) {
    const sGroup = new THREE.Group();
    sGroup.position.set(x, y, z);
    sGroup.rotation.y = rotY;

    // Brass wall plate
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.08), this.brassMat);
    sGroup.add(plate);

    // Glowing frosted glass shade
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xffe2a3,
      emissive: 0xffc454,
      emissiveIntensity: 2.2
    });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.45, 12), shadeMat);
    shade.position.set(0, 0.05, 0.18);
    sGroup.add(shade);

    const light = new THREE.PointLight(0xffdf99, 1.8, 20, 1.4);
    light.position.set(0, 0.1, 0.25);
    sGroup.add(light);

    this.interiorGroup.add(sGroup);
  }

  buildOverheadMarquee() {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 6.2, 18);

    // Golden truss arch span across the aisle (W: 14m)
    const span = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 0.6), this.goldTrimMat);
    archGroup.add(span);

    // Grand Marquee Neon Sign
    const marqueeMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa500,
      emissiveIntensity: 3.2
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 0.2), marqueeMat);
    signBoard.position.set(0, 0.8, 0);
    archGroup.add(signBoard);

    this.interiorGroup.add(archGroup);
  }

  // -------------------------------------------------------------
  // ENTRANCE FOYER & CITY PORTAL
  // -------------------------------------------------------------

  buildEntranceFoyer() {
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 0.4), this.goldTrimMat);
    doorFrame.position.set(0, 2.25, 43.5);
    this.interiorGroup.add(doorFrame);

    // Glowing exit arch banner
    const exitBannerMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 2.2
    });
    const exitBanner = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.2), exitBannerMat);
    exitBanner.position.set(0, 4.8, 43.4);
    this.interiorGroup.add(exitBanner);

    // Golden revolving entrance stanchions
    [-3.2, 3.2].forEach(stX => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 10), this.brassMat);
      post.position.set(stX, 0.55, 40.5);
      this.interiorGroup.add(post);
    });

    this.interactables.push({
      id: 'casino_exit',
      name: 'Salida al Diamond Strip',
      type: 'CASINO_EXIT',
      position: new THREE.Vector3(this.origin.x, this.origin.y + 1.0, this.origin.z + 41.0),
      prompt: '[E] Salir a Million Dollar City (Diamond Strip)',
      cameraFocus: null
    });
  }

  // -------------------------------------------------------------
  // ANIMATED 3D SLOT MACHINE BANKS ("Con las máquinas animadas y todo")
  // -------------------------------------------------------------

  buildSlotMachineBanks() {
    // Front Welcome Banks (Facing South towards entrance: Z = 24)
    [-16, -12, -8].forEach((x, i) => {
      this.createSlotMachine(x, 24, Math.PI, 'Neon Diamonds', 0x0a192f, 0x00f0ff, 10, 500, i);
    });

    [8, 12, 16].forEach((x, i) => {
      this.createSlotMachine(x, 24, Math.PI, 'Mega Jackpot 777', 0x660708, 0xffd700, 25, 2500, i + 3);
    });

    // Bank 1: "NEON DIAMONDS" (Back Left side: X = -18 to -6, Z = -28)
    const neonXs = [-18, -14, -10, -6];
    neonXs.forEach((x, i) => {
      this.createSlotMachine(x, -28, 0, 'Neon Diamonds', 0x0a192f, 0x00f0ff, 10, 500, i + 6);
    });

    // Bank 2: "MEGA JACKPOT 777" (Back Right side: X = 6 to 18, Z = -28)
    const jackpotXs = [6, 10, 14, 18];
    jackpotXs.forEach((x, i) => {
      this.createSlotMachine(x, -28, 0, 'Mega Jackpot 777', 0x660708, 0xffd700, 25, 2500, i + 10);
    });

    // Bank 3: "DRAGON GOLD VIP" (East side: X = 22, Z = 5 to -5)
    [-5, 0, 5].forEach((z, i) => {
      this.createSlotMachine(22, z, -Math.PI / 2, 'Dragon Gold VIP', 0x1b4332, 0xffb703, 50, 5000, i + 14);
    });

    // Bank 4: "CYBER VEGAS" (West side: X = -22, Z = 5 to -5)
    [-5, 0, 5].forEach((z, i) => {
      this.createSlotMachine(-22, z, Math.PI / 2, 'Cyber Vegas', 0x3a0ca3, 0xff007f, 10, 1000, i + 17);
    });
  }

  createSlotMachine(x, z, rotY, themeName, cabinetColor, accentColor, minBet, maxBet, idx) {
    const slotGroup = new THREE.Group();
    slotGroup.position.set(x, 0, z);
    slotGroup.rotation.y = rotY;

    const cabinetMat = new THREE.MeshStandardMaterial({
      color: cabinetColor,
      metalness: 0.5,
      roughness: 0.25
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 2.2
    });

    // 1. Lower Cabinet Base & Coin Tray
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.15, 1.1), cabinetMat);
    lower.position.set(0, 0.575, 0);
    lower.castShadow = true;
    slotGroup.add(lower);

    // Chrome Coin Tray
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.25), trayMat);
    tray.position.set(0, 0.25, 0.55);
    slotGroup.add(tray);

    // 2. Upper Cabinet Housing & Recessed Reel Chamber
    const upper = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, 0.95), cabinetMat);
    upper.position.set(0, 1.85, -0.05);
    upper.castShadow = true;
    slotGroup.add(upper);

    // Recessed dark reel background chamber
    const chamberMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.9 });
    const chamber = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.65, 0.2), chamberMat);
    chamber.position.set(0, 1.85, 0.38);
    slotGroup.add(chamber);

    // 3. THREE SEPARATE CYLINDRICAL REELS (Actual 3D rotating drums!)
    const reelGroup = new THREE.Group();
    reelGroup.position.set(0, 1.85, 0.38);

    const reelOffsets = [-0.31, 0, 0.31];
    const machineReels = [];

    reelOffsets.forEach((rx, rIdx) => {
      const reelGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.26, 20);
      const reelMesh = new THREE.Mesh(reelGeom, this.reelMat);
      reelMesh.rotation.z = Math.PI / 2; // Horizontal drum axis
      reelMesh.position.set(rx, 0, 0);
      reelGroup.add(reelMesh);

      const speedBase = 3.5 + Math.random() * 4.0;
      const reelObj = {
        mesh: reelMesh,
        speed: speedBase,
        isSpinning: true,
        phaseOffset: rIdx * 0.4
      };
      this.animatedReels.push(reelObj);
      machineReels.push(reelObj);
    });

    slotGroup.add(reelGroup);

    // Glass Cover in front of reels
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.9
    });
    const glassCover = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.65), glassMat);
    glassCover.position.set(0, 1.85, 0.5);
    slotGroup.add(glassCover);

    // 4. Glowing Neon Marquee Top & Jackpot Banner
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.35), accentMat);
    marquee.position.set(0, 2.7, -0.05);
    slotGroup.add(marquee);
    this.marqueeLights.push(marquee);

    // Vertical LED side strips that pulse in sequence
    [-0.64, 0.64].forEach(sx => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.08), accentMat);
      strip.position.set(sx, 1.85, 0.44);
      slotGroup.add(strip);
      this.marqueeLights.push(strip);
    });

    // 5. Mechanical Spin Pull Lever (With brass rod & crimson ball knob)
    const leverGroup = new THREE.Group();
    leverGroup.position.set(0.72, 1.45, 0.1);
    
    const leverRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), this.brassMat);
    leverRod.position.set(0.08, 0.18, 0);
    leverRod.rotation.z = -0.3;
    leverGroup.add(leverRod);

    const knobMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.2 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), knobMat);
    knob.position.set(0.18, 0.36, 0);
    leverGroup.add(knob);

    slotGroup.add(leverGroup);

    // 6. Leather Barstool in front of the machine
    const stool = this.createStool(0, 0, 1.25);
    slotGroup.add(stool);

    this.interiorGroup.add(slotGroup);

    // Colliders (Cabinet + Stool)
    const worldPos = new THREE.Vector3(this.origin.x + x, this.origin.y, this.origin.z + z);
    this.colliders.push({
      min: new THREE.Vector3(worldPos.x - 0.75, worldPos.y, worldPos.z - 0.75),
      max: new THREE.Vector3(worldPos.x + 0.75, worldPos.y + 2.8, worldPos.z + 0.75)
    });

    // Interaction trigger
    this.interactables.push({
      id: `slot_machine_${idx}`,
      name: `${themeName} (#${idx + 1})`,
      type: 'SLOT_MACHINE',
      theme: themeName,
      minBet,
      maxBet,
      leverRef: leverGroup,
      reels: machineReels,
      position: new THREE.Vector3(
        this.origin.x + x + Math.sin(rotY) * 1.5,
        this.origin.y + 1.0,
        this.origin.z + z + Math.cos(rotY) * 1.5
      ),
      prompt: `[E] Jugar Tragaperras: ${themeName} (Apuesta $${minBet} - $${maxBet})`,
      cameraFocus: {
        pos: new THREE.Vector3(
          this.origin.x + x + Math.sin(rotY) * 2.2,
          this.origin.y + 1.85,
          this.origin.z + z + Math.cos(rotY) * 2.2
        ),
        target: new THREE.Vector3(
          this.origin.x + x,
          this.origin.y + 1.85,
          this.origin.z + z
        )
      }
    });
  }

  createStool(x, y, z) {
    const sGroup = new THREE.Group();
    sGroup.position.set(x, y, z);

    // Brass Base & Foot Ring
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.05, 16), this.brassMat);
    base.position.y = 0.025;
    sGroup.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 10), this.brassMat);
    stem.position.y = 0.35;
    sGroup.add(stem);

    const footRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 16), this.brassMat);
    footRing.rotation.x = Math.PI / 2;
    footRing.position.y = 0.22;
    sGroup.add(footRing);

    // Padded Leather Swivel Cushion
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16), this.leatherMat);
    seat.position.y = 0.72;
    sGroup.add(seat);

    return sGroup;
  }

  // -------------------------------------------------------------
  // BLACKJACK PIT WITH SUITED CROUPIERS
  // -------------------------------------------------------------

  buildBlackjackPit() {
    const tablePositions = [
      { x: -10, z: 12, minBet: 25, maxBet: 1000 },
      { x: -18, z: 12, minBet: 100, maxBet: 5000 },
      { x: -10, z: -2, minBet: 50, maxBet: 2500 },
      { x: -18, z: -2, minBet: 500, maxBet: 25000 }
    ];

    tablePositions.forEach((tp, idx) => {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(tp.x, 0, tp.z);

      // Wooden base
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.88, 2.2), this.woodTrimMat);
      base.position.set(0, 0.44, 0);
      base.castShadow = true;
      tableGroup.add(base);

      // Emerald Felt Top
      const felt = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 2.0), this.greenFeltMat);
      felt.position.set(0, 0.9, 0);
      tableGroup.add(felt);

      // Black Padded Armrest
      const armrest = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.1, 0.18), this.leatherMat);
      armrest.position.set(0, 0.95, 1.05);
      tableGroup.add(armrest);

      // Dealer Chip Rack filled with colorful chip rolls
      this.buildChipTray(tableGroup, 0, 0.94, -0.65);

      // Card Dealing Shoe
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.35), shoeMat);
      shoe.position.set(1.1, 0.97, -0.55);
      tableGroup.add(shoe);

      // Dealt Playing Cards on the Felt
      this.buildCardsOnTable(tableGroup);

      // 3D Suited Croupier behind the table
      const dealer = this.createDealerNPC(0, 0, -1.2, 0);
      tableGroup.add(dealer);

      // Player Stools
      [-1.1, 0, 1.1].forEach(sx => {
        tableGroup.add(this.createStool(sx, 0, 1.4));
      });

      this.interiorGroup.add(tableGroup);

      this.colliders.push({
        min: new THREE.Vector3(this.origin.x + tp.x - 2.0, this.origin.y, this.origin.z + tp.z - 1.4),
        max: new THREE.Vector3(this.origin.x + tp.x + 2.0, this.origin.y + 1.2, this.origin.z + tp.z + 1.5)
      });

      this.interactables.push({
        id: `blackjack_table_${idx}`,
        name: `Mesa de Blackjack Royale #${idx + 1} ($${tp.minBet} - $${tp.maxBet})`,
        type: 'BLACKJACK_TABLE',
        minBet: tp.minBet,
        maxBet: tp.maxBet,
        position: new THREE.Vector3(this.origin.x + tp.x, this.origin.y + 1.0, this.origin.z + tp.z + 1.6),
        prompt: `[E] Jugar Blackjack (Apuestas $${tp.minBet} - $${tp.maxBet})`,
        cameraFocus: {
          pos: new THREE.Vector3(this.origin.x + tp.x, this.origin.y + 2.5, this.origin.z + tp.z + 2.0),
          target: new THREE.Vector3(this.origin.x + tp.x, this.origin.y + 0.9, this.origin.z + tp.z)
        }
      });
    });
  }

  buildChipTray(parent, x, y, z) {
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6 });
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), rackMat);
    rack.position.set(x, y, z);
    parent.add(rack);

    // Colored Chip Rolls
    const chipColors = [0xd90429, 0x0077b6, 0x2ec4b6, 0xffb703, 0x111111];
    chipColors.forEach((color, i) => {
      const rollMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 10), rollMat);
      roll.rotation.x = Math.PI / 2;
      roll.position.set(x - 0.32 + i * 0.16, y + 0.05, z);
      parent.add(roll);
    });
  }

  buildCardsOnTable(parent) {
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const cardBackMat = new THREE.MeshStandardMaterial({ color: 0xb7094c, roughness: 0.4 });

    [-0.6, 0, 0.6].forEach(cx => {
      // 2 Cards per player spot
      const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.18), cardMat);
      c1.rotation.x = -Math.PI / 2;
      c1.rotation.z = (Math.random() - 0.5) * 0.2;
      c1.position.set(cx - 0.04, 0.935, 0.35);
      parent.add(c1);

      const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.18), cardBackMat);
      c2.rotation.x = -Math.PI / 2;
      c2.rotation.z = (Math.random() - 0.5) * 0.2;
      c2.position.set(cx + 0.05, 0.936, 0.37);
      parent.add(c2);
    });
  }

  // -------------------------------------------------------------
  // EUROPEAN ROULETTE PIT WITH ROTATING WHEEL & ROLLING BALL
  // -------------------------------------------------------------

  buildRoulettePit() {
    const rouletteTables = [
      { x: 12, z: 12, minBet: 10, maxBet: 2000 },
      { x: 12, z: -2, minBet: 50, maxBet: 10000 }
    ];

    rouletteTables.forEach((rt, idx) => {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(rt.x, 0, rt.z);

      // Base
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.88, 2.4), this.woodTrimMat);
      base.position.set(0, 0.44, 0);
      base.castShadow = true;
      tableGroup.add(base);

      // Emerald Felt Grid
      const felt = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 2.1), this.greenFeltMat);
      felt.position.set(0.7, 0.9, 0);
      tableGroup.add(felt);

      // Mahogany Wheel Outer Bowl
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.64, 0.25, 24), this.woodTrimMat);
      bowl.position.set(-1.25, 0.98, 0);
      tableGroup.add(bowl);

      // Rotating Brass Turret Assembly
      const wheelTurret = new THREE.Group();
      wheelTurret.position.set(-1.25, 1.05, 0);

      const brassRim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 10, 32), this.brassMat);
      brassRim.rotation.x = Math.PI / 2;
      wheelTurret.add(brassRim);

      const numberTrackMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.5 });
      const numberTrack = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.08, 32), numberTrackMat);
      numberTrack.position.y = -0.02;
      wheelTurret.add(numberTrack);

      const centerSpindle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 12), this.brassMat);
      wheelTurret.add(centerSpindle);

      tableGroup.add(wheelTurret);
      this.rouletteWheels.push(wheelTurret);

      // Real 3D Rolling Ivory Ball
      const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.8 });
      const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), ballMat);
      ballMesh.position.set(-1.25 + 0.56, 1.1, 0);
      tableGroup.add(ballMesh);

      this.rouletteBalls.push({
        mesh: ballMesh,
        center: new THREE.Vector3(-1.25, 1.1, 0),
        radius: 0.56,
        angle: Math.random() * Math.PI * 2,
        speed: -3.2
      });

      // Suited Croupier
      const dealer = this.createDealerNPC(-1.25, 0, -1.2, 0);
      tableGroup.add(dealer);

      // Stools
      [-0.4, 0.4, 1.2, 2.0].forEach(sx => {
        tableGroup.add(this.createStool(sx, 0, 1.4));
      });

      this.interiorGroup.add(tableGroup);

      this.colliders.push({
        min: new THREE.Vector3(this.origin.x + rt.x - 2.4, this.origin.y, this.origin.z + rt.z - 1.4),
        max: new THREE.Vector3(this.origin.x + rt.x + 2.4, this.origin.y + 1.2, this.origin.z + rt.z + 1.4)
      });

      this.interactables.push({
        id: `roulette_table_${idx}`,
        name: `Ruleta Europea Royale #${idx + 1} ($${rt.minBet} - $${rt.maxBet})`,
        type: 'ROULETTE_TABLE',
        minBet: rt.minBet,
        maxBet: rt.maxBet,
        position: new THREE.Vector3(this.origin.x + rt.x, this.origin.y + 1.0, this.origin.z + rt.z + 1.6),
        prompt: `[E] Jugar Ruleta Europea (Mesa #${idx + 1})`,
        cameraFocus: {
          pos: new THREE.Vector3(this.origin.x + rt.x, this.origin.y + 2.6, this.origin.z + rt.z + 2.0),
          target: new THREE.Vector3(this.origin.x + rt.x, this.origin.y + 0.9, this.origin.z + rt.z)
        }
      });
    });
  }

  // -------------------------------------------------------------
  // SUITED DEALER (CROUPIER) NPC GENERATOR
  // -------------------------------------------------------------

  createDealerNPC(x, y, z, rotY) {
    const dealerGroup = new THREE.Group();
    dealerGroup.position.set(x, y, z);
    dealerGroup.rotation.y = rotY;

    const suitMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.7 });
    const whiteShirtMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdbad97, roughness: 0.6 });
    const goldMat = this.goldTrimMat;

    // Torso / Vest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.22), suitMat);
    torso.position.y = 1.25;
    dealerGroup.add(torso);

    // White Shirt Inner V
    const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.05), whiteShirtMat);
    innerShirt.position.set(0, 1.28, 0.1);
    dealerGroup.add(innerShirt);

    // Black Bow Tie
    const bowTie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.06), suitMat);
    bowTie.position.set(0, 1.48, 0.12);
    dealerGroup.add(bowTie);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), skinMat);
    head.position.y = 1.68;
    dealerGroup.add(head);

    // Sleek Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.22), new THREE.MeshStandardMaterial({ color: 0x1f1917 }));
    hair.position.y = 1.78;
    dealerGroup.add(hair);

    // Arms resting on table edge
    [-0.24, 0.24].forEach(ax => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.12), suitMat);
      arm.position.set(ax, 1.2, 0.1);
      arm.rotation.x = -0.4;
      dealerGroup.add(arm);
    });

    return dealerGroup;
  }

  // -------------------------------------------------------------
  // CASINO PATRONS & LIFE
  // -------------------------------------------------------------

  buildCasinoPatrons() {
    // 3D Stylized Patrons seated around the casino
    const patronSpots = [
      { x: -14, z: -26.8, rotY: 0, color: 0xd90429 },
      { x: 10, z: -26.8, rotY: 0, color: 0x0077b6 },
      { x: -10, z: 13.4, rotY: Math.PI, color: 0x2b9348 },
      { x: 12, z: 13.4, rotY: Math.PI, color: 0x7209b7 }
    ];

    patronSpots.forEach(ps => {
      const pGroup = new THREE.Group();
      pGroup.position.set(ps.x, 0.75, ps.z);
      pGroup.rotation.y = ps.rotY;

      const clothMat = new THREE.MeshStandardMaterial({ color: ps.color, roughness: 0.6 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0a899, roughness: 0.6 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.45, 0.2), clothMat);
      torso.position.y = 0.28;
      pGroup.add(torso);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), skinMat);
      head.position.y = 0.6;
      pGroup.add(head);

      this.interiorGroup.add(pGroup);
      this.patronMeshes.push(pGroup);
    });
  }

  // -------------------------------------------------------------
  // VIP HIGH-ROLLER LOUNGE
  // -------------------------------------------------------------

  buildVIPLounge() {
    const vipGroup = new THREE.Group();
    vipGroup.position.set(-22, 0, -22);

    // Raised VIP Platform (H: 0.6m)
    const platform = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 20), this.marbleMat);
    platform.position.set(0, 0.3, 0);
    vipGroup.add(platform);

    // Balustrade Railings with Brass Pillars
    const railMat = this.brassMat;
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 16, 8), railMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, 1.2, 10);
    vipGroup.add(topRail);

    // VIP High-Stakes Table
    const vipTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.88, 2.2), this.woodTrimMat);
    vipTable.position.set(0, 1.04, 0);
    vipGroup.add(vipTable);

    const feltMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 2.0), this.blueFeltMat);
    feltMesh.position.set(0, 1.5, 0);
    vipGroup.add(feltMesh);

    // High roller dealer
    const dealer = this.createDealerNPC(0, 0.6, -1.2, 0);
    vipGroup.add(dealer);

    // Plush Velvet Lounge Sofa (Corner seating)
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3d0c11, roughness: 0.7 });
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.45, 1.6), sofaMat);
    sofaSeat.position.set(-4.5, 0.8, -4.5);
    vipGroup.add(sofaSeat);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.65, 0.3), sofaMat);
    sofaBack.position.set(-4.5, 1.2, -5.35);
    vipGroup.add(sofaBack);

    // Champagne Bucket Table
    const tableGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.55, 16);
    const tableMesh = new THREE.Mesh(tableGeom, this.goldTrimMat);
    tableMesh.position.set(-4.5, 0.85, -2.5);
    vipGroup.add(tableMesh);

    // Glowing VIP Neon Marquee Sign
    const vipSignMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 3.2
    });
    const vipSign = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.2, 0.2), vipSignMat);
    vipSign.position.set(0, 4.8, 9.8);
    vipGroup.add(vipSign);

    this.interiorGroup.add(vipGroup);

    this.colliders.push({
      min: new THREE.Vector3(this.origin.x - 30, this.origin.y, this.origin.z - 32),
      max: new THREE.Vector3(this.origin.x - 14, this.origin.y + 1.2, this.origin.z - 12)
    });

    this.interactables.push({
      id: 'vip_blackjack',
      name: 'Blackjack Sala VIP High Roller ($1,000 - $100,000)',
      type: 'BLACKJACK_TABLE',
      minBet: 1000,
      maxBet: 100000,
      position: new THREE.Vector3(this.origin.x - 22, this.origin.y + 1.2, this.origin.z - 20.2),
      prompt: '[E] Jugar Blackjack VIP High-Roller ($1,000 - $100,000)',
      cameraFocus: {
        pos: new THREE.Vector3(this.origin.x - 22, this.origin.y + 2.8, this.origin.z - 18.5),
        target: new THREE.Vector3(this.origin.x - 22, this.origin.y + 1.5, this.origin.z - 22)
      }
    });
  }

  // -------------------------------------------------------------
  // CASINO COCKTAIL BAR
  // -------------------------------------------------------------

  buildCasinoBar() {
    const barGroup = new THREE.Group();
    barGroup.position.set(24, 0, -15);

    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.15, 14), this.woodTrimMat);
    barCounter.position.set(0, 0.575, 0);
    barCounter.castShadow = true;
    barGroup.add(barCounter);

    const marbleTop = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.08, 14.2), this.marbleMat);
    marbleTop.position.set(0, 1.18, 0);
    barGroup.add(marbleTop);

    // Shelving with colorful glowing liquor bottles
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 13), this.woodTrimMat);
    shelf.position.set(6.5, 2.4, 0);
    barGroup.add(shelf);

    // Bottle rows
    const bottleColors = [0xff0055, 0x00f0ff, 0xffd700, 0x00ff88];
    for (let by = 1.2; by <= 3.6; by += 0.8) {
      for (let bz = -5.5; bz <= 5.5; bz += 0.7) {
        const bColor = bottleColors[Math.floor(Math.random() * bottleColors.length)];
        const bMat = new THREE.MeshStandardMaterial({ color: bColor, emissive: bColor, emissiveIntensity: 1.2 });
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8), bMat);
        bottle.position.set(6.1, by, bz);
        barGroup.add(bottle);
      }
    }

    const barLight = new THREE.PointLight(0xff007f, 2.5, 16, 1.2);
    barLight.position.set(6.0, 2.8, 0);
    barGroup.add(barLight);

    // Bartender
    const bartender = this.createDealerNPC(1.2, 0, 0, -Math.PI / 2);
    barGroup.add(bartender);

    this.interiorGroup.add(barGroup);

    this.colliders.push({
      min: new THREE.Vector3(this.origin.x + 22, this.origin.y, this.origin.z - 22),
      max: new THREE.Vector3(this.origin.x + 31, this.origin.y + 3.0, this.origin.z - 8)
    });
  }

  // -------------------------------------------------------------
  // CASHIER CAGE & ATMS
  // -------------------------------------------------------------

  buildCashierCage() {
    const cageGroup = new THREE.Group();
    cageGroup.position.set(-25, 0, 25);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 10), this.woodTrimMat);
    counter.position.set(0, 0.6, 0);
    cageGroup.add(counter);

    for (let bz = -4.5; bz <= 4.5; bz += 0.4) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), this.brassMat);
      bar.position.set(1.0, 2.3, bz);
      cageGroup.add(bar);
    }

    const signMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00e676,
      emissiveIntensity: 2.5
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 8), signMat);
    sign.position.set(1.1, 3.6, 0);
    cageGroup.add(sign);

    // Cashier NPC
    const cashier = this.createDealerNPC(-0.5, 0, 0, Math.PI / 2);
    cageGroup.add(cashier);

    this.interiorGroup.add(cageGroup);

    this.colliders.push({
      min: new THREE.Vector3(this.origin.x - 31, this.origin.y, this.origin.z + 19),
      max: new THREE.Vector3(this.origin.x - 23, this.origin.y + 4.0, this.origin.z + 31)
    });

    this.interactables.push({
      id: 'casino_cashier',
      name: 'Caja del Casino (Cambio de Fichas & Premios)',
      type: 'CASINO_CASHIER',
      position: new THREE.Vector3(this.origin.x - 22, this.origin.y + 1.0, this.origin.z + 25),
      prompt: '[E] Hablar con Cajero del Casino'
    });
  }

  buildCasinoATMs() {
    const atmPositions = [{ x: -5, z: 38 }, { x: 5, z: 38 }];

    atmPositions.forEach((ap, idx) => {
      const atmGroup = new THREE.Group();
      atmGroup.position.set(ap.x, 0, ap.z);

      const atmMat = new THREE.MeshStandardMaterial({ color: 0x003366, roughness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.8), atmMat);
      body.position.set(0, 1.1, 0);
      atmGroup.add(body);

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00b4d8,
        emissiveIntensity: 2.2
      });
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), screenMat);
      screen.position.set(0, 1.45, -0.42);
      atmGroup.add(screen);

      this.interiorGroup.add(atmGroup);

      this.interactables.push({
        id: `casino_atm_${idx}`,
        name: 'Cajero Automático ATM (Casino)',
        type: 'ATM',
        position: new THREE.Vector3(this.origin.x + ap.x, this.origin.y + 1.0, this.origin.z + ap.z - 1.2),
        prompt: '[E] Usar Cajero ATM del Casino'
      });
    });
  }

  // -------------------------------------------------------------
  // REAL-TIME ANIMATION LOOP (Reels, Marquees, Roulette Wheels & Balls)
  // -------------------------------------------------------------

  update(delta) {
    this.time += delta;

    // 1. ANIMATE 3D SPINNING REELS ON SLOT MACHINES
    for (const reel of this.animatedReels) {
      if (reel.mesh) {
        // Continuous rotation on cylinder axis
        reel.mesh.rotation.x += delta * (reel.speed + Math.sin(this.time * 2 + reel.phaseOffset) * 1.5);
      }
    }

    // 2. ANIMATE FLASHING LED MARQUEES & NEONS
    const pulseBase = 1.8 + Math.sin(this.time * 5) * 0.8;
    this.marqueeLights.forEach((light, idx) => {
      if (light.material && light.material.emissiveIntensity !== undefined) {
        const offset = Math.sin(this.time * 6 + idx * 0.8);
        light.material.emissiveIntensity = 1.5 + offset * 0.9;
      }
    });

    // 3. ANIMATE ROULETTE WHEELS & ROLLING BALLS
    for (const wheel of this.rouletteWheels) {
      if (wheel) wheel.rotation.y += delta * 0.75;
    }

    // 3b. ANIMATE MEGA WHEEL OF FORTUNE 3D
    if (this.wheelOfFortuneDisc) {
      this.wheelOfFortuneDisc.rotation.z += delta * this.wheelSpinSpeed;
      if (this.wheelNeedle) {
        this.wheelNeedle.rotation.z = Math.PI + Math.sin(this.wheelOfFortuneDisc.rotation.z * 12) * 0.12;
      }
    }

    for (const ball of this.rouletteBalls) {
      if (ball && ball.mesh) {
        ball.angle += delta * ball.speed;
        ball.mesh.position.set(
          ball.center.x + Math.cos(ball.angle) * ball.radius,
          ball.center.y,
          ball.center.z + Math.sin(ball.angle) * ball.radius
        );
      }
    }

    // 4. Subtle head turns on patrons
    this.patronMeshes.forEach((p, idx) => {
      p.rotation.y += Math.sin(this.time * 0.8 + idx) * 0.003;
    });
  }

  getOrigin() {
    return this.origin;
  }
}
