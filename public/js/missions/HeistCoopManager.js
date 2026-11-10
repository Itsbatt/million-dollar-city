import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';

export class HeistCoopManager {
  constructor(scene, player, economyManager, networkClient, policeManager) {
    this.scene = scene;
    this.player = player;
    this.economy = economyManager;
    this.network = networkClient;
    this.police = policeManager;

    this.activeHeist = null;
    this.currentPhase = 0;
    this.hackSuccess = false;

    this.initEvents();
  }

  initEvents() {
    window.addEventListener('heist:mission_launched', (e) => {
      this.startHeist(e.detail);
    });

    // Sync coop heist progression across all team players
    if (this.network && this.network.socket) {
      this.network.socket.on('heist:phase_synced', (data) => {
        if (this.activeHeist && this.activeHeist.roomId === data.roomId) {
          console.log(`[Heist] Fase sincronizada por el equipo: ${data.phase + 1}`);
          this.currentPhase = data.phase;
          AudioManager.playCasinoWin(false);
          this.updateHUDObjective();
        }
      });
    }
  }

  startHeist(heistConfig) {
    this.activeHeist = {
      roomId: heistConfig.roomId,
      heistId: heistConfig.heistId,
      heistTitle: heistConfig.heistTitle,
      myRole: heistConfig.role,
      members: heistConfig.members,
      phases: this.getHeistPhases(heistConfig.heistId)
    };

    this.currentPhase = 0;
    this.hackSuccess = false;
    AudioManager.playCasinoWin(false);

    console.log(`[Heist] Iniciando ${this.activeHeist.heistTitle} en rol: ${this.activeHeist.myRole}`);
    this.updateHUDObjective();
  }

  getHeistPhases(heistId) {
    if (heistId === 'casino') {
      return [
        {
          name: 'Punto de Encuentro',
          desc: 'Reúnete con el equipo en la entrada de servicio del Casino Mirage (X: -42, Z: 50)',
          target: { x: -42, y: 0, z: 50 },
          radius: 7.0
        },
        {
          name: 'Hackeo de la Sala de Seguridad',
          desc: 'El Hacker debe hackear la terminal para anular las cámaras y abrir la cámara acorazada',
          isHackPhase: true
        },
        {
          name: 'Extracción del Botín',
          desc: '¡Sacad las sacas de dinero y fichas de la caja principal ($350,000)!',
          action: 'LOOT_VAULT'
        },
        {
          name: 'Huida a Alta Velocidad',
          desc: '¡Alarma máxima (4 Estrellas)! El Conductor debe llevar al equipo al helipuerto del edificio Maze (Z: -125)',
          target: { x: 50, y: 0, z: -125 },
          radius: 10.0,
          requiresPoliceEvade: true
        }
      ];
    } else {
      // Default: Central Bank Heist (Vault 21)
      return [
        {
          name: 'Infiltración',
          desc: 'Accede a las escaleras subterráneas del Banco Vault 21 con tu equipo (X: 35, Z: 30)',
          target: { x: 35, y: 0, z: 30 },
          radius: 6.0
        },
        {
          name: 'Brecha de Seguridad',
          desc: 'El Hacker debe vulnerar el código térmico de la cámara acorazada',
          isHackPhase: true
        },
        {
          name: 'Asegurar el Botín',
          desc: 'Empacad $200,000 en las bolsas de atraco',
          action: 'LOOT_VAULT'
        },
        {
          name: 'Huida y Entrega Segura',
          desc: '¡4 Estrellas Policiales! Evadid las patrullas y alcanzad el Garaje Clandestino (Z: -90)',
          target: { x: 18, y: 0, z: -90 },
          radius: 8.0,
          requiresPoliceEvade: true
        }
      ];
    }
  }

  update(delta, playerPos) {
    if (!this.activeHeist) return;

    const phase = this.activeHeist.phases[this.currentPhase];
    if (!phase) return;

    // 1. Distance check to target waypoint
    if (phase.target && playerPos) {
      const dist = new THREE.Vector3(phase.target.x, 0, phase.target.z)
        .distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));

