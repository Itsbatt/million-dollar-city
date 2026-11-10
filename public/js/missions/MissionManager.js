import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';

export class MissionManager {
  constructor(economyManager) {
    this.economy = economyManager;
    this.currentMissionIndex = 0;
    this.currentStep = 0;
    this.activeMission = null;

    this.missions = [
      {
        id: 'mission_1',
        title: 'Bautismo en el Diamond Strip',
        subtitle: 'El Primer Golpe de Suerte',
        reward: 2500,
        reputation: 100,
        steps: [
          {
            text: 'Dirígete al Casino The Royal Mirage en el Diamond Strip',
            targetPos: { x: -17.5, y: 0, z: 50.0 },
            radius: 9.5,
            blipName: 'Casino Royal Mirage'
          },
          {
            text: 'Entra al Casino y realiza tu primera apuesta en la Ruleta o Blackjack',
            actionType: 'CASINO_BET',
            blipName: 'Mesa de Apuestas'
          }
        ],
        completionMessage: '¡Misión cumplida! Has ganado reputación y tus primeros beneficios.'
      },
      {
        id: 'mission_2',
        title: 'Embargo de Alta Gama',
        subtitle: 'Robo de Superdeportivo',
        reward: 15000,
        reputation: 250,
        steps: [
          {
            text: 'Roba el superdeportivo Viper GT aparcado frente a Sunset Plaza',
            actionType: 'ENTER_VEHICLE',
            blipName: 'Viper GT'
          },
          {
            text: '¡La policía te ha detectado! Pierde el nivel de búsqueda de 2 Estrellas',
            actionType: 'EVADE_POLICE',
            requiredStars: 2
          },
          {
            text: 'Entrega el deportivo en el Garaje de Ocultación (Z: -90)',
            targetPos: { x: 18, y: 0, z: -90 },
            radius: 11.0,
            blipName: 'Garaje Seguro'
          }
        ],
        completionMessage: '¡Entrega completada! $15,000 añadidos a tu cuenta.'
      },
      {
        id: 'mission_3',
        title: 'El Gran Golpe a Vault 21',
        subtitle: 'Atraco a la Banca Nacional',
        reward: 25000,
        reputation: 600,
        steps: [
          {
            text: 'Entra a la sucursal del Banco Vault 21 National Bank frente al Casino',
            targetPos: { x: 23, y: 0, z: 30 },
            radius: 8.0,
            blipName: 'Banco Vault 21'
          },
          {
            text: 'Fuerza la cámara acorazada subterránea y saquea el oro macizo',
            actionType: 'LOOT_VAULT'
          },
          {
            text: '¡Alarma máxima (3 Estrellas)! Escapa de la persecución policial',
            actionType: 'EVADE_POLICE',
            requiredStars: 3
          }
        ],
        completionMessage: '¡Atraco legendario! Has asegurado tu parte del botín: +$25,000.'
      },
      {
        id: 'mission_4',
        title: 'Arsenal Táctico y Guerra Callejera',
        subtitle: 'Ammu-Nation Tactical Gear',
        reward: 35000,
        reputation: 800,
        steps: [
          {
            text: 'Dirígete a la armería Ammu-Nation en Sunset Strip (Z: -45)',
            targetPos: { x: 28, y: 0, z: -45 },
            radius: 8.5,
            blipName: 'Ammu-Nation'
          },
          {
            text: 'Entra a la tienda y adquiere un arma de fuego o chaleco antibalas Kevlar',
            actionType: 'ARMORY_PURCHASE'
          },
          {
            text: 'Desplázate al Punto de Extracción en el Callejón Sunset (Z: 140)',
            targetPos: { x: -35, y: 0, z: 140 },
            radius: 9.0,
            blipName: 'Punto de Extracción'
          }
        ],
        completionMessage: '¡Territorio dominado! Has ganado control táctico y $35,000.'
      },
      {
        id: 'mission_5',
        title: 'El Magnate de Million Dollar City',
        subtitle: 'Corona el Imperio del Millón',
        reward: 100000,
        reputation: 2500,
        steps: [
          {
            text: 'Alcanza el club exclusivo Velvet Lounge en Diamond Strip',
            targetPos: { x: -26, y: 0, z: -45 },
            radius: 8.5,
            blipName: 'Club Velvet'
          },
          {
            text: 'Apuesta en las mesas VIP de The Royal Mirage Casino',
            actionType: 'CASINO_BET'
          },
          {
            text: 'Reclama la Suite Presidencial en el ático de Dynasty 8 Plaza',
            targetPos: { x: 29.0, y: 0, z: -110.0 },
            radius: 12.0,
            blipName: 'Suite Presidencial • Dynasty 8 Plaza'
          }
        ],
        completionMessage: '¡ENHORABUENA! Eres oficialmente el amo indiscutible de Million Dollar City.'
      }
    ];

    this.startMission(0);

    // Listen to in-game trigger events
    window.addEventListener('casino:bet_placed', () => this.checkActionTrigger('CASINO_BET'));
    window.addEventListener('vehicle:entered', () => this.checkActionTrigger('ENTER_VEHICLE'));
    window.addEventListener('vault:looted', () => this.checkActionTrigger('LOOT_VAULT'));
    window.addEventListener('heist:vault_looted', () => this.checkActionTrigger('LOOT_VAULT'));
    window.addEventListener('armory:purchased', () => this.checkActionTrigger('ARMORY_PURCHASE'));
    window.addEventListener('casino:high_roller', () => this.checkActionTrigger('CASINO_HIGH_ROLLER'));
  }

