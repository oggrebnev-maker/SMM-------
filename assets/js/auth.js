/**
 * auth.js — JWT авторизация
 * login / logout / register / verifyEmail / восстановление сессии
 */
const Auth = (() => {
  const TOKEN_KEY = 'sp_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }
  function isLoggedIn() {
    return !!getToken();
  }

  async function login(email, password) {
    const res = await API.post('/auth/login', { email, password });
    const token = res.data?.token || res.token;
    const user  = res.data?.user || res.data || res.user;
    setToken(token);
    State.set('user', user);
    return user;
  }

  async function register(name, email, password) {
    const res = await API.post('/auth/register', { name, email, password });
    return res;
  }

  async function verifyEmail(token) {
    const res = await API.post('/auth/verify-email', { token });
    const jwt  = res.data?.token || res.token;
    const user = res.data?.user || res.data || res.user;
    setToken(jwt);
    State.set('user', user);
    return user;
  }

  async function logout() {
    try {
      await API.post('/auth/logout');
    } catch {}
    removeToken();
    localStorage.removeItem('sp_project_id');
    // Закрываем панель профиля
    const panel = document.getElementById('profile-panel');
    const overlay = document.getElementById('profile-panel-overlay');
    if (panel) { panel.classList.remove('profile-panel--open'); panel.classList.add('hidden'); }
    if (overlay) overlay.classList.add('hidden');
    State.set('user', null);
    State.setProject(null);
    App.showAuth();
  }

  async function restoreSession() {
    if (!isLoggedIn()) return null;
    try {
      const res = await API.get('/auth/me');
      const user = res.data?.user || res.data || res.user;
      State.set('user', user);
      return user;
    } catch {
      removeToken();
      return null;
    }
  }

  return { login, logout, register, verifyEmail, restoreSession, isLoggedIn, getToken };
})();

window.Auth = Auth;