      if (dist <= phase.radius) {
        this.advancePhase();
      }
    }
  }

  performHackAction() {
    if (!this.activeHeist) return;
    const phase = this.activeHeist.phases[this.currentPhase];
    if (phase && phase.isHackPhase) {
      this.hackSuccess = true;
      AudioManager.playCasinoWin(false);
      this.advancePhase();
    }
  }

  performLootAction() {
    if (!this.activeHeist) return;
    const phase = this.activeHeist.phases[this.currentPhase];
    if (phase && phase.action === 'LOOT_VAULT') {
      AudioManager.playCasinoWin(true);
      // Trigger 4-Star police response
      window.dispatchEvent(new CustomEvent('crime:committed', { detail: { stars: 4 } }));
      window.dispatchEvent(new CustomEvent('vault:looted'));
      window.dispatchEvent(new CustomEvent('heist:vault_looted'));
      this.advancePhase();
    }
  }

  advancePhase() {
    this.currentPhase++;
    AudioManager.playCasinoWin(false);

    // Sync phase advance with server and crew members
    if (this.network && this.network.socket && this.activeHeist) {
      this.network.socket.emit('heist:phase_advance', {
        roomId: this.activeHeist.roomId,
        phase: this.currentPhase
      });
    }

    if (this.currentPhase >= this.activeHeist.phases.length) {
      // Completed Heist!
      this.completeHeist();
    } else {
      this.updateHUDObjective();
    }
  }

  robVaultBank(player) {
    if (this._lastVaultRob && Date.now() - this._lastVaultRob < 60000) {
      window.dispatchEvent(new CustomEvent('notification:show', {
        detail: { message: '⏳ La cámara acorazada de Vault 21 está vacía. Vuelve en 1 minuto.', type: 'warning' }
      }));
      return;
    }
    this._lastVaultRob = Date.now();
    const loot = 60000;
    this.economy.modifyCash(loot, 'Atraco a la Bóveda de Vault 21');
    AudioManager.playCasinoWin(true);

    // Notify solo mission and global heist listeners
    window.dispatchEvent(new CustomEvent('vault:looted'));
    window.dispatchEvent(new CustomEvent('heist:vault_looted'));

    // Trigger 3 Stars police pursuit
    window.dispatchEvent(new CustomEvent('crime:committed', { detail: { stars: 3 } }));

    // Show alert / notification
    window.dispatchEvent(new CustomEvent('notification:show', {
      detail: { message: `💰 ¡HAS SAQUEADO LA BÓVEDA DE VAULT 21! +$${loot.toLocaleString()} (Alarma Policial Nivel 3)`, type: 'success' }
    }));

    if (this.network && this.network.socket) {
      this.network.socket.emit('player:chat', {
        text: `🚨 ¡ALERTA CIUDADANA! Alguien ha reventado la cámara acorazada de Vault 21 y se ha llevado $60,000 en lingotes!`
      });
    }
  }

  completeHeist() {
    console.log('[Heist] ¡Golpe finalizado! Solicitando liquidación al servidor autoritativo...');

    if (this.network && this.network.socket) {
      this.network.socket.emit('heist:complete', {
        roomId: this.activeHeist.roomId
      });
    }

    this.activeHeist = null;
    this.currentPhase = 0;
  }

  updateHUDObjective() {
    const phase = this.activeHeist ? this.activeHeist.phases[this.currentPhase] : null;
    if (phase) {
      window.dispatchEvent(new CustomEvent('mission:updated', {
        detail: {
          title: `🎯 GOLPE: ${this.activeHeist.heistTitle} [Fase ${this.currentPhase + 1}]`,
          subtitle: `Rol asignado: ${this.activeHeist.myRole}`,
          objective: phase.desc,
          targetPos: phase.target || null
        }
      }));
    }
  }

  getActiveWaypoint() {
    if (!this.activeHeist) return null;
    const phase = this.activeHeist.phases[this.currentPhase];
    return phase?.target || null;
  }
}
