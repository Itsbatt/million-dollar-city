import * as THREE from '/vendor/three.module.js';
import AudioManager from '../engine/AudioManager.js';

export class NetworkClient {
  constructor(scene, player, economyManager, vehiclesMap = []) {
    this.scene = scene;
    this.player = player;
    this.economy = economyManager;
    this.vehicles = vehiclesMap;

    this.socket = null;
    this.remotePlayers = new Map(); // socketId -> RemotePlayerData
    this.lastSyncTime = 0;
    this.syncInterval = 0.045; // ~22Hz

    this.activeHeistLobby = null;

    this.initSocket();
  }

  initSocket() {
    if (typeof io === 'undefined') {
      console.warn('[Network] Socket.IO client script not loaded; running offline.');
      return;
    }

    try {
      this.socket = io();

      this.socket.on('connect', () => {
        console.log(`[Network] Conectado al servidor de Million Dollar City. Socket ID: ${this.socket.id}`);
        const pos = this.player.getPosition();

        this.socket.emit('player:join', {
          id: this.economy.playerId,
          username: this.economy.username,
          token: this.economy.token,
          x: pos.x,
          y: pos.y,
          z: pos.z,
          rotY: this.player.heading,
          animState: this.player.animState,
          currentWeapon: 'pistol'
        });
      });

      // World Initial State
      this.socket.on('world:init_state', (data) => {
        for (const p of data.players || []) {
          this.addRemotePlayer(p);
        }
      });

      // New Player Joined
      this.socket.on('player:joined', (playerData) => {
        this.addRemotePlayer(playerData);
        this.showNotification(`🟢 ${playerData.username} ha entrado a la ciudad`);
      });

      // Movement & Transform Sync
      this.socket.on('player:moved', (data) => {
        const rp = this.remotePlayers.get(data.socketId);
        if (rp) {
          rp.targetPos.set(data.x, data.y, data.z);
          rp.targetRotY = data.rotY;
          rp.animState = data.animState;
          rp.inVehicle = data.inVehicle;
          rp.mesh.visible = !data.inVehicle;
        }
      });

      // Gunfire replication
      this.socket.on('player:shot', (data) => {
        if (data.socketId === this.socket.id) return;
        this.renderRemoteShot(data);
      });

      // Player Damage Received
      this.socket.on('player:damaged', (data) => {
        this.player.takeDamage(data.damage);
        this.showNotification(`⚠️ Has recibido daño de ${data.attacker}`);
      });

      // Vehicle Multiplayer Driving Replication
      this.socket.on('vehicle:occupied', (data) => {
        console.log(`[Multiplayer] ${data.driverName} subió al vehículo ${data.vehicleId}`);
      });

      this.socket.on('vehicle:updated', (data) => {
        const car = this.findVehicleById(data.vehicleId);
        if (car && (!this.player.inVehicle || this.player.currentVehicle !== car)) {
          car.position.set(data.x, data.y, data.z);
          car.mesh.position.copy(car.position);
          car.mesh.rotation.y = data.rotY;
          car.currentSpeed = data.speed;
          if (car.frontLeftWheel) {
            car.frontLeftWheel.rotation.y = data.steeringAngle || 0;
            car.frontRightWheel.rotation.y = data.steeringAngle || 0;
          }
        }
      });

      this.socket.on('vehicle:vacated', (data) => {
        const car = this.findVehicleById(data.vehicleId);
        if (car) {
          car.isOccupied = false;
          car.currentSpeed = 0;
        }
      });

      // Multi-Channel Chat
      this.socket.on('chat:broadcast', (msg) => {
        window.dispatchEvent(new CustomEvent('chat:message_received', { detail: msg }));
      });

      // Direct Bank Transfer Received (Real-Time Notification & Balance Update)
      this.socket.on('bank:transfer_received', (data) => {
        this.economy.modifyBank(data.amount, `Recibido de ${data.sender}: ${data.note}`);
        AudioManager.playCasinoWin(false);
        this.showNotification(`💰 ¡Has recibido $${data.amount.toLocaleString()} de ${data.sender}!`);
        window.dispatchEvent(new CustomEvent('bank:wire_received', { detail: data }));
      });

      // Co-op Heist Lobby & State Events
      this.socket.on('heist:invitation_received', (data) => {
        AudioManager.playCasinoWin(false);
        window.dispatchEvent(new CustomEvent('heist:invite_popup', { detail: data }));
      });

      this.socket.on('heist:lobby_state', (heist) => {
        this.activeHeistLobby = heist;
        window.dispatchEvent(new CustomEvent('heist:lobby_updated', { detail: heist }));
      });

      this.socket.on('heist:started', (data) => {
        this.showNotification(`🚨 ¡EL GOLPE '${data.heistTitle}' HA COMENZADO! Rol: ${data.role}`);
        window.dispatchEvent(new CustomEvent('heist:mission_launched', { detail: data }));
      });

      this.socket.on('heist:payout_awarded', (data) => {
        this.economy.modifyBank(data.myCut, `Botín del Golpe: ${data.heistTitle}`);
        AudioManager.playCasinoWin(true);
        this.showNotification(`★ ¡GOLPE COMPLETADO! Has cobrado tu parte: +$${data.myCut.toLocaleString()} ★`);
        window.dispatchEvent(new CustomEvent('heist:completed_screen', { detail: data }));
      });

      // Disconnect of remote player
      this.socket.on('player:left', (data) => {
        const rp = this.remotePlayers.get(data.socketId);
        if (rp) {
          this.scene.remove(rp.mesh);
          this.remotePlayers.delete(data.socketId);
        }
      });
    } catch (e) {
      console.warn('[Network] Error conectando:', e);
    }
  }

