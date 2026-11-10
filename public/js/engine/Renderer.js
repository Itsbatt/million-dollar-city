import * as THREE from '/vendor/three.module.js';
import { QualitySettings } from './QualitySettings.js';

export class EngineRenderer {
  constructor(container) {
    this.container = container || document.getElementById('game-container') || document.body;
    this.canvas = null;
    this.renderer = null;
    this.quality = new QualitySettings(this);

    this.initWebGL();
  }

  initWebGL() {
    let created = false;
    const preset = this.quality.getPreset();

    // Strategy 1: Ultra High Performance WebGL2 context
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: preset.shadows, // Antialias only on HIGH presets to prevent GPU fill-rate stalls on Intel HD
        powerPreference: 'high-performance',
        precision: preset.id === 'VERY_LOW' ? 'mediump' : 'highp',
        preserveDrawingBuffer: false,
        stencil: false // Disable unused 8-bit stencil buffer to save 25% VRAM bandwidth
      });
      created = true;
    } catch (e1) {
      console.warn('[Renderer] WebGL Standard init falló, probando configuración de bajo consumo...', e1);
    }

    // Strategy 2: Ultra low-power fallback
    if (!created) {
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: false,
          powerPreference: 'low-power',
          precision: 'mediump',
          stencil: false
        });
        created = true;
      } catch (e2) {
        console.error('[Renderer] Error fatal: WebGL no disponible en el navegador:', e2);
        this.displayWebGLErrorUI();
        throw new Error('WebGL Context Creation Failed. Hardware acceleration may be disabled in browser.');
      }
    }

    this.canvas = this.renderer.domElement;
    this.canvas.id = 'webgl-canvas';
    this.container.appendChild(this.canvas);

    // Initial resize & quality setup
    this.applyQualityPreset(preset);

    // Cinematic Tone Mapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  applyQualityPreset(preset) {
    if (!this.renderer) return;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(preset.pixelRatio);

    this.renderer.shadowMap.enabled = preset.shadows;
    this.renderer.shadowMap.autoUpdate = preset.shadows;
    if (preset.shadows) {
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    console.log(`[Renderer] Calidad gráfica aplicada: ${preset.name} (PixelRatio: ${preset.pixelRatio}, Shadows: ${preset.shadows})`);
  }

  onWindowResize() {
    if (!this.renderer) return;
    const preset = this.quality.getPreset();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(preset.pixelRatio);
  }

  render(scene, camera) {
    if (this.renderer && scene && camera) {
      this.renderer.render(scene, camera);
    }
  }

  displayWebGLErrorUI() {
    const errorBox = document.createElement('div');
    errorBox.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: #090a0f; color: #fff; z-index: 99999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: sans-serif; text-align: center; padding: 24px; box-sizing: border-box;
    `;
    errorBox.innerHTML = `
      <div style="font-size: 54px; margin-bottom: 16px;">⚠️</div>
      <h1 style="color: #ff2a4d; font-size: 26px; margin-bottom: 12px;">WebGL no disponible en tu navegador</h1>
      <p style="color: #aaa; max-width: 580px; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Million Dollar City requiere aceleración gráfica 3D WebGL.<br>
        En <b>Brave</b> o <b>Chrome</b>, asegúrate de activar:<br>
        <i>Configuración ➔ Sistema ➔ "Usar aceleración de gráficos cuando esté disponible"</i>.<br>
        Si tienes Brave Shields activado, permite la huella digital para <code>localhost</code>.
      </p>
      <button onclick="window.location.reload()" style="
        background: #00f0ff; color: #000; border: none; padding: 12px 28px;
        font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 16px;
      ">REINTENTAR CARGA</button>
    `;
    document.body.appendChild(errorBox);
  }
}