  startMission(index) {
    if (index >= this.missions.length) {
      this.activeMission = null;
      this.notifyMissionUpdate();
      window.dispatchEvent(new CustomEvent('save:state_requested'));
      return;
    }

    this.currentMissionIndex = index;
    this.currentStep = 0;
    this.activeMission = this.missions[index];

    console.log(`[Missions] Started Mission: ${this.activeMission.title}`);
    this.notifyMissionUpdate();
    window.dispatchEvent(new CustomEvent('save:state_requested'));
  }

  setSavedProgress(missionIndex, stepIndex = 0) {
    const idx = parseInt(missionIndex, 10);
    const step = parseInt(stepIndex, 10) || 0;

    if (isNaN(idx) || idx >= this.missions.length) {
      this.activeMission = null;
      this.notifyMissionUpdate();
      return;
    }

    this.currentMissionIndex = Math.max(0, idx);
    this.activeMission = this.missions[this.currentMissionIndex];
    if (this.activeMission) {
      this.currentStep = Math.min(Math.max(0, step), this.activeMission.steps.length - 1);
      console.log(`[Missions] Progreso restaurado: ${this.activeMission.title} (Paso ${this.currentStep + 1}/${this.activeMission.steps.length})`);
      this.notifyMissionUpdate();
    }
  }

  update(delta, playerPos, wantedLevel = 0) {
    if (!this.activeMission) return;

    const step = this.activeMission.steps[this.currentStep];
    if (!step) return;

    // Check distance-based waypoint
    if (step.targetPos && playerPos) {
      const dist = new THREE.Vector3(step.targetPos.x, 0, step.targetPos.z)
        .distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));

      if (dist <= (step.radius || 7.0)) {
        this.advanceStep();
        return;
      }
    }

    // Check police evasion step
    if (step.actionType === 'EVADE_POLICE') {
      if (wantedLevel === 0 && this.hasTriggeredPolice) {
        this.hasTriggeredPolice = false;
        this.advanceStep();
      }
    }
  }

  checkActionTrigger(actionType) {
    if (!this.activeMission) return;
    const step = this.activeMission.steps[this.currentStep];
    if (step && step.actionType === actionType) {
      console.log(`[Missions] Action completed: ${actionType}`);
      this.advanceStep();
    }
  }

  advanceStep() {
    this.currentStep++;
    AudioManager.playCasinoWin(false);

    if (this.currentStep >= this.activeMission.steps.length) {
      // Mission Complete!
      this.completeMission();
    } else {
      // Trigger crime if next step is police evasion
      const next = this.activeMission.steps[this.currentStep];
      if (next.actionType === 'EVADE_POLICE') {
        this.hasTriggeredPolice = true;
        window.dispatchEvent(new CustomEvent('crime:committed', { detail: { stars: next.requiredStars || 2 } }));
      } else {
        this.hasTriggeredPolice = false;
      }
      this.notifyMissionUpdate();
      window.dispatchEvent(new CustomEvent('save:state_requested'));
    }
  }

  completeMission() {
    const reward = this.activeMission.reward;
    this.economy.modifyCash(reward, `Recompensa Misión: ${this.activeMission.title}`);
    AudioManager.playCasinoWin(true);

    window.dispatchEvent(new CustomEvent('mission:completed', {
      detail: {
        title: this.activeMission.title,
        reward: this.activeMission.reward,
        message: this.activeMission.completionMessage
      }
    }));

    setTimeout(() => {
      this.startMission(this.currentMissionIndex + 1);
    }, 4000);
  }

  notifyMissionUpdate() {
    const step = this.activeMission ? this.activeMission.steps[this.currentStep] : null;
    window.dispatchEvent(new CustomEvent('mission:updated', {
      detail: {
        title: this.activeMission ? this.activeMission.title : 'Objetivo Libre: Consigue 1.000.000 $',
        subtitle: this.activeMission ? this.activeMission.subtitle : 'Apuesta en Casinos y Domina la Ciudad',
        objective: step ? step.text : 'Aumenta tu fortuna apostando, atracando o invirtiendo.',
        targetPos: step?.targetPos || null
      }
    }));
  }

  getCurrentTarget() {
    if (!this.activeMission) return null;
    return this.activeMission.steps[this.currentStep]?.targetPos || null;
  }
}
