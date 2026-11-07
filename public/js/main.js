import * as THREE from '/vendor/three.module.js';

// Engine
import { EngineRenderer } from './engine/Renderer.js';
import { CameraManager } from './engine/CameraManager.js';
import { InputManager } from './engine/InputManager.js';
import AudioManager from './engine/AudioManager.js';

// World
import { CityGenerator } from './world/CityGenerator.js';
import { LightingManager } from './world/Lighting.js';
import { CasinoInterior } from './world/CasinoInterior.js';

// Entities
import { Player } from './entities/Player.js';
import { Vehicle } from './entities/Vehicle.js';
import { PedestrianManager } from './entities/PedestrianManager.js';
import { PoliceManager } from './entities/PoliceManager.js';

// Weapons & Combat
import { WeaponSystem } from './weapons/WeaponSystem.js';

// Casino Games
import { BlackjackGame } from './casino/BlackjackGame.js';
import { RouletteGame } from './casino/RouletteGame.js';
import { SlotMachineGame } from './casino/SlotMachine.js';

// Economy & Missions
import { EconomyManager } from './economy/EconomyManager.js';
import { MissionManager } from './missions/MissionManager.js';
import { HeistCoopManager } from './missions/HeistCoopManager.js';

// UI
import { HUD } from './ui/HUD.js';
import { PhoneUI } from './ui/PhoneUI.js';
import { CasinoUI } from './ui/CasinoUI.js';
import { AuthModal } from './ui/AuthModal.js';
import { AdminModal } from './ui/AdminModal.js';

// Network
import { NetworkClient } from './network/NetworkClient.js';

class MillionDollarCityGame {
  constructor() {
    this.scene = new THREE.Scene();
    this.renderer = new EngineRenderer(document.getElementById('game-container'));
    this.cameraManager = new CameraManager();
    this.inputManager = new InputManager(document.getElementById('game-container'));

    this.allColliders = [];
    this.vehicles = [];
    this.currentZone = 'CITY'; // 'CITY' | 'CASINO_INTERIOR'

    this.init();
  }

  async init() {
    console.log('[Million Dollar City] Booting Game Engine 2.0 (Online Multiplayer)...');

    // 1. Lighting & Atmosphere
    this.lighting = new LightingManager(this.scene);

    // 2. World Generation
    this.city = new CityGenerator(this.scene);
    const cityData = this.city.generate();
    this.allColliders.push(...cityData.colliders);
    this.doors = cityData.doors;
    this.neonSigns = cityData.neonSigns;

    // 3. Explorable Casino Interior
    this.casinoInterior = new CasinoInterior(this.scene);
    this.allColliders.push(...this.casinoInterior.colliders);

    // 4. Player Protagonist
    this.player = new Player(this.scene, { x: 0, y: 0.8, z: 28 });
    this.cameraManager.snapToTarget(this.player);

    // 5. Spawn Vehicles in the City
    this.spawnInitialVehicles();

    // 6. Economy & User Session
    this.economy = new EconomyManager();

    // 7. Pedestrians & City Life
    this.pedestrians = new PedestrianManager(this.scene, this.allColliders);

    // 8. Police 5-Star Wanted System
    this.police = new PoliceManager(this.scene, this.player);

    // 9. Combat & Weapons System
    this.weapons = new WeaponSystem(this.scene, this.player, this.cameraManager.camera);

    // 10. Casino Games Engines
    this.blackjack = new BlackjackGame(this.economy);
    this.roulette = new RouletteGame(this.economy);
    this.slots = new SlotMachineGame(this.economy);

    // 11. Narrative Missions & Heists
    this.missions = new MissionManager(this.economy);

    // 12. Multiplayer Network Client (Real-time Socket.IO Sync)
    this.network = new NetworkClient(this.scene, this.player, this.economy, this.vehicles);

    // 13. Cooperative Heists Manager
    this.coopHeists = new HeistCoopManager(this.scene, this.player, this.economy, this.network, this.police);

    // 14. UI Layers & Modals
    this.hud = new HUD();
    this.casinoUI = new CasinoUI(this.blackjack, this.roulette, this.slots, this.economy);
    this.phoneUI = new PhoneUI(this.economy, this.player, this.network, () => this.valetSpawnPlayerCar());
    this.authModal = new AuthModal(this.economy);
    this.adminModal = new AdminModal(this, this.economy, this.player, this.weapons, this.police, this.network);

    // Check if user needs to login or is guest
    setTimeout(() => {
      if (!this.economy.token) {
        // Open citizen passport login modal if not logged in
        this.authModal.open();
      }
    }, 600);

    // 15. Event Listeners & Audio Init
    this.setupGameEvents();

    this.clock = new THREE.Clock();
    this.animate();

    console.log('[Million Dollar City] Todos los sistemas online y multijugador activos!');
  }