  addRemotePlayer(data) {
    if (this.remotePlayers.has(data.socketId)) return;

    const group = new THREE.Group();
    group.position.set(data.x, data.y || 0, data.z);

    // Anatomical Stylized Remote Player Avatar
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x141e28, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.28), jacketMat);
    torso.position.y = 1.18;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
    head.position.y = 1.58;
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), hairMat);
    hair.position.y = 1.72;
    group.add(hair);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.18), pantsMat);
    leftLeg.position.set(-0.13, 0.4, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.18), pantsMat);
    rightLeg.position.set(0.13, 0.4, 0);
    group.add(rightLeg);

    // Arms
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), jacketMat);
    leftArm.position.set(-0.28, 1.15, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), jacketMat);
    rightArm.position.set(0.28, 1.15, 0);
    group.add(rightArm);

    // 3D Floating Nametag Sprite over head
    const nametag = this.createNametagSprite(data.username, data.level || 1);
    nametag.position.set(0, 2.05, 0);
    group.add(nametag);

    this.scene.add(group);

    this.remotePlayers.set(data.socketId, {
      id: data.id,
      username: data.username,
      mesh: group,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      targetPos: new THREE.Vector3(data.x, data.y, data.z),
      targetRotY: data.rotY || 0,
      animState: data.animState || 'idle',
      animTime: 0
    });
  }

  createNametagSprite(username, level = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
    ctx.roundRect(10, 10, 236, 44, 12);
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(`${username} [Nv.${level}]`, 128, 38);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.6, 0.4, 1.0);
    return sprite;
  }

  renderRemoteShot(data) {
    AudioManager.playGunshot(data.weapon || 'pistol');

    if (data.origin && data.direction) {
      const start = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
      const end = start.clone().add(new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z).multiplyScalar(60));

      const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
      const mat = new THREE.LineBasicMaterial({ color: 0xffe066, linewidth: 2 });
      const line = new THREE.Line(geom, mat);
      this.scene.add(line);
      setTimeout(() => this.scene.remove(line), 70);
    }
  }

  update(delta) {
    // 1. Interpolate remote players smoothly
    for (const [_, rp] of this.remotePlayers) {
      rp.mesh.position.lerp(rp.targetPos, delta * 14);
      rp.mesh.rotation.y = THREE.MathUtils.lerp(rp.mesh.rotation.y, rp.targetRotY, delta * 14);

      // Animate remote extremities
      rp.animTime += delta;
      if (rp.animState === 'walk' || rp.animState === 'run') {
        const freq = rp.animState === 'run' ? 14 : 8;
        const swing = Math.sin(rp.animTime * freq) * 0.6;
        rp.leftLeg.rotation.x = swing;
        rp.rightLeg.rotation.x = -swing;
        rp.leftArm.rotation.x = -swing;
        rp.rightArm.rotation.x = swing;
      } else {
        rp.leftLeg.rotation.x = 0;
        rp.rightLeg.rotation.x = 0;
        rp.leftArm.rotation.x = 0;
        rp.rightArm.rotation.x = 0;
      }
    }

    // 2. Broadcast Local Player Transform at ~22Hz
    if (this.socket && this.socket.connected) {
      const now = performance.now() / 1000;
      if (now - this.lastSyncTime > this.syncInterval) {
        this.lastSyncTime = now;
        const pos = this.player.getPosition();

        this.socket.emit('player:move', {
          x: pos.x,
          y: pos.y,
          z: pos.z,
          rotY: this.player.heading,
          animState: this.player.animState,
          inVehicle: this.player.inVehicle,
          vehicleId: this.player.currentVehicle ? this.player.currentVehicle.mesh.name : null,
          currentWeapon: this.player.currentWeapon || 'pistol'
        });

        // If driving, broadcast vehicle kinematics
        if (this.player.inVehicle && this.player.currentVehicle) {
          const veh = this.player.currentVehicle;
          this.socket.emit('vehicle:sync', {
            vehicleId: veh.mesh.name,
            x: veh.position.x,
            y: veh.position.y,
            z: veh.position.z,
            rotY: veh.mesh.rotation.y,
            speed: veh.currentSpeed,
            steeringAngle: veh.steeringAngle,
            headlights: true
          });
        }
      }
    }
  }

  sendChat(channel, text, targetUserId = null) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:send', {
        channel,
        text,
        targetUserId,
        position: this.player.getPosition()
      });
    }
  }

  showNotification(msg) {
    window.dispatchEvent(new CustomEvent('phone:notification', { detail: { message: msg } }));
  }

  findVehicleById(id) {
    return this.vehicles.find(v => v.mesh && v.mesh.name === id);
  }

  getRemotePlayers() {
    return Array.from(this.remotePlayers.values());
  }
}
