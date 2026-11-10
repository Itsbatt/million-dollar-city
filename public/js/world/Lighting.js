import * as THREE from '/vendor/three.module.js';

export class LightingManager {
  constructor(scene) {
    this.scene = scene;

    // Atmospheric Fog (Gentle night mist, clear downtown skyline)
    this.scene.fog = new THREE.FogExp2(0x0e172a, 0.0016);

    // Sky / Background Color (Cinematic Deep Dusk / Metropolis Night)
    this.scene.background = new THREE.Color(0x0a1120);

    // Hemisphere Light (Sky ambient + warm ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0x769bc9, 0x222a38, 1.8);
    this.scene.add(this.hemiLight);

    // Ambient Light (Soft city night fill)
    this.ambientLight = new THREE.AmbientLight(0x384869, 1.4);
    this.scene.add(this.ambientLight);

    // Main Directional Moon / Skylight
    this.sunLight = new THREE.DirectionalLight(0xa5c2ff, 2.2);
    this.sunLight.position.set(70, 130, 80);
    this.sunLight.castShadow = window.__MDC_GRAPHICS_PRESET?.shadows === true;

    // Shadow Map Tuning: 1024x1024 provides crisp PCF shadows when enabled
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 350;

    const shadowDist = 120;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.sunLight.shadow.bias = -0.0004;

    this.scene.add(this.sunLight);

    // Secondary City Rim / Fill Light (Warm sodium bounce from opposite quadrant)
    this.fillLight = new THREE.DirectionalLight(0xffdfa8, 1.3);
    this.fillLight.position.set(-80, 70, -70);
    this.scene.add(this.fillLight);

    // Dynamic Night Glow Accent Lights
    this.casinoGlow = new THREE.PointLight(0xffb703, 3.5, 60, 1.2);
    this.casinoGlow.position.set(-20, 8, 35);
    this.scene.add(this.casinoGlow);

    this.time = 0;

    window.addEventListener('quality:changed', (e) => {
      this.applyQuality(e.detail);
    });
  }

  setZone(zoneName) {
    if (zoneName === 'CASINO_INTERIOR') {
      // Warm, opulent casino palace interior atmosphere
      this.scene.background.setHex(0x180f16);
      this.scene.fog.color.setHex(0x180f16);
      this.scene.fog.density = 0.0012;

      this.ambientLight.color.setHex(0xffebcc);
      this.ambientLight.intensity = 2.5;

      this.hemiLight.color.setHex(0xffdfb8);
      this.hemiLight.groundColor.setHex(0x4a121d);
      this.hemiLight.intensity = 2.2;

      this.sunLight.intensity = 0.3;
      this.sunLight.castShadow = false; // Disable expensive outdoor shadows while in interior
      this.fillLight.intensity = 0.3;
    } else if (zoneName === 'BANK_INTERIOR') {
      // Sleek marble & steel banking interior
      this.scene.background.setHex(0x0a1128);
      this.scene.fog.color.setHex(0x0a1128);
      this.scene.fog.density = 0.0008;

      this.ambientLight.color.setHex(0xdde8f5);
      this.ambientLight.intensity = 2.8;

      this.hemiLight.color.setHex(0xcfd8dc);
      this.hemiLight.groundColor.setHex(0x1a2332);
      this.hemiLight.intensity = 2.0;

      this.sunLight.intensity = 0.4;
      this.sunLight.castShadow = false;
      this.fillLight.intensity = 0.4;
    } else if (zoneName === 'ARMORY_INTERIOR') {
      // Tactical gunmetal & wood gun shop
      this.scene.background.setHex(0x141416);
      this.scene.fog.color.setHex(0x141416);
      this.scene.fog.density = 0.0008;

      this.ambientLight.color.setHex(0xffeedd);
      this.ambientLight.intensity = 2.6;

      this.hemiLight.color.setHex(0xffdfa8);
      this.hemiLight.groundColor.setHex(0x27272a);
      this.hemiLight.intensity = 2.2;

      this.sunLight.intensity = 0.4;
      this.sunLight.castShadow = false;
      this.fillLight.intensity = 0.4;
    } else if (zoneName === 'PENTHOUSE_CORRIDOR' || zoneName === 'PRESIDENTIAL_SUITE') {
      // Warm luxury gold & mahogany penthouse ambiance
      this.scene.background.setHex(0x120a10);
      this.scene.fog.color.setHex(0x120a10);
      this.scene.fog.density = 0.0007;

      this.ambientLight.color.setHex(0xffeedb);
      this.ambientLight.intensity = 2.8;

      this.hemiLight.color.setHex(0xffdfa8);
      this.hemiLight.groundColor.setHex(0x3a1018);
      this.hemiLight.intensity = 2.4;

      this.sunLight.intensity = 0.3;
      this.sunLight.castShadow = false;
      this.fillLight.intensity = 0.3;
    } else {
      // Metropolis outdoor night skyline
      this.scene.background.setHex(0x0a1120);
      this.scene.fog.color.setHex(0x0e172a);
      this.scene.fog.density = 0.0016;

      this.ambientLight.color.setHex(0x384869);
      this.ambientLight.intensity = 1.4;

      this.hemiLight.color.setHex(0x769bc9);
      this.hemiLight.groundColor.setHex(0x222a38);
      this.hemiLight.intensity = 1.8;

      this.sunLight.intensity = 2.2;
      this.sunLight.castShadow = window.__MDC_GRAPHICS_PRESET?.shadows === true;
      this.fillLight.intensity = 1.3;
    }
  }

  applyQuality(preset) {
    if (!preset) return;
    this.sunLight.castShadow = !!preset.shadows;
    if (preset.id === 'VERY_LOW') {
      this.fillLight.visible = false;
    } else {
      this.fillLight.visible = true;
    }
    if (preset.fogDensityMultiplier && this.scene.fog) {
      this.scene.fog.density = 0.0016 * preset.fogDensityMultiplier;
    }
  }

  update(delta, neonSigns = []) {
    this.time += delta;

    // Throttle material emissive updates to eliminate GPU uniform buffer re-upload thrashing
    if (!this._lastNeonUpdate || this.time - this._lastNeonUpdate > 0.075) {
      this._lastNeonUpdate = this.time;
      const pulse = 1.8 + Math.sin(this.time * 4) * 0.4;
      for (let i = 0; i < neonSigns.length; i++) {
        const sign = neonSigns[i];
        if (sign && sign.material && sign.material.emissiveIntensity !== undefined) {
          sign.material.emissiveIntensity = pulse;
        }
      }
      // Casino golden marquee glow pulse
      this.casinoGlow.intensity = 2.8 + Math.sin(this.time * 2.5) * 0.8;
    }
  }
}