  spawnInitialVehicles() {
    // Player's Supercar parked outside The Royal Mirage Casino
    const viper = new Vehicle(this.scene, 'supercar', { x: 8.5, y: 0, z: 26, rotY: Math.PI });
    viper.mesh.name = 'veh_viper_01';
    this.vehicles.push(viper);
    this.playerCar = viper;

    // Muscle Car parked near Sunset Strip
    const muscle = new Vehicle(this.scene, 'muscle', { x: -8.5, y: 0, z: -20, rotY: 0 });
    muscle.mesh.name = 'veh_muscle_01';
    this.vehicles.push(muscle);

    // Executive Sedan parked in front of Vault 21 Bank
    const sedan = new Vehicle(this.scene, 'sedan', { x: 8.5, y: 0, z: -40, rotY: Math.PI });
    sedan.mesh.name = 'veh_sedan_01';
    this.vehicles.push(sedan);
  }

  valetSpawnPlayerCar() {
    const pPos = this.player.getPosition();
    const spawnPos = {
      x: pPos.x > 0 ? 5.5 : -5.5,
      y: 0,
      z: pPos.z + 10,
      rotY: 0
    };

    if (this.playerCar) {
      this.playerCar.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
      this.playerCar.mesh.position.copy(this.playerCar.position);
      this.playerCar.currentSpeed = 0;
    } else {
      this.playerCar = new Vehicle(this.scene, 'supercar', spawnPos);
      this.playerCar.mesh.name = 'veh_player_valet';
      this.vehicles.push(this.playerCar);
    }
  }

