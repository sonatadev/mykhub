import { api } from './api.js';
import { showToast } from './ui.js';

let onAuthenticated = null;
let onLoggedOut = null;

function showError(message) {
  const el = document.getElementById('auth-error');
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('auth-error').classList.add('hidden');
}

export function initAuth({ onLogin, onLogout }) {
  onAuthenticated = onLogin;
  onLoggedOut = onLogout;

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabs = document.querySelectorAll('.auth-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loginForm.classList.toggle('hidden', tab.dataset.tab !== 'login');
      registerForm.classList.toggle('hidden', tab.dataset.tab !== 'register');
      hideError();
    });
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();
    const button = loginForm.querySelector('button[type=submit]');
    button.disabled = true;

    try {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const result = await api.login(email, password);
      api.setToken(result.token);
      onAuthenticated?.({ email: result.email, settings: result.settings || {}, token: result.token });
    } catch (error) {
      showError(error.message);
    } finally {
      button.disabled = false;
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();
    const button = registerForm.querySelector('button[type=submit]');
    button.disabled = true;

    try {
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const result = await api.register(email, password);
      api.setToken(result.token);
      onAuthenticated?.({ email: result.email, settings: result.settings || {}, token: result.token });
    } catch (error) {
      showError(error.message);
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('sidebar-logout').addEventListener('click', () => {
    api.setToken(null);
    onLoggedOut?.();
    showToast('Hai effettuato il logout', 'success');
  });
}
