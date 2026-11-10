import * as THREE from '/vendor/three.module.js';

// Engine
import { EngineRenderer } from './engine/Renderer.js';
import { CameraManager } from './engine/CameraManager.js';
import { InputManager } from './engine/InputManager.js';
import AudioManager from './engine/AudioManager.js';
import { ParticleManager } from './engine/ParticleManager.js';

// World
import { CityGenerator } from './world/CityGenerator.js';
import { LightingManager } from './world/Lighting.js';
import { CasinoInterior } from './world/CasinoInterior.js';
import { BankInterior } from './world/BankInterior.js';
import { ArmoryInterior } from './world/ArmoryInterior.js';
import { PenthouseInterior } from './world/PenthouseInterior.js';

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
import { LobbyUI } from './ui/LobbyUI.js';
import { JailUI } from './ui/JailUI.js';

// Network
import { NetworkClient } from './network/NetworkClient.js';

class MillionDollarCityGame {
  constructor() {
    this.scene = new THREE.Scene();
    this.renderer = new EngineRenderer(document.getElementById('game-container'));
    window.__MDC_GRAPHICS_PRESET = this.renderer.quality.getPreset();
    this.cameraManager = new CameraManager();
    this.cameraManager.applyQuality(window.__MDC_GRAPHICS_PRESET);
    this.inputManager = new InputManager(document.getElementById('game-container'));

    window.addEventListener('quality:changed', (e) => {
      window.__MDC_GRAPHICS_PRESET = e.detail;
      this.cameraManager.applyQuality(e.detail);
      if (this.hud) this.hud.updateQualityLabel(e.detail);
    });

    window.addEventListener('quality:cycle', () => {
      const newPreset = this.renderer.quality.cycleNext();
      if (this.hud) this.hud.updateQualityLabel(newPreset);
    });

    this.allColliders = [];
    this.vehicles = [];
    this.currentZone = 'CITY'; // 'CITY' | 'CASINO_INTERIOR'

    // Static radar waypoints pool to prevent per-frame GC allocations
    this._staticWaypoints = [
      { pos: { x: -17.5, z: 50.0 }, color: '#ffd700' }, // Casino The Royal Mirage
      { pos: { x: 23, z: 30 }, color: '#00e676' }, // Bank
      { pos: { x: 28, z: -45 }, color: '#d90429' }, // Ammu-Nation
      { pos: { x: -27.0, z: -15.0 }, color: '#52b788' }, // Diamond 24/7 Liquors & Drinks
      { pos: { x: 25.0, z: 120.0 }, color: '#00f0ff' }, // Luxury Motorsport Concesionario
      { pos: { x: 18, z: -90 }, color: '#ff0055' },  // Garaje de Ocultación
      { pos: { x: -16.5, z: -130.0 }, color: '#0055ff' }, // LSPD Comisaría y Prisión Central
      { pos: { x: 29.0, z: -110.0 }, color: '#ffd700' }, // Dynasty 8 Plaza (Suite Presidencial)
      { pos: { x: -26.0, z: 18.0 }, color: '#c77dff' }  // Dealer Callejero Clandestino
    ];
    this._activeRadarWaypoints = [];

    // Alcohol, narcotics & garage state
    this.drunkLevel = 0;
    this.toxicityLevel = 0;
    this.substanceEffect = null;
    this.substanceTimer = 0;
    this.isBlackedOut = false;
    this.storedVehicles = this.loadGarageVehicles();

    this.init();
  }

  async init() {
    console.log('[Million Dollar City] Booting Game Engine 2.0 (Online Multiplayer)...');

    const setProgress = (pct, text) => {
      const fill = document.getElementById('loading-bar-fill');
      const status = document.getElementById('loading-status-text');
      if (fill) fill.style.width = `${pct}%`;
      if (status) status.textContent = text;
    };

    // 1. Lighting & Atmosphere
    setProgress(15, 'Iniciando iluminación y atmósfera nocturna...');
    this.lighting = new LightingManager(this.scene);

    // 2. World Generation
    setProgress(35, 'Generando rascacielos y Diamond Strip...');
    this.city = new CityGenerator(this.scene);
    const cityData = this.city.generate();
    this.allColliders.push(...cityData.colliders);
    this.doors = cityData.doors;
    this.neonSigns = cityData.neonSigns;

    // 3. Explorable Casino, Bank Vault 21 & Ammu-Nation Interiors
    setProgress(55, 'Construyendo interiores de Casino, Banco Vault 21 y Ammu-Nation...');
    this.casinoInterior = new CasinoInterior(this.scene);
    this.allColliders.push(...this.casinoInterior.colliders);

    this.bankInterior = new BankInterior(this.scene);
    this.allColliders.push(...this.bankInterior.colliders);

    this.armoryInterior = new ArmoryInterior(this.scene);
    this.allColliders.push(...this.armoryInterior.colliders);

    this.penthouseInterior = new PenthouseInterior(this.scene);
    this.allColliders.push(...this.penthouseInterior.colliders);

    // Particle Systems (Drifting, Sparks, Blood)
    this.particles = new ParticleManager(this.scene);

    // 3D Mission Target Beacon
    this.missionBeacon = this.createMissionWaypointBeacon();

    // 4. Player Protagonist
    setProgress(70, 'Cargando personaje, vehículos y armas...');
    this.player = new Player(this.scene, { x: 0, y: 0.8, z: 28 });
    this.cameraManager.snapToTarget(this.player);

    // 5. Spawn Vehicles in the City
    this.spawnInitialVehicles();

    // 6. Economy & User Session
    this.economy = new EconomyManager();

    // 7. Pedestrians & City Life
    this.pedestrians = new PedestrianManager(this.scene, this.allColliders);

    // 8. Police 5-Star Wanted System
    this.police = new PoliceManager(this.scene, this.player, this.allColliders);

    // 9. Combat & Weapons System
    this.weapons = new WeaponSystem(this.scene, this.player, this.cameraManager.camera);

    // 10. Casino Games Engines
    setProgress(85, 'Inicializando juegos de apuestas, blackjack y ruleta...');
    this.blackjack = new BlackjackGame(this.economy);
    this.roulette = new RouletteGame(this.economy);
    this.slots = new SlotMachineGame(this.economy);

    // 11. Narrative Missions & Heists
    this.missions = new MissionManager(this.economy);

    // 12. Multiplayer Network Client (Real-time Socket.IO Sync)
    setProgress(95, 'Conectando con el servidor LAN multijugador...');
    this.network = new NetworkClient(this.scene, this.player, this.economy, this.vehicles);

    // 13. Cooperative Heists Manager
    this.coopHeists = new HeistCoopManager(this.scene, this.player, this.economy, this.network, this.police);

    // 14. UI Layers, Modals & LAN Lobby
    this.hud = new HUD();
    this.casinoUI = new CasinoUI(this.blackjack, this.roulette, this.slots, this.economy);
    this.phoneUI = new PhoneUI(this.economy, this.player, this.network, () => this.valetSpawnPlayerCar());
    this.authModal = new AuthModal(this.economy);
    this.adminModal = new AdminModal(this, this.economy, this.player, this.weapons, this.police, this.network);
    this.jailUI = new JailUI(this);

    this.lobbyUI = new LobbyUI((startData) => {
      console.log('[Lobby] Iniciando partida con configuración:', startData);
      if (!this.economy.token) {
        this.authModal.open();
      }
    }, this.renderer.quality);

    // 15. Event Listeners & Audio Init
    this.setupGameEvents();

    // 16. Restore Persistent State (Missions, Coordinates, Money)
    this.loadSavedState();

    this.clock = new THREE.Clock();
    this.animate();

    setProgress(100, '¡Ciudad lista!');
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) loader.classList.add('fade-out');

