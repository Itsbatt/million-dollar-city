export class AuthModal {
  constructor(economyManager) {
    this.economy = economyManager;
    this.modal = document.getElementById('auth-modal');
    this.isRegisterMode = false;

    this.initEvents();
  }

  initEvents() {
    // Mode switcher (Login vs Register)
    document.getElementById('auth-switch-mode-btn')?.addEventListener('click', () => {
      this.isRegisterMode = !this.isRegisterMode;
      const title = document.getElementById('auth-modal-title');
      const submitBtn = document.getElementById('auth-submit-btn');
      const switchBtn = document.getElementById('auth-switch-mode-btn');

      if (this.isRegisterMode) {
        if (title) title.textContent = 'REGISTRO DE NUEVO CIUDADANO';
        if (submitBtn) submitBtn.textContent = 'CREAR CUENTA';
        if (switchBtn) switchBtn.textContent = '¿Ya tienes cuenta? Inicia sesión aquí';
      } else {
        if (title) title.textContent = 'INICIAR SESIÓN EN MILLION DOLLAR CITY';
        if (submitBtn) submitBtn.textContent = 'ENTRAR A LA CIUDAD';
        if (switchBtn) switchBtn.textContent = '¿No tienes cuenta? Regístrate aquí';
      }
    });

    // Form submission
    document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('auth-username-input').value.trim();
      const pass = document.getElementById('auth-password-input').value;
      const errorEl = document.getElementById('auth-error-msg');

      if (errorEl) errorEl.textContent = 'Autenticando...';

      try {
        if (this.isRegisterMode) {
          await this.economy.register(user, pass);
        } else {
          await this.economy.login(user, pass);
        }

        if (errorEl) errorEl.textContent = '';
        this.close();
        window.location.reload(); // reload to boot world with authenticated profile
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message || 'Error de autenticación';
      }
    });

    // Close button / Play as Guest
    document.getElementById('auth-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('auth-guest-btn')?.addEventListener('click', () => this.close());

    // Click backdrop to close
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('visible')) {
        this.close();
      }
    });
  }

  open() {
    if (this.modal) {
      this.modal.classList.add('visible');
      document.body.classList.add('ui-active');
      document.exitPointerLock?.();
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('visible');
      document.body.classList.remove('ui-active');
    }
  }
}
