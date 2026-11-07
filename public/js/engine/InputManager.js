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

    // Pointer Lock & Mouse Look
    this.domElement.addEventListener('click', () => {
      // If modal or UI open, don't lock
      if (document.body.classList.contains('ui-active')) return;
      if (!this.mouse.isLocked && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouse.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.mouse.isLocked) {
        this.mouse.deltaX = e.movementX || 0;
        this.mouse.deltaY = e.movementY || 0;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.isLeftDown = true;
      if (e.button === 2) this.mouse.isRightDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.isLeftDown = false;
      if (e.button === 2) this.mouse.isRightDown = false;
    });

    // Prevent context menu on right click (ADS aim)
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  onKeyDown(e) {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return; // typing in chat or input
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'Space':
        this.keys.jump = true;
        break;
      case 'KeyE':
        this.keys.interact = true;
        this.interactionTriggered = true;
        break;
      case 'KeyF':
        this.keys.vehicle = true;
        this.vehicleTriggered = true;
        break;
      case 'KeyM':
      case 'KeyP':
        this.keys.phone = true;
        this.phoneTriggered = true;
        break;
      case 'Tab':
        e.preventDefault();
        this.keys.inventory = true;
        this.tabTriggered = true;
        break;
      case 'KeyR':
        this.keys.reload = true;
        break;
      case 'KeyH':
        this.keys.horn = true;
        this.hornTriggered = true;
        break;
      case 'KeyQ':
        this.keys.radio = true;
        this.radioTriggered = true;
        break;
      case 'Digit1':
        this.keys.weapon1 = true;
        break;
      case 'Digit2':
        this.keys.weapon2 = true;
        break;
      case 'Digit3':
        this.keys.weapon3 = true;
        break;
      case 'Digit4':
        this.keys.weapon4 = true;
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
      case 'KeyE':
        this.keys.interact = false;
        break;
      case 'KeyF':
        this.keys.vehicle = false;
        break;
      case 'KeyM':
      case 'KeyP':
        this.keys.phone = false;
        break;
      case 'Tab':
        this.keys.inventory = false;
        break;
      case 'KeyR':
        this.keys.reload = false;
        break;
      case 'KeyH':
        this.keys.horn = false;
        break;
      case 'KeyQ':
        this.keys.radio = false;
        break;
      case 'Digit1':
        this.keys.weapon1 = false;
        break;
      case 'Digit2':
        this.keys.weapon2 = false;
        break;
      case 'Digit3':
        this.keys.weapon3 = false;
        break;
      case 'Digit4':
        this.keys.weapon4 = false;
        break;
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
