// QualitySettings.js - Adaptive High-Performance Graphics Scaler for Million Dollar City

export const QUALITY_PRESETS = {
  VERY_LOW: {
    id: 'VERY_LOW',
    name: 'Escolar 60 FPS (i5 Clase / Intel HD)',
    shortLabel: '60 FPS CLASE',
    pixelRatio: 0.82,
    shadows: false,
    shadowMapSize: 512,
    farClip: 240,
    fogDensityMultiplier: 1.4,
    pedestriansMax: 12,
    particlesMax: 20,
    spotlights: false,
    ambientOcclusion: false
  },
  LOW: {
    id: 'LOW',
    name: 'Bajo (Fluido en Portátiles e Integradas)',
    shortLabel: 'BAJO',
    pixelRatio: 0.92,
    shadows: false,
    shadowMapSize: 512,
    farClip: 320,
    fogDensityMultiplier: 1.2,
    pedestriansMax: 16,
    particlesMax: 30,
    spotlights: false,
    ambientOcclusion: false
  },
  MEDIUM: {
    id: 'MEDIUM',
    name: 'Medio (60 FPS Estable / Recomendado)',
    shortLabel: 'MEDIO',
    pixelRatio: 1.0,
    shadows: false, // Shadows off by default for guaranteed 60 FPS on all school PCs
    shadowMapSize: 1024,
    farClip: 420,
    fogDensityMultiplier: 1.0,
    pedestriansMax: 22,
    particlesMax: 45,
    spotlights: false,
    ambientOcclusion: false
  },
  HIGH: {
    id: 'HIGH',
    name: 'Alto (GPU Dedicada NVIDIA / AMD)',
    shortLabel: 'ALTO',
    pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
    shadows: true,
    shadowMapSize: 1024,
    farClip: 550,
    fogDensityMultiplier: 0.8,
    pedestriansMax: 30,
    particlesMax: 70,
    spotlights: true,
    ambientOcclusion: true
  }
};

export class QualitySettings {
  constructor(rendererEngine) {
    this.engine = rendererEngine;
    const saved = localStorage.getItem('mdc_graphics_preset');
    
    if (saved && QUALITY_PRESETS[saved]) {
      this.currentPresetKey = saved;
    } else {
      this.currentPresetKey = QualitySettings.detectBestPreset();
    }
    
    this.current = QUALITY_PRESETS[this.currentPresetKey];
  }

  static detectBestPreset() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
          console.log(`[QualitySettings] GPU Detectada: "${renderer}"`);
          // Intel HD 2500 / 3000 / 4000 (i3/i5 2nd/3rd gen), UHD 730/770 (13th gen), Iris, Mesa, SwiftShader
          if (
            renderer.includes('intel') ||
            renderer.includes('hd graphics') ||
            renderer.includes('uhd') ||
            renderer.includes('iris') ||
            renderer.includes('basic') ||
            renderer.includes('mesa') ||
            renderer.includes('llvmpipe')
          ) {
            console.log('[QualitySettings] GPU Integrada de clase detectada: Aplicando modo Escolar 60 FPS automáticamente.');
            return 'VERY_LOW';
          }
          if (renderer.includes('nvidia') || renderer.includes('geforce') || renderer.includes('rtx') || renderer.includes('radeon')) {
            return 'MEDIUM';
          }
        }
      }
    } catch(e) {
      console.warn('[QualitySettings] No se pudo interrogar al hardware WebGL:', e);
    }
    // Fallback safe default: VERY_LOW for classroom stability
    return 'VERY_LOW';
  }

  getPreset() {
    return this.current;
  }

  setPreset(presetKey) {
    if (!QUALITY_PRESETS[presetKey]) return;
    this.currentPresetKey = presetKey;
    this.current = QUALITY_PRESETS[presetKey];
    localStorage.setItem('mdc_graphics_preset', presetKey);

    if (this.engine) {
      this.engine.applyQualityPreset(this.current);
    }

    window.dispatchEvent(new CustomEvent('quality:changed', { detail: this.current }));
  }

  cycleNext() {
    const order = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH'];
    const idx = order.indexOf(this.currentPresetKey);
    const nextKey = order[(idx + 1) % order.length];
    this.setPreset(nextKey);
    return this.current;
  }
}
