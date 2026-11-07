import * as THREE from '/vendor/three.module.js';

export class CameraManager {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1200);

    this.mode = 'PLAYER'; // 'PLAYER' | 'VEHICLE' | 'CASINO_TABLE' | 'CINEMATIC'

    // Third-person orbit angles
    this.yaw = 0;
    this.pitch = 0.25; // slight downward angle
    this.distance = 4.2;
    this.targetDistance = 4.2;

    this.isAiming = false;
    this.recoilPitch = 0;
    this.recoilYaw = 0;

    this.sensitivity = 0.0022;
    this.currentPosition = new THREE.Vector3(0, 5, 10);
    this.currentTarget = new THREE.Vector3(0, 1.5, 0);

    // Vehicle chase parameters
    this.vehiclePitch = 0.28;
    this.vehicleDistance = 7.0;
    this.vehicleYaw = 0;

    // Casino table focus
    this.tableTarget = new THREE.Vector3();
    this.tableCameraPos = new THREE.Vector3();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode, customParams = {}) {
    this.mode = mode;
    if (mode === 'CASINO_TABLE') {
      if (customParams.cameraPos) this.tableCameraPos.copy(customParams.cameraPos);
      if (customParams.target) this.tableTarget.copy(customParams.target);
    }
  }

  addRecoil(pitchKick = 0.035, yawKick = 0.01) {
    this.recoilPitch += pitchKick;
    this.recoilYaw += (Math.random() - 0.5) * yawKick;
  }

  update(delta, targetEntity, mouseDelta = { x: 0, y: 0 }, isAiming = false, weaponId = 'pistol') {
    this.isAiming = isAiming;
    if (this.mode === 'PLAYER' && targetEntity) {
      this.updatePlayerCamera(delta, targetEntity, mouseDelta, isAiming, weaponId);
    } else if (this.mode === 'VEHICLE' && targetEntity) {
      this.updateVehicleCamera(delta, targetEntity, mouseDelta);
    } else if (this.mode === 'CASINO_TABLE') {
      this.updateCasinoCamera(delta);
    }
  }

  updatePlayerCamera(delta, player, mouseDelta, isAiming = false, weaponId = 'pistol') {
    // Slower mouse sensitivity when aiming for precision
    const sens = isAiming ? this.sensitivity * 0.6 : this.sensitivity;

    // Apply mouse look
    this.yaw -= mouseDelta.x * sens;
    this.pitch -= mouseDelta.y * sens;

    // Decay recoil smoothly
    this.pitch += this.recoilPitch;
    this.yaw += this.recoilYaw;
    this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, 0.22);
    this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, 0.22);

    // Clamp pitch
    const maxPitch = Math.PI / 2.3;
    const minPitch = -Math.PI / 4;
    this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch));

    // Target player head/chest area
    const playerPos = player.getPosition();
    const lookTarget = new THREE.Vector3(playerPos.x, playerPos.y + 1.45, playerPos.z);

    // Dynamic distance & Over-the-shoulder offset
    const isSniperAim = isAiming && weaponId === 'sniper';
    const currentDist = isSniperAim ? 0.05 : (isAiming ? 2.1 : this.distance);
    const cosPitch = Math.cos(this.pitch);

    let offsetX = Math.sin(this.yaw) * cosPitch * currentDist;
    let offsetY = Math.sin(this.pitch) * currentDist;
    let offsetZ = Math.cos(this.yaw) * cosPitch * currentDist;

    // Right-shoulder camera shift during standard ADS (pistol, smg, shotgun, rifle)
    if (isAiming && !isSniperAim) {
      const rightX = Math.cos(this.yaw) * 0.52;
      const rightZ = -Math.sin(this.yaw) * 0.52;
      offsetX += rightX;
      offsetZ += rightZ;
      offsetY += 0.08;

      lookTarget.x += rightX * 0.4;
      lookTarget.z += rightZ * 0.4;
      lookTarget.y += 0.06;
    } else if (isSniperAim) {
      // First-person optic line-of-sight directly from eye height
      lookTarget.y = playerPos.y + 1.55;
      offsetY = 0;
    }

    const desiredPos = new THREE.Vector3(
      lookTarget.x + offsetX,
      lookTarget.y + offsetY,
      lookTarget.z + offsetZ
    );

    // Floor collision prevention: keep camera above local ground level
    const minFloorY = playerPos.y + 0.35;
    if (desiredPos.y < minFloorY) desiredPos.y = minFloorY;

    // Smooth lerp (faster tracking when aiming)
    const lerpSpeed = isAiming ? 0.35 : 0.22;
    this.currentPosition.lerp(desiredPos, lerpSpeed);
    this.currentTarget.lerp(lookTarget, lerpSpeed);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);

    // Tactical ADS Zoom: Sniper zooms to 18 FOV, regular weapons zoom to 42 FOV, hip-fire is 65 FOV
    const targetFov = isAiming ? (weaponId === 'sniper' ? 18 : 42) : 65;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.22);
      this.camera.updateProjectionMatrix();
    }
  }

  snapToTarget(targetEntity) {
    if (!targetEntity) return;
    const pos = targetEntity.getPosition();
    const lookTarget = new THREE.Vector3(pos.x, pos.y + 1.45, pos.z);
    const cosPitch = Math.cos(this.pitch);
    const offsetX = Math.sin(this.yaw) * cosPitch * this.distance;
    const offsetY = Math.sin(this.pitch) * this.distance;
    const offsetZ = Math.cos(this.yaw) * cosPitch * this.distance;

    this.currentPosition.set(lookTarget.x + offsetX, lookTarget.y + offsetY, lookTarget.z + offsetZ);
    this.currentTarget.copy(lookTarget);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  updateVehicleCamera(delta, vehicle, mouseDelta) {
    const carPos = vehicle.getPosition();
    const carRotY = vehicle.mesh.rotation.y;
    const carSpeed = vehicle.currentSpeed || 0;

    // Allow slight free look or align behind vehicle
    this.vehiclePitch -= mouseDelta.y * this.sensitivity;
    this.vehiclePitch = Math.max(0.05, Math.min(Math.PI / 2.8, this.vehiclePitch));

    // Smoothly blend vehicle yaw towards car rotation
    this.vehicleYaw = THREE.MathUtils.lerp(this.vehicleYaw, carRotY, 0.1);

    const cosPitch = Math.cos(this.vehiclePitch);
    // Behind car (opposite to car forward direction)
    const offsetX = Math.sin(this.vehicleYaw) * cosPitch * this.vehicleDistance;
    const offsetY = Math.sin(this.vehiclePitch) * this.vehicleDistance + 1.2;
    const offsetZ = Math.cos(this.vehicleYaw) * cosPitch * this.vehicleDistance;

    const desiredPos = new THREE.Vector3(
      carPos.x - Math.sin(this.vehicleYaw) * cosPitch * this.vehicleDistance,
      carPos.y + offsetY,
      carPos.z - Math.cos(this.vehicleYaw) * cosPitch * this.vehicleDistance
    );

    if (desiredPos.y < 0.8) desiredPos.y = 0.8;

    const carTarget = new THREE.Vector3(carPos.x, carPos.y + 1.2, carPos.z);

    this.currentPosition.lerp(desiredPos, 0.16);
    this.currentTarget.lerp(carTarget, 0.18);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);

    // Dynamic FOV for high speed sensation (65 to 82)
    const targetFov = 65 + Math.min(18, (Math.abs(carSpeed) / (vehicle.maxSpeed || 40)) * 18);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.1);
    this.camera.updateProjectionMatrix();
  }

  updateCasinoCamera(delta) {
    this.currentPosition.lerp(this.tableCameraPos, 0.12);
    this.currentTarget.lerp(this.tableTarget, 0.12);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);

    if (this.camera.fov !== 55) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 55, 0.1);
      this.camera.updateProjectionMatrix();
    }
  }

  getYaw() {
    return this.yaw;
  }
}