      // Open LAN Lobby if user has not yet entered
      if (!this.economy.token) {
        this.lobbyUI.open();
      }
    }, 450);

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
      // STRICT SHOOTING GATE:
      if (e.button !== 0) return;
      if (this.player.inVehicle) return;
      if (!document.pointerLockElement) return;
      if (document.body.classList.contains('ui-active')) return;
      if (e.target && e.target.closest && e.target.closest('.game-modal, .modal, .modal-content-panel, button, input, select, textarea, a, #phone-container, .hud-chat-box, .lan-lobby-panel, .ui-panel, #blackout-overlay, #wasted-screen, #victory-screen')) {
        return;
      }
      if (document.querySelector('.game-modal.visible, .modal.visible, #phone-container.visible, #lan-lobby-modal.visible')) {
        return;
      }

      const isAiming = !!this.inputManager.mouse.isRightDown;
      this.weapons.shoot(this.pedestrians.getPedestrians(), isAiming, this.cameraManager);

      // Emit shot to other connected players
      const pPos = this.player.getPosition();
      this.network?.socket?.emit('player:shoot', {
        origin: { x: pPos.x, y: pPos.y + 1.4, z: pPos.z },
        direction: this.cameraManager.camera.getWorldDirection(new THREE.Vector3()),
        weapon: this.weapons.currentWeaponId
      });
    });

    // Reload with R
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && !this.player.inVehicle) {
        this.weapons.reload();
      }
      if (e.code === 'Escape') {
        if (this.casinoUI && this.casinoUI.activeModal) {
          this.casinoUI.closeModal();
        }
        if (document.getElementById('armory-modal')?.classList.contains('visible')) {
          this.closeArmoryStore();
        }
        if (document.getElementById('liquor-modal')?.classList.contains('visible')) {
          this.closeLiquorStore();
        }
        if (document.getElementById('dealership-modal')?.classList.contains('visible')) {
          this.closeDealership();
        }
        if (document.getElementById('garage-modal')?.classList.contains('visible')) {
          this.closeGarage();
        }
        if (document.getElementById('suite-customizer-modal')?.classList.contains('visible')) {
          this.closeSuiteCustomizer();
        }
        if (document.getElementById('dealer-modal')?.classList.contains('visible')) {
          this.closeDealer();
        }
      }
    });

    // Close Modals (Buttons and Backdrop Click)
    const handleCloseArmory = () => this.closeArmoryStore();
    document.getElementById('armory-close-btn')?.addEventListener('click', handleCloseArmory);
    document.getElementById('close-armory-btn')?.addEventListener('click', handleCloseArmory);
    document.getElementById('armory-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'armory-modal') this.closeArmoryStore();
    });

    document.getElementById('garage-close-btn')?.addEventListener('click', () => this.closeGarage());
    document.getElementById('garage-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'garage-modal') this.closeGarage();
    });

    document.getElementById('suite-customizer-close-btn')?.addEventListener('click', () => this.closeSuiteCustomizer());
    document.getElementById('suite-customizer-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'suite-customizer-modal') this.closeSuiteCustomizer();
    });

    document.getElementById('dealer-close-btn')?.addEventListener('click', () => this.closeDealer());
    document.getElementById('dealer-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'dealer-modal') this.closeDealer();
    });

    // Player Wasted / Arrested Event Listener
    window.addEventListener('player:wasted', () => {
      if (this.police && this.police.getWantedLevel() > 0) {
        this.police.triggerArrest('subdued');
      } else {
        setTimeout(() => {
          this.player.respawn({ x: 0, y: 0, z: 28 });
          window.dispatchEvent(new CustomEvent('notification:show', {
            detail: { message: '🏥 Te has recuperado en el Centro Médico Central.', type: 'info' }
          }));
        }, 3500);
      }
    });

    // Buy weapons from Ammu-Nation
    document.querySelectorAll('.buy-weapon-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const weaponId = btn.getAttribute('data-weapon');
        const price = parseInt(btn.getAttribute('data-price'), 10) || 500;
        const msgEl = document.getElementById('armory-status-msg');

        if (this.economy.cash < price) {
          AudioManager.playCasinoLoss();
          if (msgEl) msgEl.textContent = '❌ Efectivo insuficiente para comprar esta arma';
          return;
        }

        this.economy.modifyCash(-price, `Compra arma ${weaponId}`);
        this.weapons.equip(weaponId);
        AudioManager.playChipClick();
        window.dispatchEvent(new CustomEvent('armory:purchased'));
        if (msgEl) msgEl.textContent = `✓ ¡${this.weapons.weapons[weaponId]?.name || weaponId} equipada con éxito!`;
      });
    });

    // Buy Armor (+100 Armor)
    document.getElementById('buy-armor-btn')?.addEventListener('click', () => {
      const price = 1500;
      const msgEl = document.getElementById('armory-status-msg');
      if (this.economy.cash < price) {
        AudioManager.playCasinoLoss();
        if (msgEl) msgEl.textContent = '❌ Efectivo insuficiente para chaleco antibalas';
        return;
      }

      this.economy.modifyCash(-price, 'Chaleco Antibalas Kevlar');
      this.player.armor = 100;
      this.hud.updatePlayerVitals(this.player.health, this.player.maxHealth, this.player.armor, this.player.maxArmor);
      AudioManager.playChipClick();
      window.dispatchEvent(new CustomEvent('armory:purchased'));
      if (msgEl) msgEl.textContent = '🛡️ ¡Chaleco antibalas Kevlar 100% equipado!';
    });

    // Buy Ammo (+60 Bullets)
    document.getElementById('buy-ammo-btn')?.addEventListener('click', () => {
      const price = 200;
      const msgEl = document.getElementById('armory-status-msg');
      if (this.economy.cash < price) {
        AudioManager.playCasinoLoss();
        if (msgEl) msgEl.textContent = '❌ Efectivo insuficiente para munición';
        return;
      }

      this.economy.modifyCash(-price, 'Caja de Munición');
      const curWep = this.weapons.weapons[this.weapons.currentWeaponId];
      if (curWep) {
        curWep.reserveAmmo += 60;
        this.weapons.notifyWeaponUpdate();
      }
      AudioManager.playChipClick();
      window.dispatchEvent(new CustomEvent('armory:purchased'));
      if (msgEl) msgEl.textContent = `📦 +60 Balas añadidas a ${curWep?.name || 'arma'}!`;
    });

    // -----------------------------------------------------------
    // DIAMOND 24/7 LIQUOR STORE & CONSUMABLES (ALCOHOL & DRUNKENNESS)
    // -----------------------------------------------------------
    document.getElementById('liquor-close-btn')?.addEventListener('click', () => {
      this.closeLiquorStore();
    });

    document.querySelectorAll('.buy-drink-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-item');
        const price = parseInt(btn.getAttribute('data-price'), 10) || 25;
        const hp = parseInt(btn.getAttribute('data-hp'), 10) || 25;
        const armor = parseInt(btn.getAttribute('data-armor'), 10) || 0;
        const msgEl = document.getElementById('liquor-status-msg');

        if (this.economy.cash < price) {
          AudioManager.playCasinoLoss();
          if (msgEl) msgEl.textContent = '❌ Efectivo insuficiente para comprar esta bebida';
          return;
        }

        this.economy.modifyCash(-price, `Bebida ${itemId}`);
        AudioManager.playGulp();

        // Calculate drunkenness based on drink type
        let drunkGain = 0;
        if (itemId === 'beer') drunkGain = 22;
        else if (itemId === 'whiskey') drunkGain = 38;
        else if (itemId === 'vodka') drunkGain = 50;
        else if (itemId === 'champagne') drunkGain = 32;

        if (drunkGain > 0) {
          this.drunkLevel = Math.min(100, this.drunkLevel + drunkGain);
        }

        // Restore health & armor
        this.player.health = Math.min(this.player.maxHealth, this.player.health + hp);
        if (armor > 0) {
          this.player.armor = Math.min(this.player.maxArmor, this.player.armor + armor);
        }
        this.hud.updatePlayerVitals(this.player.health, this.player.maxHealth, this.player.armor, this.player.maxArmor);

        const drunkText = this.drunkLevel > 15 ? ` | 🥴 Embriaguez: ${Math.round(this.drunkLevel)}%` : '';
        if (msgEl) {
          msgEl.textContent = `✓ ¡Consumido con éxito! Salud: ${Math.round(this.player.health)}/${this.player.maxHealth}${drunkText}`;
        }

        window.dispatchEvent(new CustomEvent('notification:show', {
          detail: { message: `🍻 ¡Has consumido ${itemId}! Vitalidad restaurada (+${hp} HP)${drunkText}`, type: 'success' }
        }));

        if (this.drunkLevel >= 95) {
          this.closeLiquorStore();
          this.triggerBlackout('alcohol');
        }
      });
    });

    // -----------------------------------------------------------
    // STREET DEALER (NARCOTICS & OVERDOSE)
    // -----------------------------------------------------------
    document.querySelectorAll('.buy-substance-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const substance = btn.getAttribute('data-substance');
        const price = parseInt(btn.getAttribute('data-price'), 10) || 200;
        const toxicity = parseInt(btn.getAttribute('data-toxicity'), 10) || 25;
        this.consumeSubstance(substance, toxicity, price);
      });
    });

    // -----------------------------------------------------------
    // SUITE 107 CUSTOMIZATION STORE
    // -----------------------------------------------------------
    document.querySelectorAll('.buy-suite-upgrade-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const upgradeId = btn.getAttribute('data-upgrade');
        const price = parseInt(btn.getAttribute('data-price'), 10) || 5000;
        const msgEl = document.getElementById('suite-customizer-status-msg');

        if (this.penthouseInterior.hasUpgrade(upgradeId)) {
          if (msgEl) msgEl.textContent = 'ℹ️ Esta mejora ya está instalada en tu suite presidencial.';
          return;
        }

        if (this.economy.cash < price) {
          AudioManager.playCasinoLoss();
          if (msgEl) msgEl.textContent = `❌ Fondos insuficientes para esta mejora ($${price.toLocaleString()})`;
          return;
        }

        this.economy.modifyCash(-price, `Mejora Suite: ${upgradeId}`);
        this.penthouseInterior.installUpgrade(upgradeId);
        AudioManager.playCasinoWin(true);

        if (msgEl) msgEl.textContent = '👑 ¡Mejora instalada con éxito en la Suite 107!';
        this.renderSuiteCustomizer();
        window.dispatchEvent(new CustomEvent('notification:show', {
          detail: { message: `👑 ¡Mejora instalada en tu Suite Presidencial! (-$${price.toLocaleString()})`, type: 'success' }
        }));
      });
    });

    // -----------------------------------------------------------
    // GARAGE FLEET MANAGEMENT
    // -----------------------------------------------------------
    document.getElementById('garage-store-current-btn')?.addEventListener('click', () => {
      this.storeCurrentVehicle();
    });

    document.getElementById('garage-open-dealership-btn')?.addEventListener('click', () => {
      this.closeGarage();
      this.openDealership();
    });

    // -----------------------------------------------------------
    // LUXURY MOTORSPORT VEHICLE DEALERSHIP
    // -----------------------------------------------------------
    document.getElementById('dealership-close-btn')?.addEventListener('click', () => {
      this.closeDealership();
    });

    document.querySelectorAll('.buy-car-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vehicleType = btn.getAttribute('data-vehicle');
        const price = parseInt(btn.getAttribute('data-price'), 10) || 50000;
        const msgEl = document.getElementById('dealership-status-msg');

        if (this.economy.cash < price) {
          AudioManager.playCasinoLoss();
          if (msgEl) msgEl.textContent = `❌ Efectivo insuficiente para adquirir este vehículo ($${price.toLocaleString()})`;
          return;
        }

        this.economy.modifyCash(-price, `Compra de vehículo ${vehicleType}`);
        AudioManager.playCasinoWin(true);

        // Spawn purchased vehicle in Delivery Bay at X: 22.0, Z: 120.0
        const spawnPos = { x: 22.0, y: 0.2, z: 120.0, rotY: Math.PI / 2 };
        const newVehicle = new Vehicle(this.scene, vehicleType, spawnPos);
        this.vehicles.push(newVehicle);
        this.playerCar = newVehicle;

        // Auto-save vehicle to player profile
        if (this.economy?.playerData) {
          if (!Array.isArray(this.economy.playerData.vehicles)) {
            this.economy.playerData.vehicles = [];
          }
          if (!this.economy.playerData.vehicles.includes(vehicleType)) {
            this.economy.playerData.vehicles.push(vehicleType);
          }
        }
        window.dispatchEvent(new CustomEvent('save:state_requested'));

        if (msgEl) {
          msgEl.textContent = `🎉 ¡COMPRADO! Tu flamante ${newVehicle.name} te espera en la bahía de entrega.`;
        }

        window.dispatchEvent(new CustomEvent('notification:show', {
          detail: {
            message: `🚗 ¡NUEVO VEHÍCULO! Has comprado un ${newVehicle.name}. Listo para conducir en X: 22, Z: 120.`,
            type: 'success'
          }
        }));
      });
    });

    // Particle collision sparks & camera recoil on car crash
    window.addEventListener('vehicle:crash', (e) => {
      if (this.particles) {
        this.particles.emitCrashSparks(e.detail.position, 14);
      }
      if (this.cameraManager) {
        this.cameraManager.addRecoil(0.035, 0.015);
      }
    });

    // Particle blood / sparks on weapon hit
    window.addEventListener('weapon:hitmarker', (e) => {
      if (this.particles) {
        const pPos = this.player.getPosition();
        this.particles.emitHitFeedback(new THREE.Vector3(pPos.x, pPos.y + 1.2, pPos.z), e.detail?.isHeadshot);
      }
    });

    // Auto-save on manual save request (mission step, heist, robbery, casino bet)
    window.addEventListener('save:state_requested', () => {
      this.saveCurrentState();
    });

    // Profile loaded from SQLite backend
    window.addEventListener('player:profile_loaded', (e) => {
      if (e.detail?.player) {
        this.applySavedPlayerProfile(e.detail.player);
      }
    });

    // Auto-save on tab close / browser reload (beforeunload)
    window.addEventListener('beforeunload', () => {
      this.saveCurrentState();
    });

    // Periodic auto-save loop (every 7.5 seconds)
    this.autoSaveInterval = setInterval(() => {
      this.saveCurrentState();
    }, 7500);
  }

  saveCurrentState() {
    if (!this.player || !this.economy) return;

    const pPos = this.player.getPosition();
    const rotY = this.player.inVehicle && this.player.currentVehicle
      ? this.player.currentVehicle.mesh.rotation.y
      : (this.player.mesh ? this.player.mesh.rotation.y : 0);

    const missionIdx = this.missions ? this.missions.currentMissionIndex : 0;
    const stepIdx = this.missions ? this.missions.currentStep : 0;

    const state = {
      playerId: this.economy.playerId,
      username: this.economy.username,
      cash: this.economy.cash,
      bank: this.economy.bank,
      missionIndex: missionIdx,
      stepIndex: stepIdx,
      position: {
        x: Number(pPos.x.toFixed(2)),
        y: Number(pPos.y.toFixed(2)),
        z: Number(pPos.z.toFixed(2)),
        rotY: Number(rotY.toFixed(2)),
        zone: this.currentZone || 'CITY'
      },
      currentWeapon: this.weapons?.currentWeaponId || 'pistol',
      timestamp: Date.now()
    };

    // 1. Synchronous localStorage save (instant across F5 reload / page close)
    try {
      localStorage.setItem('mdc_saved_state', JSON.stringify(state));
    } catch (e) {}

    // 2. Asynchronous backend SQLite save
    this.economy.saveFullProfile({
      cash: state.cash,
      bank: state.bank,
      current_mission: state.missionIndex,
      mission_progress: { currentStep: state.stepIndex },
      position: state.position,
      current_weapon: state.currentWeapon
    });
  }

  loadSavedState() {
    let saved = null;
    try {
      const raw = localStorage.getItem('mdc_saved_state');
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    // Prioritize backend profile if already fetched
    if (this.economy?.playerData) {
      this.applySavedPlayerProfile(this.economy.playerData);
      return;
    }

    if (saved) {
      this.applyStateObject(saved);
    }
  }

  applySavedPlayerProfile(playerData) {
    if (!playerData) return;

    let pos = playerData.position;
    if (typeof pos === 'string') {
      try { pos = JSON.parse(pos); } catch (e) {}
    }

    let missionProg = playerData.mission_progress;
    if (typeof missionProg === 'string') {
      try { missionProg = JSON.parse(missionProg); } catch (e) {}
    }

    this.applyStateObject({
      cash: playerData.cash,
      bank: playerData.bank,
      missionIndex: playerData.current_mission,
      stepIndex: missionProg?.currentStep ?? missionProg?.step ?? 0,
      position: pos
    });
  }

  applyStateObject(state) {
    if (!state) return;

    // 1. Restore Position & Heading
    if (state.position && typeof state.position.x === 'number') {
      const p = state.position;
      // Defensive bounds check to prevent spawning out of bounds
      if (Math.abs(p.x) < 220 && Math.abs(p.z) < 260 && p.y >= -2) {
        this.player.position.set(p.x, p.y || 0.8, p.z);
        this.player.mesh.position.copy(this.player.position);
        if (typeof p.rotY === 'number') {
          this.player.heading = p.rotY;
          this.player.mesh.rotation.y = p.rotY;
        }
        this.cameraManager?.snapToTarget(this.player);
        console.log(`[SaveSystem] Posición restaurada en (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
      }
    }

    // 2. Restore Mission Progress
    if (state.missionIndex !== undefined && this.missions) {
      this.missions.setSavedProgress(state.missionIndex, state.stepIndex || 0);
    }

    // 3. Restore Money & HUD
    if (state.cash !== undefined && this.economy) this.economy.cash = state.cash;
    if (state.bank !== undefined && this.economy) this.economy.bank = state.bank;
    this.economy?.notifyChange();
  }

  enterVehicle(vehicle) {
    if (!vehicle) return;
    vehicle.enterDriver(this.player);
    this.cameraManager.setMode('VEHICLE');
    window.dispatchEvent(new CustomEvent('vehicle:entered'));
  }

  exitVehicle() {
    if (this.player.inVehicle && this.player.currentVehicle) {
      this.player.currentVehicle.exitDriver();
      this.cameraManager.setMode('PLAYER');
    }
  }

  // -------------------------------------------------------------
  // GAME LOOP (60 FPS)
  // -------------------------------------------------------------

  animate(timestamp = performance.now()) {
    requestAnimationFrame((t) => this.animate(t));

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
        const v = this.player.currentVehicle;
        v.update(delta, this.inputManager, this.allColliders);
        this.player.position.copy(v.position);
        this.player.heading = v.mesh.rotation.y;
        if (this.player.mesh) {
          this.player.mesh.position.copy(v.position);
          this.player.mesh.visible = false; // Hide player character while inside car!
        }
        this.cameraManager.update(delta, v, mouseDelta, false, currentWeaponId);
        this.hud.setAiming(false, currentWeaponId);

        // Particle Drift Smoke
        if (this.particles && (this.inputManager.keys.handbrake || Math.abs(v.driftFactor || 0) > 0.35) && Math.abs(v.currentSpeed) > 4) {
          this.particles.emitTireSmoke(v.position, v.velocity);
        }
      } else {
        if (this.player.mesh && !this.player.inVehicle) {
          this.player.mesh.visible = true;
        }
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

      // 6. Update Pedestrians & Vehicular Hit Impact
      this.pedestrians.update(delta, this.player.getPosition(), this.vehicles);

      // 7. Update Police Pursuits
      this.police.update(delta);

      // 8. Update Missions & Cooperative Heists
      this.missions.update(delta, this.player.getPosition(), this.police.getWantedLevel());
      this.coopHeists.update(delta, this.player.getPosition());

      // 9. Update Lighting & Neon Animations
      this.lighting.update(delta, this.neonSigns);
      this.casinoInterior.update(delta);
      if (this.penthouseInterior) this.penthouseInterior.update(delta);

      // Rotate outdoor entrance diamond beacon if present
      if (this.city && this.city.entranceBeacon) {
        this.city.entranceBeacon.rotation.y += delta * 2.2;
        this.city.entranceBeacon.position.y = 2.2 + Math.sin(Date.now() * 0.003) * 0.15;
      }

      // Update 3D Mission Waypoint Beacon (pulsing ground ring + beam + diamond)
      const currentTarget = this.missions.getCurrentTarget() || this.coopHeists.getActiveWaypoint();
      if (this.missionBeacon) {
        if (currentTarget && this.currentZone === 'CITY' && Math.abs(currentTarget.y || 0) < 10) {
          this.missionBeacon.visible = true;
          this.missionBeacon.position.set(currentTarget.x, 0, currentTarget.z);
          this.missionBeacon.userData.diamond.rotation.y += delta * 2.8;
          this.missionBeacon.userData.diamond.position.y = 2.4 + Math.sin(Date.now() * 0.005) * 0.35;
          this.missionBeacon.userData.ring.rotation.z += delta * 1.5;
        } else {
          this.missionBeacon.visible = false;
        }
      }

      // 10. Update Multiplayer Network Sync
      this.network.update(delta);

      // 11. Update HUD Vitals & Radar (using pooled waypoints array)
      this.hud.updatePlayerVitals(this.player.health, this.player.maxHealth, this.player.armor, this.player.maxArmor);

      this._activeRadarWaypoints.length = 0;
      for (let i = 0; i < this._staticWaypoints.length; i++) {
        this._activeRadarWaypoints.push(this._staticWaypoints[i]);
      }
      if (this.playerCar) {
        this._activeRadarWaypoints.push({ pos: this.playerCar.getPosition(), color: '#00f0ff' });
      }

      // Add other online players to minimap
      for (const rp of this.network.getRemotePlayers()) {
        this._activeRadarWaypoints.push({ pos: rp.targetPos, color: '#00e5ff' });
      }

      // Active Heist Waypoint
      const heistWp = this.coopHeists.getActiveWaypoint();
      if (heistWp) {
        this._activeRadarWaypoints.push({ pos: heistWp, color: '#ff007f' });
      } else {
        const currentMissionTarget = this.missions.getCurrentTarget();
        if (currentMissionTarget) this._activeRadarWaypoints.push({ pos: currentMissionTarget, color: '#ff0055' });
      }

      this.hud.renderRadar(this.player.getPosition(), this.player.heading, this._activeRadarWaypoints);

      // 12. Update Phone GPS Map if active
      if (this.phone?.isOpen && this.phone?.currentApp === 'map') {
        this.phone.renderGpsMap();
      }

      // 13. Update Particle Systems
      if (this.particles) this.particles.update(delta);

      // 14. Screen Visual Effects: Drunkenness & Narcotics Trip
      const canvasEl = document.getElementById('game-canvas');
      if (canvasEl && !this.isBlackedOut) {
        let filterStr = '';
        if (this.substanceTimer > 0) {
          this.substanceTimer = Math.max(0, this.substanceTimer - delta);
          this.toxicityLevel = Math.max(0, this.toxicityLevel - delta * 0.4);

          if (this.substanceEffect === 'weed') {
            filterStr += 'sepia(0.35) hue-rotate(50deg) saturate(1.4) ';
            this.cameraManager.pitch += Math.sin(performance.now() * 0.001) * 0.003;
          } else if (this.substanceEffect === 'pills') {
            const hue = Math.floor((performance.now() * 0.12) % 360);
            filterStr += `hue-rotate(${hue}deg) saturate(2.4) contrast(1.15) `;
            this.cameraManager.camera.fov = 65 + Math.sin(performance.now() * 0.0035) * 10;
            this.cameraManager.camera.updateProjectionMatrix();
          } else if (this.substanceEffect === 'dust') {
            filterStr += 'contrast(1.4) saturate(1.7) brightness(1.15) ';
            this.player.walkSpeed = 5.2 * 1.7;
            this.player.runSpeed = 9.6 * 1.8;
          } else if (this.substanceEffect === 'lean') {
            filterStr += 'hue-rotate(240deg) saturate(1.6) brightness(0.9) ';
            this.cameraManager.pitch += Math.sin(performance.now() * 0.0015) * 0.005;
            this.cameraManager.camera.rotation.z = Math.sin(performance.now() * 0.0012) * 0.03;
          }
        } else {
          // Reset boost & fov
          this.player.walkSpeed = 5.2;
          this.player.runSpeed = 9.6;
          if (this.substanceEffect === 'pills') {
            this.cameraManager.camera.fov = 65;
            this.cameraManager.camera.updateProjectionMatrix();
          }
          this.substanceEffect = null;
          this.toxicityLevel = Math.max(0, this.toxicityLevel - delta * 0.5);
        }

        if (this.drunkLevel > 5) {
          this.drunkLevel = Math.max(0, this.drunkLevel - delta * 0.35);
          const blurPx = Math.min(5, (this.drunkLevel / 100) * 5.2);
          filterStr += `blur(${blurPx}px) `;
          const wobble = (this.drunkLevel / 100);
          this.cameraManager.pitch += Math.sin(performance.now() * 0.0022) * wobble * 0.012;
          this.cameraManager.camera.rotation.z = Math.sin(performance.now() * 0.0016) * wobble * 0.035;
        }

        canvasEl.style.filter = filterStr.trim();
      }

      // 15. Render 3D Frame
      this.renderer.render(this.scene, this.cameraManager.camera);

      // 16. Update Real-Time FPS HUD Meter
      if (this.hud) this.hud.updateFps(timestamp);
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
        if (this.player.mesh) this.player.mesh.visible = true;
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
    let minCarDist = 3.8;
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
        const isTheft = this.playerCar && nearestVehicle !== this.playerCar;
        nearestVehicle.enterDriver(this.player);
        if (this.player.mesh) this.player.mesh.visible = false;
        this.cameraManager.setMode('VEHICLE');
        window.dispatchEvent(new CustomEvent('vehicle:entered'));

        // Stealing another vehicle in public alerts the police (1 Star)
        if (isTheft) {
          this.police.addCrime(1);
          window.dispatchEvent(new CustomEvent('notification:show', {
            detail: { message: '🚨 ROBO DE VEHÍCULO: ¡La policía ha sido alertada! (1 Estrella ⭐)', type: 'warning' }
          }));
        }

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
    } else if (this.currentZone === 'BANK_INTERIOR') {
      // 4b. Bank Interior Counter, Safe & Exit Door
      const bankItems = this.bankInterior.interactables;
      for (const item of bankItems) {
        const dist = item.position.distanceTo(playerPos);
        const radius = item.radius || 3.2;
        if (dist < radius) {
          this.hud.showInteractionPrompt(`[E] ${item.label}`);
          promptShown = true;

          if (this.inputManager.consumeInteract()) {
            if (item.action === 'EXIT_BANK') {
              this.exitBank();
            } else if (item.action === 'OPEN_ATM') {
              this.casinoUI.openATM();
            } else if (item.action === 'HEIST_ROB_VAULT') {
              this.coopHeists.robVaultBank(this.player);
            }
          }
          return;
        }
      }
    } else if (this.currentZone === 'ARMORY_INTERIOR') {
      // 4c. Ammu-Nation Interior Counter & Exit Door
      const armoryItems = this.armoryInterior.interactables;
      for (const item of armoryItems) {
        const dist = item.position.distanceTo(playerPos);
        const radius = item.radius || 3.2;
        if (dist < radius) {
          this.hud.showInteractionPrompt(`[E] ${item.label}`);
          promptShown = true;

          if (this.inputManager.consumeInteract()) {
            if (item.action === 'EXIT_ARMORY') {
              this.exitArmory();
            } else if (item.action === 'OPEN_ARMORY_STORE') {
              this.openArmoryStore();
            }
          }
          return;
        }
      }
    } else if (this.currentZone === 'PENTHOUSE_CORRIDOR') {
      // 4d. Grand 15 Suites Penthouse Corridor
      const corridorItems = this.penthouseInterior.interactables;
      for (const item of corridorItems) {
        const dist = item.position.distanceTo(playerPos);
        const radius = item.radius || 2.8;
        if (dist < radius) {
          this.hud.showInteractionPrompt(item.promptText);
          promptShown = true;

          if (this.inputManager.consumeInteract()) {
            if (item.type === 'PENTHOUSE_EXIT') {
              this.exitPenthouse();
            } else if (item.type === 'PENTHOUSE_SUITE_DOOR') {
              this.enterPresidentialSuite();
            } else if (item.type === 'LOCKED_SUITE_DOOR') {
              AudioManager.playChipClick();
              window.dispatchEvent(new CustomEvent('notification:show', {
                detail: { message: `🔒 Suite ${item.suiteNum} ocupada por otro magnate de la ciudad.`, type: 'info' }
              }));
            }
          }
          return;
        }
      }
    } else if (this.currentZone === 'PRESIDENTIAL_SUITE') {
      // 4e. Player's Suite 107
      const suiteItems = this.penthouseInterior.interactables;
      for (const item of suiteItems) {
        const dist = item.position.distanceTo(playerPos);
        const radius = item.radius || 2.8;
        if (dist < radius) {
          this.hud.showInteractionPrompt(item.promptText);
          promptShown = true;

          if (this.inputManager.consumeInteract()) {
            if (item.type === 'SUITE_EXIT_TO_CORRIDOR') {
              this.exitPresidentialSuite();
            } else if (item.type === 'SUITE_CUSTOMIZER_TERMINAL') {
              this.openSuiteCustomizer();
            } else if (item.type === 'SHISHA_PUFF') {
              this.puffShisha();
            } else if (item.type === 'MINIBAR_CHAMPAGNE') {
              this.consumeAlcohol('Champán Imperial de la Cava', 32, 50, 25);
            }
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
      this.enterArmory();
    } else if (door.type === 'BANK_ENTRANCE') {
      this.enterBank();
    } else if (door.type === 'GARAGE' || door.id === 'chop_shop_garage') {
      this.openGarage();
    } else if (door.type === 'LIQUOR_STORE' || door.action === 'OPEN_LIQUOR_STORE') {
      this.openLiquorStore();
    } else if (door.type === 'DEALERSHIP' || door.action === 'OPEN_DEALERSHIP') {
      this.openDealership();
    } else if (door.type === 'POLICE' || door.id === 'lspd_hq') {
      this.jailUI.openStationVisit();
    } else if (door.type === 'PENTHOUSE' || door.id === 'dynasty8_penthouse') {
      this.enterPenthouse();
      if (this.missions && this.missions.currentMissionIndex === 4) {
        this.missions.advanceStep();
      }
    } else if (door.type === 'STREET_DEALER' || door.action === 'OPEN_DEALER') {
      this.openDealer();
    }
  }

  handleGarageInteraction() {
    AudioManager.ensureContext();
    AudioManager.playChipClick();
    if (this.player.inVehicle && this.player.currentVehicle) {
      this.player.currentVehicle.currentSpeed = 0;
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: '🔧 ¡VEHÍCULO REPARADO Y BLINDADO AL 100%! Garaje Clandestino de Ocultación.', type: 'success' }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: '🚗 Garaje Clandestino: Trae aquí vehículos robados para completar entregas de embargo y cobrar recompensas.', type: 'info' }
      }));
    }
  }

  createMissionWaypointBeacon() {
    const group = new THREE.Group();
    group.name = 'MissionWaypointBeacon';

    // 1. Ground Ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff007f,
      emissiveIntensity: 2.8,
      roughness: 0.2
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.16, 8, 36), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    // 2. Vertical Light Column
    const beamGeo = new THREE.CylinderGeometry(3.5, 3.5, 10, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 5.0;
    group.add(beam);

    // 3. Floating Inverted Neon Diamond
    const diamondGeo = new THREE.OctahedronGeometry(1.0, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 2.5
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 2.4;
    group.add(diamond);

    group.userData = { ring, beam, diamond };
    group.visible = false;
    this.scene.add(group);
    return group;
  }

  enterBank() {
    this.currentZone = 'BANK_INTERIOR';
    this.player.setGroundY(-120);
    this.player.position.set(200, -119.15, 8.5);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.22;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('BANK_INTERIOR');
    AudioManager.ensureContext();
    AudioManager.stopCasinoAmbience();

    console.log('[World] Has entrado a la sucursal de Vault 21 National Bank');
  }

  exitBank() {
    this.currentZone = 'CITY';
    this.player.setGroundY(0);
    this.player.position.set(24.0, 0.8, 33.0);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.25;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('CITY');
    console.log('[World] Saliste a Diamond Boulevard');
  }

  enterArmory() {
    this.currentZone = 'ARMORY_INTERIOR';
    this.player.setGroundY(-120);
    this.player.position.set(-200, -119.15, 6.8);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.22;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('ARMORY_INTERIOR');
    AudioManager.ensureContext();
    AudioManager.stopCasinoAmbience();

    console.log('[World] Has entrado a Ammu-Nation Gun Store');
  }

  exitArmory() {
    this.currentZone = 'CITY';
    this.player.setGroundY(0);
    this.player.position.set(28.5, 0.8, -41.0);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.25;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('CITY');
    console.log('[World] Saliste a Ammu-Nation Plaza');
  }

  openArmoryStore() {
    const modal = document.getElementById('armory-modal');
    if (modal) {
      modal.classList.add('visible');
      document.body.classList.add('ui-active');
      try {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      } catch (e) {}
      const msg = document.getElementById('armory-status-msg');
      if (msg) msg.textContent = `Efectivo disponible: $${this.economy.cash.toLocaleString()}`;
    }
  }

  closeArmoryStore() {
    const modal = document.getElementById('armory-modal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('ui-active');
  }

  openLiquorStore() {
    const modal = document.getElementById('liquor-modal');
    if (modal) {
      modal.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
      const msg = document.getElementById('liquor-status-msg');
      if (msg) msg.textContent = `Efectivo en mano: $${this.economy.cash.toLocaleString()}`;
    }
  }

  closeLiquorStore() {
    const modal = document.getElementById('liquor-modal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('ui-active');
  }

  openDealership() {
    const modal = document.getElementById('dealership-modal');
    if (modal) {
      modal.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
      const msg = document.getElementById('dealership-status-msg');
      if (msg) msg.textContent = `Tu saldo disponible (Efectivo: $${this.economy.cash.toLocaleString()})`;
    }
  }

  closeDealership() {
    const modal = document.getElementById('dealership-modal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('ui-active');
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
    this.player.position.set(-16.5, 0.8, 50.0);
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

  // -------------------------------------------------------------
  // PENTHOUSE INTERIOR & SUITE 107 (15 ROOMS FLOOR)
  // -------------------------------------------------------------
  enterPenthouse() {
    this.currentZone = 'PENTHOUSE_CORRIDOR';
    this.player.setGroundY(-120);
    this.player.position.set(300, -119.15, 33);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = Math.PI;
    this.player.mesh.rotation.y = Math.PI;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.22;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('PENTHOUSE_CORRIDOR');
    AudioManager.ensureContext();
    AudioManager.playCasinoWin(false);

    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: '👑 Has entrado a la planta de áticos de Dynasty 8 Plaza (15 Suites de Ultralujo)', type: 'success' }
    }));
  }

  exitPenthouse() {
    this.currentZone = 'CITY';
    this.player.setGroundY(0);
    this.player.position.set(29.0, 0.8, -107.0);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.25;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('CITY');
    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: 'Saliste a Dynasty 8 Plaza (Exterior)', type: 'info' }
    }));
  }

  enterPresidentialSuite() {
    this.currentZone = 'PRESIDENTIAL_SUITE';
    this.player.setGroundY(-120);
    this.player.position.set(325, -119.15, 0);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = Math.PI / 2;
    this.player.mesh.rotation.y = Math.PI / 2;

    this.cameraManager.yaw = -Math.PI / 2;
    this.cameraManager.pitch = 0.20;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('PRESIDENTIAL_SUITE');
    AudioManager.ensureContext();
    AudioManager.playCasinoWin(true);

    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: '👑 ¡Bienvenido a tu Suite Presidencial 107! Puedes personalizarla en la terminal.', type: 'success' }
    }));
  }

  exitPresidentialSuite() {
    this.currentZone = 'PENTHOUSE_CORRIDOR';
    this.player.setGroundY(-120);
    this.player.position.set(297.0, -119.15, 0);
    this.player.velocity.set(0, 0, 0);
    this.player.mesh.position.copy(this.player.position);
    this.player.heading = 0;
    this.player.mesh.rotation.y = 0;

    this.cameraManager.yaw = 0;
    this.cameraManager.pitch = 0.22;
    this.cameraManager.snapToTarget(this.player);

    this.lighting.setZone('PENTHOUSE_CORRIDOR');
    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: 'Pasillo de Suites • Dynasty 8 Penthouse', type: 'info' }
    }));
  }

  openSuiteCustomizer() {
    const modal = document.getElementById('suite-customizer-modal');
    if (modal) {
      modal.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
      this.renderSuiteCustomizer();
    }
  }

  closeSuiteCustomizer() {
    const modal = document.getElementById('suite-customizer-modal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('ui-active');
  }

  renderSuiteCustomizer() {
    const msg = document.getElementById('suite-customizer-status-msg');
    if (msg) msg.textContent = `Saldo disponible para reformas: $${this.economy.cash.toLocaleString()}`;

    document.querySelectorAll('.buy-suite-upgrade-btn').forEach((btn) => {
      const id = btn.getAttribute('data-upgrade');
      if (this.penthouseInterior.hasUpgrade(id)) {
        btn.textContent = '✓ INSTALADO';
        btn.style.background = '#222';
        btn.style.color = '#777';
        btn.disabled = true;
      }
    });
  }

  puffShisha() {
    AudioManager.playGulp();
    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: '💨 Inhalas el humo aromático de la shisha dorada... Sabor menta y uva premium.', type: 'info' }
    }));
    // Gentle mild warm screen tint for 6s
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.style.filter = 'sepia(0.2) saturate(1.2)';
      setTimeout(() => {
        if (!this.substanceEffect && this.drunkLevel <= 5) canvas.style.filter = '';
      }, 5000);
    }
  }

  // -------------------------------------------------------------
  // STREET DEALER & SUBSTANCES
  // -------------------------------------------------------------
  openDealer() {
    const modal = document.getElementById('dealer-modal');
    if (modal) {
      modal.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
      const msg = document.getElementById('dealer-status-msg');
      if (msg) msg.textContent = `Efectivo en mano: $${this.economy.cash.toLocaleString()} | Toxicidad actual: ${Math.round(this.toxicityLevel)}%`;
    }
  }

  closeDealer() {
    const modal = document.getElementById('dealer-modal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('ui-active');
  }

  consumeSubstance(substance, toxicity, price) {
    if (this.economy.cash < price) {
      AudioManager.playCasinoLoss();
      const msg = document.getElementById('dealer-status-msg');
      if (msg) msg.textContent = '❌ No tienes suficiente efectivo';
      return;
    }

    this.economy.modifyCash(-price, `Sustancia: ${substance}`);
    AudioManager.playGulp();
    this.toxicityLevel = Math.min(100, this.toxicityLevel + toxicity);
    this.substanceEffect = substance;
    this.substanceTimer = 22.0;

    const msg = document.getElementById('dealer-status-msg');
    if (msg) {
      msg.textContent = `✓ Sustancia consumida. Toxicidad: ${Math.round(this.toxicityLevel)}%`;
    }

    if (substance === 'weed') {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
      this.hud.updatePlayerVitals(this.player.health, this.player.maxHealth, this.player.armor, this.player.maxArmor);
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: '🌿 Hierba Cali consumida. Sensación de relajación profunda...', type: 'success' }
      }));
    } else if (substance === 'pills') {
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: '💊 ¡Pastillas Psicodélicas 777! El mundo cambia de color...', type: 'warning' }
      }));
    } else if (substance === 'dust') {
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: '⚡ ¡Polvo Estelar Nitro! Adrenalina al 200%, velocidad extrema!', type: 'warning' }
      }));
    } else if (substance === 'lean') {
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: '🍇 Purple Lean consumido. Flotando en cámara lenta...', type: 'info' }
      }));
    }

    // Overdose / Blackout condition!
    if (this.toxicityLevel >= 85 || (this.toxicityLevel > 60 && this.drunkLevel > 50)) {
      this.closeDealer();
      this.triggerBlackout('drugs');
    }
  }

  // -------------------------------------------------------------
  // BLACKOUT & FAINTING (SOBREDOSIS / DESMAYO)
  // -------------------------------------------------------------
  triggerBlackout(reason = 'drugs') {
    if (this.isBlackedOut) return;
    this.isBlackedOut = true;
    AudioManager.playHeartbeat();

    const overlay = document.getElementById('blackout-overlay');
    const reasonEl = document.getElementById('blackout-reason');
    if (reasonEl) {
      reasonEl.textContent = reason === 'alcohol'
        ? 'Coma etílico e intoxicación severa por alcohol. Te has desplomado inconsciente...'
        : 'Sobredosis de sustancias químicas. Tu cuerpo colapsó temporalmente...';
    }

    if (overlay) {
      overlay.style.opacity = '1';
    }

    // Double heartbeats during blackout
    setTimeout(() => AudioManager.playHeartbeat(), 1300);
    setTimeout(() => AudioManager.playHeartbeat(), 2700);

    // Blackout lasts 4.5 seconds
    setTimeout(() => {
      this.drunkLevel = 0;
      this.toxicityLevel = 0;
      this.substanceEffect = null;
      this.substanceTimer = 0;

      const canvas = document.getElementById('game-canvas');
      if (canvas) canvas.style.filter = '';

      // Teleport player safely to city sidewalk
      if (this.currentZone !== 'CITY') {
        this.currentZone = 'CITY';
        this.lighting.setZone('CITY');
      }
      this.player.setGroundY(0);
      this.player.position.set(-16.0, 0.8, 25.0);
      this.player.velocity.set(0, 0, 0);
      this.player.mesh.position.copy(this.player.position);
      this.cameraManager.snapToTarget(this.player);

      // Deduct small lost cash
      const lostCash = Math.min(this.economy.cash, Math.floor(120 + Math.random() * 150));
      if (lostCash > 0) {
        this.economy.modifyCash(-lostCash, 'Efectivo sustraído durante el desmayo');
      }

      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: `💫 Has despertado en la acera. Te robaron $${lostCash} mientras estabas inconsciente.`, type: 'warning' }
      }));

      if (overlay) {
        overlay.style.opacity = '0';
      }
      setTimeout(() => {
        this.isBlackedOut = false;
      }, 1000);
    }, 4500);
  }

  // -------------------------------------------------------------
  // PRIVATE GARAGE FLEET MANAGEMENT
  // -------------------------------------------------------------
  loadGarageVehicles() {
    try {
      const saved = localStorage.getItem('mdc_player_garage');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Default starter vehicle in garage
    return [
      { id: 'phantom_gt', name: 'Pegassi Viper GT', type: 'supercar', color: '#00f0ff', topSpeed: '165 km/h' },
      { id: 'dominator_ss', name: 'Vapid Dominator SS', type: 'muscle', color: '#ff0055', topSpeed: '152 km/h' }
    ];
  }

  saveGarageVehicles() {
    try {
      localStorage.setItem('mdc_player_garage', JSON.stringify(this.storedVehicles));
    } catch (e) {}
  }

  openGarage() {
    const modal = document.getElementById('garage-modal');
    if (modal) {
      modal.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
      this.renderGarageVehicles();
    }
  }

  closeGarage() {
    const modal = document.getElementById('garage-modal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('ui-active');
  }

  renderGarageVehicles() {
    const listEl = document.getElementById('garage-vehicles-list');
    const msgEl = document.getElementById('garage-status-msg');
    if (!listEl) return;

    if (msgEl) msgEl.textContent = `Tienes ${this.storedVehicles.length} vehículo(s) almacenados en tu flota.`;

    listEl.innerHTML = this.storedVehicles.map((veh, idx) => `
      <div style="background:#13151f; border:1px solid ${veh.color || '#ff0055'}; border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:bold; color:#fff; font-size:14px;">🏎️ ${veh.name}</div>
          <div style="font-size:12px; color:#888;">Categoría: ${veh.type.toUpperCase()} • Vel: ${veh.topSpeed || '160 km/h'}</div>
          <div style="font-size:11px; color:#00ff88; margin-top:2px;">Estado: 100% Blindado y Reparado</div>
        </div>
        <button class="casino-btn spawn-garage-btn" data-index="${idx}" style="background:${veh.color || '#ff0055'}; color:#000; font-weight:bold; padding:8px 16px; font-size:12px;">
          SACAR
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('.spawn-garage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        this.spawnGarageVehicle(idx);
      });
    });
  }

  storeCurrentVehicle() {
    const msgEl = document.getElementById('garage-status-msg');
    let targetVeh = null;

    if (this.player.inVehicle && this.player.currentVehicle) {
      targetVeh = this.player.currentVehicle;
      this.player.inVehicle = false;
      this.player.currentVehicle = null;
    } else {
      // Find nearest vehicle within 12m
      const pPos = this.player.getPosition();
      for (const veh of this.vehicles) {
        if (veh.position.distanceTo(pPos) < 14) {
          targetVeh = veh;
          break;
        }
      }
    }

    if (!targetVeh) {
      if (msgEl) msgEl.textContent = '❌ No hay ningún vehículo cerca para guardar en el garaje.';
      return;
    }

    const newSaved = {
      id: `veh_${Date.now()}`,
      name: targetVeh.type === 'supercar' ? 'Pegassi Viper GT' : (targetVeh.type === 'muscle' ? 'Vapid Dominator SS' : 'Albany President'),
      type: targetVeh.type || 'sports',
      color: '#ffd700',
      topSpeed: `${Math.round(targetVeh.maxSpeed * 3.6)} km/h`
    };

    this.storedVehicles.push(newSaved);
    this.saveGarageVehicles();

    // Remove vehicle from world scene
    this.scene.remove(targetVeh.mesh);
    const vIdx = this.vehicles.indexOf(targetVeh);
    if (vIdx !== -1) this.vehicles.splice(vIdx, 1);

    AudioManager.playCasinoWin(false);
    if (msgEl) msgEl.textContent = `✓ ¡${newSaved.name} guardado con éxito en el garaje!`;
    this.renderGarageVehicles();

    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: `🚗 ¡Vehículo guardado y reparado al 100% en tu garaje privado!`, type: 'success' }
    }));
  }

  spawnGarageVehicle(idx) {
    const vehData = this.storedVehicles[idx];
    if (!vehData) return;

    // Driveway spawn point outside garage: (18.0, 0.5, -82.0)
    const spawnPos = { x: 18.0, y: 0.5, z: -82.0 };
    const newCar = new Vehicle(this.scene, vehData.type || 'supercar', spawnPos);
    newCar.mesh.rotation.y = 0;
    this.vehicles.push(newCar);
    this.playerCar = newCar;

    this.closeGarage();
    AudioManager.playCasinoWin(false);

    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: `🏎️ ¡${vehData.name} desplegado en la salida del garaje!`, type: 'success' }
    }));
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
