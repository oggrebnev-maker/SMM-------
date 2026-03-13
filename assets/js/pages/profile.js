/**
 * profile.js — Страница профиля пользователя
 */
const PageProfile = (() => {

  function render() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Профиль</h1>
      </div>
      <div class="profile-layout">

        <!-- Аватар -->
        <div class="profile-card">
          <div class="profile-avatar-section">
            <div class="profile-avatar" id="profile-avatar-preview">?</div>
            <div class="profile-avatar-right">
              <div class="profile-avatar-actions">
                <label class="btn btn-ghost btn-sm" id="avatar-upload-label" for="avatar-input">Загрузить фото</label>
                <input type="file" id="avatar-input" accept="image/jpeg,image/png,image/webp" style="display:none">
                <button class="btn btn-danger btn-sm" id="avatar-delete-btn" style="display:none">Удалить</button>
              </div>
              <p class="profile-avatar-hint" id="avatar-hint">JPG, PNG или WEBP · до 1MB</p>
            </div>
          </div>
        </div>

        <!-- Основные данные -->
        <div class="profile-card">
          <h2 class="profile-card-title">Личные данные</h2>
          <div class="profile-form" id="profile-form">
            <div class="form-group">
              <label>Имя</label>
              <input type="text" id="profile-name" placeholder="Ваше имя">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="profile-email" placeholder="email@example.com">
            </div>
            <div class="form-group">
              <label>Телефон</label>
              <input type="tel" id="profile-phone" placeholder="+7 (999) 000-00-00">
            </div>
            <button class="btn btn-primary" id="profile-save-btn">
              <span class="btn-text">Сохранить</span>
              <span class="btn-loader hidden">⟳</span>
            </button>
          </div>
        </div>

        <!-- Соцсети -->
        <div class="profile-card">
          <h2 class="profile-card-title">Вход через соцсети</h2>
          <div class="social-links" id="social-links">
            <div class="social-link-item" id="social-yandex">
              <div class="social-link-info">
                <div class="social-link-icon social-yandex-icon">Я</div>
                <div>
                  <div class="social-link-name">Яндекс</div>
                  <div class="social-link-status" id="yandex-status">Не привязан</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" id="yandex-btn">Привязать</button>
            </div>
            <div class="social-link-item" id="social-vk">
              <div class="social-link-info">
                <div class="social-link-icon social-vk-icon">VK</div>
                <div>
                  <div class="social-link-name">ВКонтакте</div>
                  <div class="social-link-status" id="vk-status">Не привязан</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" id="vk-btn">Привязать</button>
            </div>
            <div class="social-link-item" id="social-google">
              <div class="social-link-info">
                <div class="social-link-icon social-google-icon">G</div>
                <div>
                  <div class="social-link-name">Google</div>
                  <div class="social-link-status" id="google-status">Не привязан</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" id="google-btn">Привязать</button>
            </div>
          </div>
        </div>

        <!-- Смена пароля -->
        <div class="profile-card">
          <h2 class="profile-card-title">Смена пароля</h2>
          <div class="profile-form">
            <div class="form-group">
              <label>Текущий пароль</label>
              <input type="password" id="current-password" placeholder="••••••••">
            </div>
            <div class="form-group">
              <label>Новый пароль</label>
              <input type="password" id="new-password" placeholder="Минимум 8 символов">
            </div>
            <div class="form-group">
              <label>Повторите новый пароль</label>
              <input type="password" id="confirm-password" placeholder="••••••••">
            </div>
            <button class="btn btn-primary" id="password-save-btn">
              <span class="btn-text">Изменить пароль</span>
              <span class="btn-loader hidden">⟳</span>
            </button>
          </div>
        </div>

      </div>
    `;

    loadProfile();
    initAvatarUpload();
    initProfileForm();
    initPhoneMask();
    initPasswordForm();
    handleOAuthCallback();
  }

  // Обработка результата OAuth после редиректа
  function handleOAuthCallback() {
    const hash = window.location.hash; // например /#/profile?oauth=success&provider=yandex
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return;

    const params = new URLSearchParams(hash.slice(qIndex + 1));
    const oauth    = params.get('oauth');
    const provider = params.get('provider');

    if (!oauth) return;

    // Убираем параметры из URL
    window.history.replaceState(null, '', window.location.pathname + '#/profile');

    const names = { yandex: 'Яндекс', vk: 'ВКонтакте', google: 'Google' };
    const name  = names[provider] || provider;

    if (oauth === 'success') {
      App.toast(`${name} успешно привязан`, 'success');
      loadProfile();
    } else if (oauth === 'already_used') {
      App.toast(`Этот аккаунт ${name} уже привязан к другому пользователю`, 'error');
    } else {
      const msg = params.get('msg') ? decodeURIComponent(params.get('msg')) : `Не удалось привязать ${name}`;
      App.toast(msg, 'error');
    }
  }

  function updateAvatarUI(avatar, name) {
    const avatarEl    = document.getElementById('profile-avatar-preview');
    const uploadLabel = document.getElementById('avatar-upload-label');
    const deleteBtn   = document.getElementById('avatar-delete-btn');
    const hint        = document.getElementById('avatar-hint');
    if (avatar) {
      avatarEl.innerHTML = `<img src="${avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      uploadLabel.textContent = 'Обновить';
      deleteBtn.style.display = 'inline-flex';
      if (hint) hint.style.display = 'none';
    } else {
      avatarEl.textContent = (name || '?')[0].toUpperCase();
      uploadLabel.textContent = 'Загрузить фото';
      deleteBtn.style.display = 'none';
      if (hint) hint.style.display = 'block';
    }
  }

  async function loadProfile() {
    try {
      const res = await API.get('/profile');
      const p = res.data;

      document.getElementById('profile-name').value  = p.name  || '';
      document.getElementById('profile-email').value = p.email || '';
      document.getElementById('profile-phone').value = p.phone || '';

      updateAvatarUI(p.avatar, p.name || p.email);

      updateSocialStatus('yandex', p.oauth_yandex_id, p.oauth_yandex_avatar, p.oauth_yandex_name);
      updateSocialStatus('vk',     p.oauth_vk_id,     p.oauth_vk_avatar,     p.oauth_vk_name);
      updateSocialStatus('google', p.oauth_google_id,  p.oauth_google_avatar, p.oauth_google_name);

    } catch (err) {
      App.toast('Ошибка загрузки профиля', 'error');
    }
  }

  function updateSocialStatus(provider, id, avatar, username) {
    const btn    = document.getElementById(`${provider}-btn`);
    const infoEl = document.querySelector(`#social-${provider} .social-link-info`);
    if (!btn || !infoEl) return;

    const logos = {
      yandex: '/images/oauth/yandex.png',
      vk:     '/images/oauth/vk.png',
      google: '/images/oauth/google.png',
    };
    const names = { yandex: 'Яндекс', vk: 'ВКонтакте', google: 'Google' };

    if (id) {
      const avatarHtml = avatar
        ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : `<span style="font-size:14px;font-weight:700;color:var(--accent);">${(username||'?')[0].toUpperCase()}</span>`;
      infoEl.innerHTML = `
        <div style="position:relative;width:60px;height:44px;flex-shrink:0;">
          <div style="position:absolute;left:0;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;overflow:hidden;background:#fff;z-index:1;display:flex;align-items:center;justify-content:center;">
            <img src="${logos[provider]}" style="width:44px;height:44px;object-fit:contain;">
          </div>
          <div style="position:absolute;left:24px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;overflow:hidden;background:#fff;border:2px solid var(--border);z-index:2;display:flex;align-items:center;justify-content:center;">
            ${avatarHtml}
          </div>
        </div>
        <div style="margin-left:8px;">
          <div class="social-link-name">${username || names[provider]}</div>
        </div>`;
      btn.textContent = 'Отвязать';
      btn.onclick = () => unlinkSocial(provider);
    } else {
      infoEl.innerHTML = `
        <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <img src="${logos[provider]}" style="width:36px;height:36px;object-fit:contain;">
        </div>
        <div>
          <div class="social-link-name">${names[provider]}</div>
          <div class="social-link-status" style="color:#94a3b8;">Не привязан</div>
        </div>`;
      btn.textContent = 'Привязать';
      btn.onclick = () => linkSocial(provider);
    }
  }

  function linkSocial(provider) {
    const token = localStorage.getItem('sp_token');
    if (!token) {
      App.toast('Войдите в аккаунт, чтобы привязать соцсеть', 'error');
      return;
    }
    if (provider === 'vk') {
      linkVK(token);
    } else {
      const url = `/api/auth/oauth/${provider}?token=${encodeURIComponent(token)}`;
      window.location.href = url;
    }
  }

  async function linkVK(token) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `/api/auth/oauth/vk?cv=${encodeURIComponent(codeVerifier)}&token=${encodeURIComponent(token)}`;
    window.location.href = url;
  }

  async function unlinkSocial(provider) {
    try {
      await API.delete(`/profile/social/${provider}`);
      updateSocialStatus(provider, null);
      App.toast('Привязка удалена', 'success');
    } catch (err) {
      App.toast(err.message || 'Ошибка', 'error');
    }
  }

  function initAvatarUpload() {
    const input = document.getElementById('avatar-input');
    input.addEventListener('change', async () => {
      if (!input.files[0]) return;
      const formData = new FormData();
      formData.append('avatar', input.files[0]);
      try {
        const res = await API.upload('/profile/avatar', formData);
        const u = State.get('user');
        State.set('user', { ...u, avatar: res.data.avatar });
        updateAvatarUI(res.data.avatar, u?.name || u?.email);
        App.toast('Аватар обновлён', 'success');
      } catch (err) {
        App.toast(err.message || 'Ошибка загрузки', 'error');
      }
    });

    document.getElementById('avatar-delete-btn').addEventListener('click', async () => {
      try {
        await API.delete('/profile/avatar');
        const p = State.get('user');
        State.set('user', { ...p, avatar: null });
        updateAvatarUI(null, p?.name || p?.email);
        App.toast('Аватар удалён', 'success');
      } catch (err) {
        App.toast(err.message || 'Ошибка', 'error');
      }
    });
  }

  function initPhoneMask() {
    const input = document.getElementById('profile-phone');
    if (!input) return;
    input.addEventListener('input', () => {
      let val = input.value.replace(/\D/g, '');
      if (val.startsWith('8')) val = '7' + val.slice(1);
      if (!val.startsWith('7')) val = '7' + val;
      val = val.slice(0, 11);
      let masked = '+7';
      if (val.length > 1) masked += ' (' + val.slice(1, 4);
      if (val.length >= 4) masked += ') ' + val.slice(4, 7);
      if (val.length >= 7) masked += '-' + val.slice(7, 9);
      if (val.length >= 9) masked += '-' + val.slice(9, 11);
      input.value = masked;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && input.value === '+7 (') {
        input.value = '';
        e.preventDefault();
      }
    });
    input.addEventListener('focus', () => {
      if (!input.value) input.value = '+7 (';
    });
    input.addEventListener('blur', () => {
      if (input.value === '+7 (') input.value = '';
    });
  }

  function initProfileForm() {
    const btn = document.getElementById('profile-save-btn');

    btn.addEventListener('click', async () => {
      const name  = document.getElementById('profile-name').value.trim();
      const email = document.getElementById('profile-email').value.trim();
      const phone = document.getElementById('profile-phone').value.trim();

      if (!name || !email) {
        App.toast('Имя и email обязательны', 'error');
        return;
      }

      btn.disabled = true;
      btn.querySelector('.btn-text').classList.add('hidden');
      btn.querySelector('.btn-loader').classList.remove('hidden');

      try {
        const res = await API.put('/profile', { name, email, phone });
        State.set('user', { ...State.get('user'), ...res.data });
        App.toast('Профиль обновлён', 'success');
      } catch (err) {
        App.toast(err.message || 'Ошибка сохранения', 'error');
      } finally {
        btn.disabled = false;
        btn.querySelector('.btn-text').classList.remove('hidden');
        btn.querySelector('.btn-loader').classList.add('hidden');
      }
    });
  }

  function initPasswordForm() {
    const btn         = document.getElementById('password-save-btn');
    const confirmInput = document.getElementById('confirm-password');
    const newPassInput = document.getElementById('new-password');

    // Валидация совпадения в реальном времени
    confirmInput.addEventListener('input', () => {
      const hint = document.getElementById('confirm-password-hint');
      if (!confirmInput.value) { if (hint) hint.remove(); return; }
      if (!document.getElementById('confirm-password-hint')) {
        const el = document.createElement('div');
        el.id = 'confirm-password-hint';
        el.style.cssText = 'font-size:12px;margin-top:4px;';
        confirmInput.parentNode.appendChild(el);
      }
      const el = document.getElementById('confirm-password-hint');
      if (confirmInput.value === newPassInput.value) {
        el.textContent = '✓ Пароли совпадают';
        el.style.color = '#16a34a';
      } else {
        el.textContent = '✕ Пароли не совпадают';
        el.style.color = '#fc3f1d';
      }
    });

    btn.addEventListener('click', async () => {
      const current = document.getElementById('current-password').value;
      const newPass = document.getElementById('new-password').value;
      const confirm = document.getElementById('confirm-password').value;

      if (!current || !newPass || !confirm) {
        App.toast('Заполните все поля', 'error');
        return;
      }
      if (newPass.length < 8) {
        App.toast('Новый пароль должен содержать минимум 8 символов', 'error');
        return;
      }
      if (newPass !== confirm) {
        App.toast('Пароли не совпадают', 'error');
        return;
      }

      btn.disabled = true;
      btn.querySelector('.btn-text').classList.add('hidden');
      btn.querySelector('.btn-loader').classList.remove('hidden');

      try {
        await API.put('/profile/password', { current_password: current, new_password: newPass });
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value     = '';
        document.getElementById('confirm-password').value = '';
        App.toast('Пароль успешно изменён', 'success');
      } catch (err) {
        App.toast(err.message || 'Ошибка смены пароля', 'error');
      } finally {
        btn.disabled = false;
        btn.querySelector('.btn-text').classList.remove('hidden');
        btn.querySelector('.btn-loader').classList.add('hidden');
      }
    });
  }

  return { render };
})();
