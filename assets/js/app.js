/**
 * app.js — Роутер и инициализация SPA
 */

const App = (() => {

  const STUB_TITLES = {
    '/projects/create': 'Создать проект', '/projects/settings': 'Настройки проекта', '/projects/access': 'Доступы',
    '/team': 'Команда', '/team/roles': 'Роли', '/team/invitations': 'Приглашения', '/team/access': 'Права доступа',
    '/content-plan': 'Контент-план', '/posts': 'Все посты', '/drafts': 'Черновики',
    '/content/variants': 'Варианты постов', '/content/media': 'Медиавложения',
    '/publications/queue': 'Очередь публикаций', '/publications/scheduled': 'Запланированные', '/publications/published': 'Опубликованные',
    '/publications/errors': 'Ошибки публикации', '/publications/log': 'Журнал публикаций',
    '/integrations/channels': 'Каналы и сообщества',
    '/ai/audience': 'Анализ ЦА', '/ai/content-plan': 'Генерация контент-плана', '/ai/posts': 'Генерация постов',
    '/ai/adapt': 'Адаптация под площадки', '/ai/tools': 'AI-инструменты',
    '/templates/images': 'Шаблоны изображений', '/templates/media': 'Медиафайлы', '/templates/editor': 'Редактор визуалов', '/templates/brand': 'Бренд-заготовки',
    '/analytics': 'Общая аналитика', '/analytics/projects': 'По проектам', '/analytics/platforms': 'По площадкам', '/analytics/publications': 'По публикациям', '/analytics/reports': 'Отчёты',
    '/billing': 'Тариф', '/billing/subscription': 'Подписка', '/billing/limits': 'Лимиты', '/billing/history': 'История оплат',
    '/settings/account': 'Настройки аккаунта', '/settings/notifications': 'Уведомления', '/settings/timezone': 'Часовой пояс',
    '/audience': 'Аудитория', '/stats': 'Статистика', '/calendar': 'Календарь',
  };
  function stubRoute(path) {
    const title = STUB_TITLES[path] || path.split('/').filter(Boolean).pop() || 'Раздел';
    return () => renderStub(title, 'В разработке');
  }

  const ROUTES = {
    '/dashboard':       () => PageDashboard.render(),
    '/projects':        () => PageProjects.render(),
    '/content-plan':    stubRoute('/content-plan'),
    '/posts':           async () => { await PagePosts.render(); },
    '/drafts':          stubRoute('/drafts'),
    '/calendar':        stubRoute('/calendar'),
    '/audience':        stubRoute('/audience'),
    '/stats':           stubRoute('/stats'),
    '/social-accounts': () => PageSocialAccounts.render(),
    '/publish-schedule': async (container) => { await PagePublishSchedule.init(container); },
    '/profile':         () => PageProfile.render(),
    '/system-settings': () => PageSystemSettings.render(),
    '/projects/create': async () => { await PageProjects.render(); }, '/projects/settings': stubRoute('/projects/settings'), '/projects/access': stubRoute('/projects/access'),
    '/team': stubRoute('/team'), '/team/roles': stubRoute('/team/roles'), '/team/invitations': stubRoute('/team/invitations'), '/team/access': stubRoute('/team/access'),
    '/content/variants': stubRoute('/content/variants'), '/content/media': stubRoute('/content/media'),
    '/publications/queue': stubRoute('/publications/queue'), '/publications/scheduled': stubRoute('/publications/scheduled'), '/publications/published': stubRoute('/publications/published'),
    '/publications/errors': stubRoute('/publications/errors'), '/publications/log': stubRoute('/publications/log'),
    '/integrations/channels': stubRoute('/integrations/channels'),
    '/ai/audience': stubRoute('/ai/audience'), '/ai/content-plan': stubRoute('/ai/content-plan'), '/ai/posts': stubRoute('/ai/posts'), '/ai/adapt': stubRoute('/ai/adapt'), '/ai/tools': stubRoute('/ai/tools'),
    '/templates/images': stubRoute('/templates/images'), '/templates/media': stubRoute('/templates/media'), '/templates/editor': stubRoute('/templates/editor'), '/templates/brand': stubRoute('/templates/brand'),
    '/analytics': stubRoute('/analytics'), '/analytics/projects': stubRoute('/analytics/projects'), '/analytics/platforms': stubRoute('/analytics/platforms'), '/analytics/publications': stubRoute('/analytics/publications'), '/analytics/reports': stubRoute('/analytics/reports'),
    '/billing': stubRoute('/billing'), '/billing/subscription': stubRoute('/billing/subscription'), '/billing/limits': stubRoute('/billing/limits'), '/billing/history': stubRoute('/billing/history'),
    '/settings/account': stubRoute('/settings/account'), '/settings/notifications': stubRoute('/settings/notifications'), '/settings/timezone': stubRoute('/settings/timezone'),
  };

  const DEFAULT_ROUTE = '/dashboard';

  function $(id) { return document.getElementById(id); }

  function renderStub(title, stage) {
    $('page-container').innerHTML = `
      <div class="page-stub">
        <div class="stub-badge">${stage}</div>
        <h1 class="stub-title">${title}</h1>
        <p class="stub-desc">Раздел будет доступен в следующем этапе разработки.</p>
      </div>
    `;
  }

  // ─── Auth screens ──────────────────────────────────────────────────

  function showLoader() {
    $('app-loader').classList.remove('hidden');
    $('auth-screen').classList.add('hidden');
    $('verify-screen').classList.add('hidden');
    $('app-shell').classList.add('hidden');
  }

  function hideLoader() {
    $('app-loader').classList.add('hidden');
  }

  function showAuth() {
    hideLoader();
    $('auth-screen').classList.remove('hidden');
    $('verify-screen').classList.add('hidden');
    $('app-shell').classList.add('hidden');
    showLoginPanel();
  }

  function showVerify() {
    hideLoader();
    $('auth-screen').classList.add('hidden');
    $('verify-screen').classList.remove('hidden');
    $('app-shell').classList.add('hidden');
  }

  function showShell() {
    hideLoader();
    $('auth-screen').classList.add('hidden');
    $('verify-screen').classList.add('hidden');
    $('app-shell').classList.remove('hidden');
  }

  function showLoginPanel() {
    $('login-panel').classList.remove('hidden');
    $('register-panel').classList.add('hidden');
  }

  function showRegisterPanel() {
    $('login-panel').classList.add('hidden');
    $('register-panel').classList.remove('hidden');
  }

  // ─── Sidebar ───────────────────────────────────────────────────────

  function updateSidebarUser(user) {
    if (!user) return;
    $('user-name').textContent = user.name || user.email;
    $('user-role').textContent = user.role === 'admin' ? 'Администратор'
      : user.role === 'editor' ? 'Редактор' : 'Автор';
    const avatarEl = $('user-avatar');
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatarEl.textContent = (user.name || user.email || '?')[0].toUpperCase();
    }

    const ta = document.getElementById('topbar-avatar');
    if (ta) {
      if (user.avatar) {
        ta.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        ta.textContent = (user.name || user.email || '?')[0].toUpperCase();
      }
    }
    const pa = document.getElementById('pp-avatar');
    if (pa) {
      if (user.avatar) {
        pa.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        pa.textContent = (user.name || user.email || '?')[0].toUpperCase();
      }
    }
    const ppName = document.getElementById('pp-name');
    if (ppName) ppName.textContent = user.name || '—';
    const ppEmail = document.getElementById('pp-email');
    if (ppEmail) ppEmail.textContent = user.email || '—';
    const adminItem = document.getElementById('pp-link-system');
    if (adminItem) {
      if (user.role === 'admin') adminItem.classList.remove('hidden');
      else adminItem.classList.add('hidden');
    }
  }

  function updateSidebarProject(project) {
    if (project) {
      $('sidebar-project-name').textContent = project.name;
      $('sidebar-project-dot').style.background = project.color || '#6366f1';
    } else {
      $('sidebar-project-name').textContent = 'Не выбран';
      $('sidebar-project-dot').style.background = '#374151';
    }
  }

  function setActiveNav(path) {
    const hash = '#' + path;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === hash);
    });
    document.querySelectorAll('.nav-accordion').forEach(acc => {
      const hasActive = acc.querySelector('.nav-item.active');
      acc.classList.toggle('open', !!hasActive);
      const header = acc.querySelector('.nav-accordion-header');
      if (header) header.setAttribute('aria-expanded', !!hasActive);
    });
    // При загрузке на дашборде по умолчанию раскрыт раздел «Контент»
    if (path === '/dashboard') {
      const contentAcc = document.querySelector('.nav-accordion[data-section="content"]');
      if (contentAcc) {
        contentAcc.classList.add('open');
        const h = contentAcc.querySelector('.nav-accordion-header');
        if (h) h.setAttribute('aria-expanded', 'true');
      }
    }
  }

  function initAccordion() {
    document.querySelectorAll('.nav-accordion-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const acc = header.closest('.nav-accordion');
        if (!acc) return;
        const isOpening = !acc.classList.contains('open');
        document.querySelectorAll('.nav-accordion').forEach(other => {
          other.classList.remove('open');
          const h = other.querySelector('.nav-accordion-header');
          if (h) h.setAttribute('aria-expanded', 'false');
        });
        if (isOpening) {
          acc.classList.add('open');
          const h = acc.querySelector('.nav-accordion-header');
          if (h) h.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // ─── Router ────────────────────────────────────────────────────────

  function getRoute() {
    const hash = location.hash.replace('#', '');
    const path = hash.split('?')[0];
    return path || DEFAULT_ROUTE;
  }

  function getQueryParams() {
    const hash = location.hash.replace('#', '');
    const parts = hash.split('?');
    if (parts.length < 2) return {};
    return Object.fromEntries(new URLSearchParams(parts[1]));
  }

  function navigate(path) {
    location.hash = '#' + path;
  }

  async function handleRoute() {
    const path = getRoute();
    const handler = ROUTES[path];
    setActiveNav(path);
    if (handler) {
      const container = document.getElementById('page-container');
      container.classList.toggle('posts-layout', path === '/posts');
      const result = handler(container);
      if (result && typeof result.then === 'function') await result;
    } else {
      navigate(DEFAULT_ROUTE);
    }
  }

  // ─── Login form ────────────────────────────────────────────────────

  function initLoginForm() {
    const form    = $('login-form');
    const errEl   = $('login-error');
    const btnText = form.querySelector('.btn-text');
    const btnLoad = form.querySelector('.btn-loader');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = $('login-email').value.trim();
      const password = $('login-password').value;

      if (!email || !password) {
        showError('Введите email и пароль');
        return;
      }

      setLoading(true);
      errEl.classList.add('hidden');

      try {
        const user = await Auth.login(email, password);
        await afterLogin(user);
      } catch (err) {
        showError(err.message || 'Ошибка входа');
      } finally {
        setLoading(false);
      }
    });

    function showError(msg) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
    function setLoading(on) {
      btnText.classList.toggle('hidden', on);
      btnLoad.classList.toggle('hidden', !on);
      $('login-btn').disabled = on;
    }
  }

  // ─── Register form ─────────────────────────────────────────────────

  function initRegisterForm() {
    const form    = $('register-form');
    const errEl   = $('register-error');
    const btnText = form.querySelector('.btn-text');
    const btnLoad = form.querySelector('.btn-loader');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name     = $('register-name').value.trim();
      const email    = $('register-email').value.trim();
      const password = $('register-password').value;

      if (!name || !email || !password) {
        showError('Заполните все поля');
        return;
      }
      if (password.length < 8) {
        showError('Пароль должен содержать минимум 8 символов');
        return;
      }

      setLoading(true);
      errEl.classList.add('hidden');

      try {
        await Auth.register(name, email, password);
        localStorage.setItem('sp_pending_email', email);
        showVerify();
      } catch (err) {
        showError(err.message || 'Ошибка регистрации');
      } finally {
        setLoading(false);
      }
    });

    function showError(msg) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
    function setLoading(on) {
      btnText.classList.toggle('hidden', on);
      btnLoad.classList.toggle('hidden', !on);
      $('register-btn').disabled = on;
    }
  }

  // ─── Verify screen ─────────────────────────────────────────────────

  function initVerifyScreen() {
    $('back-to-login').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('sp_pending_email');
      showAuth();
    });

    $('resend-btn').addEventListener('click', async () => {
      const email = localStorage.getItem('sp_pending_email');
      if (!email) { showAuth(); return; }
      try {
        await API.post('/auth/resend-verification', { email });
        toast('Письмо отправлено повторно', 'success');
      } catch (err) {
        $('verify-error').textContent = err.message || 'Ошибка отправки';
        $('verify-error').classList.remove('hidden');
      }
    });
  }

  // ─── Post-login ────────────────────────────────────────────────────

  async function afterLogin(user) {
    updateSidebarUser(user);
    showShell();
    const savedId = State.getSavedProjectId();
    if (savedId && savedId !== 'undefined' && savedId !== 'null') {
      try {
        const res = await API.get(`/projects/${savedId}`);
        const proj = (res.data && res.data.project) ? res.data.project : null;
        if (proj) State.setProject(proj);
        else State.setProject(null);
      } catch { State.setProject(null); }
    }
    await handleRoute();
  }

  // ─── OAuth: вход через соцсеть (токен в URL после редиректа) ───────

  async function handleOAuthLogin(token) {
    localStorage.setItem('sp_token', token);
    history.replaceState(null, '', location.pathname + '#/dashboard');
    try {
      const res  = await API.get('/auth/me');
      const user = res.data;
      State.set('user', user);
      await afterLogin(user);
    } catch (err) {
      localStorage.removeItem('sp_token');
      showAuth();
      setTimeout(() => toast('Ошибка входа через соцсеть', 'error'), 100);
    }
  }

  // ─── Публичные настройки ───────────────────────────────────────────

  async function applyPublicSettings() {
    try {
      const ps = await API.get('/system-settings/public');
      const s = (ps.data && ps.data.settings) || ps.settings || {};
      if (s.site_name) {
        document.title = s.site_name;
        document.querySelectorAll('.brand-name').forEach(el => el.textContent = s.site_name);
      }
      if (s.favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = s.favicon + '?v=' + Date.now();
      }
      const regSwitch = document.getElementById('auth-register-switch');
      if (regSwitch) regSwitch.style.display = (s.registration_enabled == '1') ? '' : 'none';
    } catch(e) {}
  }

  // ─── Init ──────────────────────────────────────────────────────────

  async function init() {
    showLoader();

    await applyPublicSettings();

    State.on('user',    updateSidebarUser);
    State.on('project', updateSidebarProject);

    window.addEventListener('hashchange', async () => {
      const route  = getRoute();
      const params = getQueryParams();

      if (params.token && route === '/dashboard') {
        await handleOAuthLogin(params.token);
        return;
      }

      if (params.oauth === 'unlinked' && route === '/login') {
        history.replaceState(null, '', location.pathname + '#/login');
        showAuth();
        setTimeout(() => toast('Соцсеть не привязана ни к одному аккаунту', 'error'), 100);
        return;
      }
      if (params.oauth === 'error' && route === '/login') {
        showAuth();
        const msg = params.msg ? decodeURIComponent(params.msg) : 'Ошибка входа через соцсеть';
        setTimeout(() => toast(msg, 'error'), 100);
        return;
      }

      if (params.token && route === '/verify-email') {
        await handleVerifyToken(params.token);
        return;
      }

      if (Auth.isLoggedIn()) await handleRoute();
    });

    $('project-switcher').addEventListener('click', () => navigate('/projects'));

    $('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      showRegisterPanel();
    });
    $('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      showLoginPanel();
    });

    initLoginForm();
    initRegisterForm();
    initVerifyScreen();
    initVKLoginBtn();
    initAccordion();

    const route  = getRoute();
    const params = getQueryParams();

    if (params.token && route === '/dashboard') {
      await handleOAuthLogin(params.token);
      return;
    }

    if (params.oauth === 'unlinked' && route === '/login') {
      history.replaceState(null, '', location.pathname + '#/login');
      showAuth();
      setTimeout(() => toast('Соцсеть не привязана ни к одному аккаунту', 'error'), 100);
      return;
    }
    if (params.oauth === 'error' && route === '/login') {
      showAuth();
      const msg = params.msg ? decodeURIComponent(params.msg) : 'Ошибка входа через соцсеть';
      setTimeout(() => toast(msg, 'error'), 100);
      return;
    }

    if (params.token && route === '/verify-email') {
      await handleVerifyToken(params.token);
      return;
    }

    const user = await Auth.restoreSession();
    if (user) {
      await afterLogin(user);
    } else {
      showAuth();
    }
  }

  async function handleVerifyToken(token) {
    showLoader();
    try {
      const user = await Auth.verifyEmail(token);
      toast('Email подтверждён! Добро пожаловать!', 'success');
      history.replaceState(null, '', location.pathname);
      location.hash = '#/dashboard';
      await afterLogin(user);
    } catch (err) {
      showAuth();
      setTimeout(() => {
        $('login-error').textContent = err.message || 'Ссылка недействительна или истекла';
        $('login-error').classList.remove('hidden');
      }, 100);
    }
  }

  // ─── VK Login PKCE ────────────────────────────────────────────────

  function initVKLoginBtn() {
    function vkAuth(mode) {
      return async () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const codeVerifier = btoa(String.fromCharCode(...array))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuf)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        window.location.href = `/api/auth/oauth/vk?cv=${encodeURIComponent(codeVerifier)}&mode=${mode}`;
      };
    }
    const loginBtn = $('vk-login-btn');
    if (loginBtn) loginBtn.addEventListener('click', vkAuth('login'));
    const regBtn = $('vk-register-btn');
    if (regBtn) regBtn.addEventListener('click', vkAuth('register'));
  }

  // ─── Toast ─────────────────────────────────────────────────────────

  function toast(message, type = 'info') {
    const container = $('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.classList.add('toast-visible'), 10);
    setTimeout(() => {
      el.classList.remove('toast-visible');
      setTimeout(() => el.remove(), 300);
    }, 5000);
  }

  return { init, showAuth, showShell, navigate, toast, showToast: toast };

})();

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());