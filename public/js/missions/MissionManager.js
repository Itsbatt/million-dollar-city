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
            targetPos: { x: -19, y: 0, z: 35 },
            radius: 8.0,
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
            radius: 8.0,
            blipName: 'Garaje Seguro'
          }
        ],
        completionMessage: '¡Entrega completada! $15,000 añadidos a tu cuenta.'
      },
      {
        id: 'mission_3',
        title: 'El Gran Golpe a Vault 21',
        subtitle: 'Atraco a la Banca Nacional',
        reward: 75000,
        reputation: 600,
        steps: [
          {
            text: 'Entra al Banco Vault 21 National Bank frente al Casino',
            targetPos: { x: 23, y: 0, z: 30 },
            radius: 6.0,
            blipName: 'Banco Vault 21'
          },
          {
            text: 'Fuerza la caja del banco y recoge las sacas de dinero ($75,000)',
            actionType: 'LOOT_VAULT'
          },
          {
            text: '¡Alarma máxima (3 Estrellas)! Escapa de la persecución policial',
            actionType: 'EVADE_POLICE',
            requiredStars: 3
          }
        ],
        completionMessage: '¡Atraco legendario! Las sacas de Vault 21 son tuyas: +$75,000.'
      }
    ];

    this.startMission(0);

    // Listen to in-game trigger events
    window.addEventListener('casino:bet_placed', () => this.checkActionTrigger('CASINO_BET'));
    window.addEventListener('vehicle:entered', () => this.checkActionTrigger('ENTER_VEHICLE'));
  }

  startMission(index) {
    if (index >= this.missions.length) {
      this.activeMission = null;
      this.notifyMissionUpdate();
      return;
    }

    this.currentMissionIndex = index;
    this.currentStep = 0;
    this.activeMission = this.missions[index];

    console.log(`[Missions] Started Mission: ${this.activeMission.title}`);
    this.notifyMissionUpdate();
  }

  update(delta, playerPos, wantedLevel = 0) {
    if (!this.activeMission) return;

    const step = this.activeMission.steps[this.currentStep];
    if (!step) return;

    // Check distance-based waypoint
    if (step.targetPos && playerPos) {
      const dist = new THREE.Vector3(step.targetPos.x, 0, step.targetPos.z)
        .distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));

      if (dist <= (step.radius || 5.0)) {
        this.advanceStep();
      }
    }

    // Check police evasion step
    if (step.actionType === 'EVADE_POLICE') {
      if (wantedLevel === 0 && this.hasTriggeredPolice) {
        this.advanceStep();
      }
    }
  }

  checkActionTrigger(actionType) {
    if (!this.activeMission) return;
    const step = this.activeMission.steps[this.currentStep];
    if (step && step.actionType === actionType) {
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
      }
      this.notifyMissionUpdate();
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