  setupGameEvents() {
    // Audio trigger on first user interaction
    const unlockAudio = () => {
      AudioManager.ensureContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Top citizen button to open Auth Modal
    document.getElementById('open-auth-btn')?.addEventListener('click', () => {
      this.authModal.open();
    });

    // When Casino UI closes, return camera to character
    window.addEventListener('casino:ui_closed', () => {
      this.cameraManager.setMode('PLAYER');
    });

    // Weapon select keys (1, 2, 3, 4, 5)
    window.addEventListener('keydown', (e) => {
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        const weaponKeys = { Digit1: 'pistol', Digit2: 'smg', Digit3: 'shotgun', Digit4: 'rifle', Digit5: 'sniper' };
        this.weapons.equip(weaponKeys[e.code]);
      }
    });

    // Shooting with left mouse click (incorporating ADS aiming spread & camera recoil kick)
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.inputManager.mouse.isLocked && !this.player.inVehicle) {
        const isAiming = !!this.inputManager.mouse.isRightDown;
        this.weapons.shoot(this.pedestrians.getPedestrians(), isAiming, this.cameraManager);

        // Emit shot to other connected players
        const pPos = this.player.getPosition();
        this.network?.socket?.emit('player:shoot', {
          origin: { x: pPos.x, y: pPos.y + 1.4, z: pPos.z },
          direction: this.cameraManager.camera.getWorldDirection(new THREE.Vector3()),
          weapon: this.weapons.currentWeaponId
        });
      }
    });

    // Reload with R
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && !this.player.inVehicle) {
        this.weapons.reload();
      }
    });
  }

  // -------------------------------------------------------------
  // GAME LOOP (60 FPS)
  // -------------------------------------------------------------

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    try {
      const delta = Math.min(0.1, this.clock.getDelta());
      const mouseDelta = this.inputManager.getAndResetMouseDelta();

      // 1. Phone Toggle (M)
      if (this.inputManager.consumePhone()) {
        this.phoneUI.toggle();
      }

      // 2. Check Contextual Interactions & Proximities
      this.checkInteractions();

      const isAiming = !!(this.inputManager.mouse.isRightDown && !this.player.inVehicle);
      const currentWeaponId = this.weapons.currentWeaponId || 'pistol';

      // 3. Update Player / Active Vehicle
      if (this.player.inVehicle && this.player.currentVehicle) {
        this.player.currentVehicle.update(delta, this.inputManager, this.allColliders);
        this.cameraManager.update(delta, this.player.currentVehicle, mouseDelta, false, currentWeaponId);
        this.hud.setAiming(false, currentWeaponId);
      } else {
        this.player.update(delta, this.inputManager, this.cameraManager.getYaw(), this.allColliders, isAiming, this.cameraManager.pitch);
        this.cameraManager.update(delta, this.player, mouseDelta, isAiming, currentWeaponId);
        this.hud.setAiming(isAiming, currentWeaponId);
      }

      // 4. Update Other Inactive Vehicles
      for (const veh of this.vehicles) {
        if (veh !== this.player.currentVehicle) {
          veh.update(delta, null, this.allColliders);
        }
      }

      // 5. Update Weapons & Combat Tracers
      this.weapons.update(delta);

      // 6. Update Pedestrians
      this.pedestrians.update(delta, this.player.getPosition());

      // 7. Update Police Pursuits
      this.police.update(delta);

      // 8. Update Missions & Cooperative Heists
      this.missions.update(delta, this.player.getPosition(), this.police.getWantedLevel());
      this.coopHeists.update(delta, this.player.getPosition());

      // 9. Update Lighting & Neon Animations
      this.lighting.update(delta, this.neonSigns);
      this.casinoInterior.update(delta);

      // Rotate outdoor entrance diamond beacon if present
      if (this.city && this.city.entranceBeacon) {
        this.city.entranceBeacon.rotation.y += delta * 2.2;
        this.city.entranceBeacon.position.y = 2.2 + Math.sin(Date.now() * 0.003) * 0.15;
      }

      // 10. Update Multiplayer Network Sync
      this.network.update(delta);

      // 11. Update HUD Vitals & Radar
      this.hud.updatePlayerVitals(this.player.health, this.player.maxHealth, this.player.armor, this.player.maxArmor);

      const waypoints = [
        { pos: { x: -19, z: 35 }, color: '#ffd700' }, // Casino
        { pos: { x: 23, z: 30 }, color: '#00e676' }, // Bank
        { pos: { x: 28, z: -45 }, color: '#d90429' } // Ammu-Nation
      ];
      if (this.playerCar) {
        waypoints.push({ pos: this.playerCar.getPosition(), color: '#00f0ff' }); // Car blip
      }

      // Add other online players to minimap
      for (const rp of this.network.getRemotePlayers()) {
        waypoints.push({ pos: rp.targetPos, color: '#00e5ff' });
      }

      // Active Heist Waypoint
      const heistWp = this.coopHeists.getActiveWaypoint();
      if (heistWp) {
        waypoints.push({ pos: heistWp, color: '#ff007f' });
      } else {
        const currentMissionTarget = this.missions.getCurrentTarget();
        if (currentMissionTarget) waypoints.push({ pos: currentMissionTarget, color: '#ff0055' });
      }

      this.hud.renderRadar(this.player.getPosition(), this.player.heading, waypoints);

      // 12. Update Phone GPS Map if active
      if (this.phone?.isOpen && this.phone?.currentApp === 'map') {
        this.phone.renderGpsMap();
      }

      // 13. Render 3D Frame
      this.renderer.render(this.scene, this.cameraManager.camera);
    } catch (frameErr) {
      if (!this._lastErrorLog || Date.now() - this._lastErrorLog > 5000) {
        this._lastErrorLog = Date.now();
        console.error('[Frame Error in animate]:', frameErr);
        try {
          fetch('/api/client-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: frameErr.message, stack: frameErr.stack, source: 'animateLoop' })
          });
        } catch(e) {}
      }
    }
  }

  // -------------------------------------------------------------
  // PROXIMITY & CONTEXTUAL INTERACTIONS
  // -------------------------------------------------------------

  checkInteractions() {
    const playerPos = this.player.getPosition();

    // 1. Vehicle Enter / Exit (F Key)
    if (this.player.inVehicle) {
      this.hud.showInteractionPrompt('[F] Salir del Vehículo');
      if (this.inputManager.consumeVehicle()) {
        const currentCar = this.player.currentVehicle;
        currentCar.exitDriver();
        this.cameraManager.setMode('PLAYER');

        // Broadcast vehicle exit
        this.network.socket?.emit('vehicle:exit', {
          vehicleId: currentCar.mesh.name,
          x: currentCar.position.x,
          y: currentCar.position.y,
          z: currentCar.position.z
        });
      }
      return;
    }

    // Check nearby vehicles to enter
    let nearestVehicle = null;
    let minCarDist = 3.5;
    for (const veh of this.vehicles) {
      const dist = veh.getPosition().distanceTo(playerPos);
      if (dist < minCarDist) {
        minCarDist = dist;
        nearestVehicle = veh;
      }
    }

    if (nearestVehicle) {
      this.hud.showInteractionPrompt(`[F] Conducir ${nearestVehicle.name}`);
      if (this.inputManager.consumeVehicle()) {
        nearestVehicle.enterDriver(this.player);
        this.cameraManager.setMode('VEHICLE');
        window.dispatchEvent(new CustomEvent('vehicle:entered'));

        // Broadcast vehicle occupancy to other players
        this.network.socket?.emit('vehicle:occupy', {
          vehicleId: nearestVehicle.mesh.name,
          x: nearestVehicle.position.x,
          y: nearestVehicle.position.y,
          z: nearestVehicle.position.z,
          rotY: nearestVehicle.mesh.rotation.y
        });
      }
      return;
    }

    // 2. Active Cooperative Heist Actions (Hacking & Vault Looting)
    if (this.coopHeists.activeHeist) {
      const phase = this.coopHeists.activeHeist.phases[this.coopHeists.currentPhase];
      if (phase && phase.isHackPhase) {
        this.hud.showInteractionPrompt('[E] Hackear Terminal de Seguridad');
        if (this.inputManager.consumeInteract()) {
          this.coopHeists.performHackAction();
        }
        return;
      } else if (phase && phase.action === 'LOOT_VAULT') {
        this.hud.showInteractionPrompt('[E] Recoger Sacas de Dinero de la Bóveda');
        if (this.inputManager.consumeInteract()) {
          this.coopHeists.performLootAction();
        }
        return;
      }
    }

    // 3. City Exterior Doors (Casino Entrance, Bank Entrance, ATMs)
    let promptShown = false;

    if (this.currentZone === 'CITY') {
      for (const door of this.doors) {
        const dist = door.position.distanceTo(playerPos);
        const radius = door.radius || 4.2;
        if (dist < radius) {
          this.hud.showInteractionPrompt(door.interactionPrompt);
          promptShown = true;

          if (this.inputManager.consumeInteract()) {
            this.handleDoorInteraction(door);
          }
          return;
        }
      }
    } else if (this.currentZone === 'CASINO_INTERIOR') {
      // 4. Casino Interior Tables, Slots, Bar & Exit Portal
      const casinoInteractables = this.casinoInterior.interactables;
      for (const item of casinoInteractables) {
        const dist = item.position.distanceTo(playerPos);
        const radius = item.radius || 3.0;
        if (dist < radius) {
          this.hud.showInteractionPrompt(item.prompt);
          promptShown = true;

          if (this.inputManager.consumeInteract()) {
            this.handleCasinoInteraction(item);
          }
          return;
        }
      }
    }

    if (!promptShown) {
      this.hud.hideInteractionPrompt();
    }
  }

  handleDoorInteraction(door) {
    if (door.type === 'CASINO_ENTRANCE') {
      this.enterCasino();
    } else if (door.type === 'ATM') {
      this.casinoUI.openATM();
    } else if (door.type === 'ARMORY') {
      this.weapons.equip('rifle');
      this.economy.modifyCash(-1500, 'Compra en Ammu-Nation');
      alert('✓ Has adquirido un Rifle de Asalto Carbine y Munición Completa en Ammu-Nation (-$1,500)');
    } else if (door.type === 'BANK_ENTRANCE') {
      this.casinoUI.openATM();
    }
  }

  enterCasino() {
    this.currentZone = 'CASINO_INTERIOR';
    const casinoOrigin = this.casinoInterior.getOrigin();
    this.player.setGroundY(casinoOrigin.y);
    this.player.position.set(casinoOrigin.x, casinoOrigin.y + 0.85, casinoOrigin.z + 37.5);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.22;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('CASINO_INTERIOR');
    AudioManager.ensureContext();
    AudioManager.playCasinoWin(false);
    AudioManager.startCasinoAmbience();

    console.log('[World] Has entrado a The Royal Mirage Casino & Resort');
  }

  exitCasino() {
    this.currentZone = 'CITY';
    this.player.setGroundY(0);
    this.player.position.set(-16.0, 0.8, 35.0);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.25;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('CITY');
    AudioManager.stopCasinoAmbience();

    console.log('[World] Saliste a Million Dollar City (Diamond Strip)');
  }

  handleCasinoInteraction(item) {
    if (item.type === 'CASINO_EXIT') {
      this.exitCasino();
    } else if (item.type === 'WHEEL_OF_FORTUNE') {
      if (item.cameraFocus) {
        this.cameraManager.setMode('CASINO_TABLE', {
          cameraPos: item.cameraFocus.pos,
          target: item.cameraFocus.target
        });
      }
      this.casinoUI.openWheelOfFortune(item);
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    } else if (item.type === 'VIDEO_POKER') {
      if (item.cameraFocus) {
        this.cameraManager.setMode('CASINO_TABLE', {
          cameraPos: item.cameraFocus.pos,
          target: item.cameraFocus.target
        });
      }
      this.casinoUI.openVideoPoker(item);
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    } else if (item.type === 'PACHINKO') {
      if (item.cameraFocus) {
        this.cameraManager.setMode('CASINO_TABLE', {
          cameraPos: item.cameraFocus.pos,
          target: item.cameraFocus.target
        });
      }
      this.casinoUI.openPachinko(item);
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    } else if (item.type === 'CRAPS_TABLE') {
      if (item.cameraFocus) {
        this.cameraManager.setMode('CASINO_TABLE', {
          cameraPos: item.cameraFocus.pos,
          target: item.cameraFocus.target
        });
      }
      this.casinoUI.openCraps(item);
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    } else if (item.type === 'BLACKJACK_TABLE') {
      if (item.cameraFocus) {
        this.cameraManager.setMode('CASINO_TABLE', {
          cameraPos: item.cameraFocus.pos,
          target: item.cameraFocus.target
        });
      }
      this.casinoUI.openBlackjack(item.minBet, item.maxBet);
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    } else if (item.type === 'ROULETTE_TABLE') {
      if (item.cameraFocus) {
        this.cameraManager.setMode('CASINO_TABLE', {
          cameraPos: item.cameraFocus.pos,
          target: item.cameraFocus.target
        });
      }
      this.casinoUI.openRoulette(item.minBet, item.maxBet);
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    } else if (item.type === 'SLOT_MACHINE') {
      if (item.cameraFocus) {
        this.cameraManager.setMode('CASINO_TABLE', {
          cameraPos: item.cameraFocus.pos,
          target: item.cameraFocus.target
        });
      }
      // Trigger 3D Lever Pull Animation on the machine!
      if (item.leverRef) {
        item.leverRef.rotation.x = 0.6;
        setTimeout(() => { if (item.leverRef) item.leverRef.rotation.x = 0; }, 600);
      }
      this.casinoUI.openSlots();
      window.dispatchEvent(new CustomEvent('casino:bet_placed'));
    } else if (item.type === 'ATM' || item.type === 'CASINO_CASHIER') {
      this.casinoUI.openATM();
    }
  }
}

// Robust Boot routine: handles DOMContentLoaded, complete, interactive states & catches fatal boot errors
function bootGame() {
  if (window.game) return;
  const container = document.getElementById('game-container');
  if (!container) {
    setTimeout(bootGame, 30);
    return;
  }
  console.log('[Boot] Initializing MillionDollarCityGame...');
  try {
    window.game = new MillionDollarCityGame();
  } catch (err) {
    console.error('[Boot] Fatal error initializing game:', err);
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: err.message, stack: err.stack, source: 'bootGame' })
      });
    } catch (e) {}
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootGame();
} else {
  document.addEventListener('DOMContentLoaded', bootGame);
  window.addEventListener('load', bootGame);
}
