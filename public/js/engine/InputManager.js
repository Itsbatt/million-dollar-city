export class InputManager {
  constructor(domElement) {
    this.domElement = domElement || document.body;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      interact: false,
      vehicle: false,
      phone: false,
      inventory: false,
      reload: false,
      horn: false,
      radio: false,
      weapon1: false,
      weapon2: false,
      weapon3: false,
      weapon4: false
    };

    this.mouse = {
      isLocked: false,
      deltaX: 0,
      deltaY: 0,
      isLeftDown: false,
      isRightDown: false
    };

    this.interactionTriggered = false;
    this.vehicleTriggered = false;
    this.phoneTriggered = false;
    this.tabTriggered = false;
    this.hornTriggered = false;
    this.radioTriggered = false;

    this.initEvents();
  }

  initEvents() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Pointer Lock & Mouse Look Request
    const requestLock = (e) => {
      // Don't capture when typing in inputs or interacting with open modals
      if (document.body.classList.contains('ui-active')) return;
      if (e?.target && e.target.closest('.game-modal.visible, input, textarea, button, .lan-lobby-panel')) return;

      if (!this.mouse.isLocked) {
        try {
          (this.domElement.requestPointerLock || document.body.requestPointerLock)?.call(this.domElement);
        } catch (err) {}
      }
    };

    this.domElement.addEventListener('click', requestLock);
    this.domElement.addEventListener('mousedown', requestLock);
    window.addEventListener('click', requestLock);

    const updateLockState = () => {
      this.mouse.isLocked = !!document.pointerLockElement;
    };
    document.addEventListener('pointerlockchange', updateLockState);
    document.addEventListener('mozpointerlockchange', updateLockState);

    // Mouse movement accumulation with fallback drag-look
    let lastClientX = null;
    let lastClientY = null;

    document.addEventListener('mousemove', (e) => {
      if (this.mouse.isLocked) {
        const dx = e.movementX !== undefined ? e.movementX : (lastClientX !== null ? e.clientX - lastClientX : 0);
        const dy = e.movementY !== undefined ? e.movementY : (lastClientY !== null ? e.clientY - lastClientY : 0);
        this.mouse.deltaX += dx;
        this.mouse.deltaY += dy;
      } else if (this.mouse.isLeftDown || this.mouse.isRightDown) {
        // Fallback smooth drag-look if pointerlock is restricted by policy
        if (lastClientX !== null && lastClientY !== null) {
          this.mouse.deltaX += (e.clientX - lastClientX);
          this.mouse.deltaY += (e.clientY - lastClientY);
        }
      }
      lastClientX = e.clientX;
      lastClientY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (document.body.classList.contains('ui-active') || !document.pointerLockElement) return;
      if (e.target && e.target.closest && e.target.closest('.game-modal, button, input, select, textarea, .lan-lobby-panel, #phone-container')) return;
      if (e.button === 0) this.mouse.isLeftDown = true;
      if (e.button === 2) this.mouse.isRightDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.isLeftDown = false;
      if (e.button === 2) this.mouse.isRightDown = false;
    });

    // Reset all pressed inputs when tab/window loses focus
    window.addEventListener('blur', () => {
      for (const k in this.keys) {
        this.keys[k] = false;
      }
      this.mouse.deltaX = 0;
      this.mouse.deltaY = 0;
      this.mouse.isLeftDown = false;
      this.mouse.isRightDown = false;
      lastClientX = null;
      lastClientY = null;
    });

    // Prevent context menu on right click (ADS aim)
    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('input, textarea')) {
        e.preventDefault();
      }
    });
  }

  onKeyDown(e) {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return; // typing in chat or input
    }

    const code = e.code;
    const key = (e.key || '').toLowerCase();

    // WASD & Arrow Keys
    if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
      this.keys.forward = true;
    }
    if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') {
      this.keys.backward = true;
    }
    if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') {
      this.keys.left = true;
    }
    if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') {
      this.keys.right = true;
    }

    if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
      this.keys.sprint = true;
    }
    if (code === 'Space' || key === ' ') {
      this.keys.jump = true;
    }
    if (code === 'KeyE' || key === 'e') {
      this.keys.interact = true;
      this.interactionTriggered = true;
    }
    if (code === 'KeyF' || key === 'f') {
      this.keys.vehicle = true;
      this.vehicleTriggered = true;
    }
    if (code === 'KeyM' || code === 'KeyP' || key === 'm' || key === 'p') {
      this.keys.phone = true;
      this.phoneTriggered = true;
    }
    if (code === 'Tab' || key === 'tab') {
      e.preventDefault();
      this.keys.inventory = true;
      this.tabTriggered = true;
    }
    if (code === 'KeyR' || key === 'r') {
      this.keys.reload = true;
    }
    if (code === 'KeyH' || key === 'h') {
      this.keys.horn = true;
      this.hornTriggered = true;
    }
    if (code === 'KeyQ' || key === 'q') {
      this.keys.radio = true;
      this.radioTriggered = true;
    }
    if (code === 'Digit1' || key === '1') {
      this.keys.weapon1 = true;
    }
    if (code === 'Digit2' || key === '2') {
      this.keys.weapon2 = true;
    }
    if (code === 'Digit3' || key === '3') {
      this.keys.weapon3 = true;
    }
    if (code === 'Digit4' || key === '4') {
      this.keys.weapon4 = true;
    }
  }

  onKeyUp(e) {
    const code = e.code;
    const key = (e.key || '').toLowerCase();

    // WASD & Arrow Keys
    if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
      this.keys.forward = false;
    }
    if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') {
      this.keys.backward = false;
    }
    if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') {
      this.keys.left = false;
    }
    if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') {
      this.keys.right = false;
    }

    if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
      this.keys.sprint = false;
    }
    if (code === 'Space' || key === ' ') {
      this.keys.jump = false;
    }
    if (code === 'KeyE' || key === 'e') {
      this.keys.interact = false;
    }
    if (code === 'KeyF' || key === 'f') {
      this.keys.vehicle = false;
    }
    if (code === 'KeyM' || code === 'KeyP' || key === 'm' || key === 'p') {
      this.keys.phone = false;
    }
    if (code === 'Tab' || key === 'tab') {
      this.keys.inventory = false;
    }
    if (code === 'KeyR' || key === 'r') {
      this.keys.reload = false;
    }
    if (code === 'KeyH' || key === 'h') {
      this.keys.horn = false;
    }
    if (code === 'KeyQ' || key === 'q') {
      this.keys.radio = false;
    }
    if (code === 'Digit1' || key === '1') {
      this.keys.weapon1 = false;
    }
    if (code === 'Digit2' || key === '2') {
      this.keys.weapon2 = false;
    }
    if (code === 'Digit3' || key === '3') {
      this.keys.weapon3 = false;
    }
    if (code === 'Digit4' || key === '4') {
      this.keys.weapon4 = false;
    }
  }

  // Consume single-frame pulses
  consumeInteract() {
    const val = this.interactionTriggered;
    this.interactionTriggered = false;
    return val;
  }

  consumeVehicle() {
    const val = this.vehicleTriggered;
    this.vehicleTriggered = false;
    return val;
  }

  consumePhone() {
    const val = this.phoneTriggered;
    this.phoneTriggered = false;
    return val;
  }

  consumeInventory() {
    const val = this.tabTriggered;
    this.tabTriggered = false;
    return val;
  }

  consumeHorn() {
    const val = this.hornTriggered;
    this.hornTriggered = false;
    return val;
  }

  consumeRadio() {
    const val = this.radioTriggered;
    this.radioTriggered = false;
    return val;
  }

  getAndResetMouseDelta() {
    const dX = this.mouse.deltaX;
    const dY = this.mouse.deltaY;
    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    return { x: dX, y: dY };
  }
}
