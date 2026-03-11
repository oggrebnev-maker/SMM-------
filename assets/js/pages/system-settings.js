const PageSystemSettings = (() => {

  let currentTab = 'general';
  let platformsData = [];

  async function render() {
    const container = document.getElementById('page-container');
    container.innerHTML = '<div class="loading-state">Загрузка...</div>';

    let settings = {};
    let users = [];

    try {
      const [sRes, uRes] = await Promise.all([
        API.get('/system-settings'),
        API.get('/system-settings/users')
      ]);
      settings = (sRes.data && sRes.data.settings) || sRes.settings || {};
      users = (uRes.data && uRes.data.users) || uRes.users || [];
    } catch (e) {
      container.innerHTML = '<div class="error-state">Ошибка загрузки</div>';
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Настройки системы</div>
          <div class="page-subtitle">Управление сайтом и пользователями</div>
        </div>
      </div>

      <div class="ss-tabs">
        <button class="ss-tab ${currentTab === 'general'   ? 'ss-tab--active' : ''}" data-tab="general">Основные</button>
        <button class="ss-tab ${currentTab === 'mail'      ? 'ss-tab--active' : ''}" data-tab="mail">Почта</button>
        <button class="ss-tab ${currentTab === 'users'     ? 'ss-tab--active' : ''}" data-tab="users">Пользователи</button>
        <button class="ss-tab ${currentTab === 'platforms' ? 'ss-tab--active' : ''}" data-tab="platforms">Соцсети</button>
      </div>

      <div class="profile-layout" id="ss-content">
        ${renderTab(currentTab, settings, users)}
      </div>
    `;

    if (currentTab === 'platforms') await loadPlatforms();
    bindEvents(settings, users);

    container.querySelectorAll('.ss-tab').forEach(btn => {
      btn.addEventListener('click', async () => {
        currentTab = btn.dataset.tab;
        container.querySelectorAll('.ss-tab').forEach(b => b.classList.remove('ss-tab--active'));
        btn.classList.add('ss-tab--active');
        document.getElementById('ss-content').innerHTML = renderTab(currentTab, settings, users);
        if (currentTab === 'platforms') await loadPlatforms();
        bindEvents(settings, users);
      });
    });
  }

  function renderTab(tab, settings, users) {
    if (tab === 'general')   return renderGeneral(settings);
    if (tab === 'mail')      return renderMail(settings);
    if (tab === 'users')     return renderUsersTab(users);
    if (tab === 'platforms') return renderPlatformsTab();
    return '';
  }

  // ── Platforms tab ──────────────────────────────────────────────

  function renderPlatformsTab() {
    return `
      <div class="profile-card" style="overflow:visible;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div class="profile-card-title" style="margin-bottom:0;">Доступные соцсети</div>
          <button class="btn btn-blue btn-sm" id="ss-platform-add-btn">+ Добавить</button>
        </div>
        <div id="ss-platforms-list"><div class="loading-state">Загрузка...</div></div>
      </div>

      <!-- Модалка платформы -->
      <div id="ss-platform-modal" class="modal hidden">
        <div class="modal-backdrop" id="ss-platform-modal-backdrop"></div>
        <div class="modal-box" style="width:420px;">
          <div class="modal-header">
            <h3 id="ss-platform-modal-title">Добавить соцсеть</h3>
            <button class="btn-icon" id="ss-platform-modal-close">
              <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <form id="ss-platform-form" style="padding:22px 26px;display:flex;flex-direction:column;gap:16px;">
            <input type="hidden" id="ss-pf-id">
            <div class="form-group">
              <label>Код платформы <span style="color:var(--muted);font-weight:400;text-transform:none;">(латиница, без пробелов)</span></label>
              <input type="text" id="ss-pf-code" placeholder="telegram">
            </div>
            <div class="form-group">
              <label>Название</label>
              <input type="text" id="ss-pf-name" placeholder="Telegram">
            </div>
            <div class="form-group">
              <label>Цвет</label>
              <div style="display:flex;align-items:center;gap:12px;">
                <input type="color" id="ss-pf-color" value="#6366f1" style="width:48px;height:36px;border:1px solid var(--border);border-radius:6px;cursor:pointer;padding:2px;">
                <input type="text" id="ss-pf-color-hex" placeholder="#6366f1" style="flex:1;">
              </div>
            </div>
            <div class="form-group">
              <label>Иконка</label>
              <div style="display:flex;align-items:center;gap:12px;">
                <div id="ss-pf-icon-preview" style="width:44px;height:44px;border-radius:10px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg);flex-shrink:0;">
                  <span style="font-size:11px;color:var(--muted);">нет</span>
                </div>
                <div>
                  <input type="file" id="ss-pf-icon-input" accept=".png,.jpg,.jpeg,.webp,.svg" style="display:none">
                  <button type="button" class="btn btn-ghost btn-sm" id="ss-pf-icon-btn">Загрузить</button>
                  <div style="font-size:11px;color:var(--muted);margin-top:4px;">PNG, SVG, WebP</div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Порядок сортировки</label>
              <input type="number" id="ss-pf-sort" placeholder="0" value="0" style="width:100px;">
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <input type="checkbox" id="ss-pf-active" checked style="width:16px;height:16px;cursor:pointer;">
              <label for="ss-pf-active" style="font-size:14px;font-weight:600;color:var(--text);cursor:pointer;text-transform:none;letter-spacing:0;">Активна</label>
            </div>
            <div id="ss-pf-error" class="form-error hidden"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost btn-sm" id="ss-platform-modal-cancel">Отмена</button>
              <button type="submit" class="btn btn-primary btn-sm" id="ss-pf-save-btn">Сохранить</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async function loadPlatforms() {
    try {
      const res = await API.get('/system-settings/platforms');
      platformsData = (res.data && res.data.platforms) || res.platforms || [];
    } catch (e) {
      platformsData = [];
    }
    renderPlatformsList();
  }

  function renderPlatformsList() {
    const el = document.getElementById('ss-platforms-list');
    if (!el) return;
    if (!platformsData.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📱</div><p>Нет добавленных соцсетей</p></div>';
      return;
    }

    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;">
        <colgroup>
          <col style="width:32px;">
          <col>
          <col style="width:110px;">
          <col style="width:80px;">
          <col style="width:180px;">
        </colgroup>
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th></th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);font-weight:700;font-size:11px;text-transform:uppercase;">Платформа</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);font-weight:700;font-size:11px;text-transform:uppercase;">Код</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text2);font-weight:700;font-size:11px;text-transform:uppercase;">Активна</th>
            <th style="padding:8px 10px;"></th>
          </tr>
        </thead>
        <tbody id="ss-platforms-tbody">
          ${platformsData.map(p => `
            <tr draggable="true" style="border-bottom:1px solid var(--border);cursor:default;" data-id="${p.id}">
              <td style="padding:10px 4px 10px 10px;">
                <span class="ss-drag-handle" style="display:flex;align-items:center;justify-content:center;cursor:grab;color:var(--muted);padding:4px;">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="4" cy="3" r="1.2" fill="currentColor"/>
                    <circle cx="4" cy="7" r="1.2" fill="currentColor"/>
                    <circle cx="4" cy="11" r="1.2" fill="currentColor"/>
                    <circle cx="10" cy="3" r="1.2" fill="currentColor"/>
                    <circle cx="10" cy="7" r="1.2" fill="currentColor"/>
                    <circle cx="10" cy="11" r="1.2" fill="currentColor"/>
                  </svg>
                </span>
              </td>
              <td style="padding:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:36px;height:36px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                    ${p.icon_url
                      ? `<img src="${p.icon_url}" style="width:36px;height:36px;object-fit:contain;">`
                      : `<div style="width:36px;height:36px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:14px;font-weight:700;">${p.name.charAt(0)}</span></div>`}
                  </div>
                  <div style="font-weight:600;color:var(--text);">${p.name}</div>
                </div>
              </td>
              <td style="padding:10px;"><span style="font-family:monospace;font-size:12px;background:var(--bg);padding:2px 8px;border-radius:4px;color:var(--text2);">${p.code}</span></td>
              <td style="padding:10px;text-align:center;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.is_active ? '#4ade80' : '#94a3b8'};"></span>
              </td>
              <td style="padding:10px;">
                <div style="display:flex;gap:6px;justify-content:flex-end;">
                  <button class="btn btn-ghost btn-sm ss-pf-edit-btn" data-id="${p.id}">Изменить</button>
                  <button class="btn btn-primary btn-sm ss-pf-delete-btn" data-id="${p.id}">Удалить</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.ss-pf-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openPlatformModal(btn.dataset.id));
    });
    document.querySelectorAll('.ss-pf-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePlatform(btn.dataset.id));
    });

    initDragDrop();
  }

  function initDragDrop() {
    const tbody = document.getElementById('ss-platforms-tbody');
    if (!tbody) return;
    let dragSrc = null;

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('dragstart', (e) => {
        dragSrc = row;
        row.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        row.style.opacity = '';
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('ss-drag-over'));
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('ss-drag-over'));
        if (row !== dragSrc) row.style.background = 'var(--accent-lt)';
      });
      row.addEventListener('dragleave', () => {
        row.style.background = '';
      });
      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        row.style.background = '';
        if (dragSrc === row) return;
        const rows = [...tbody.querySelectorAll('tr')];
        const srcIdx = rows.indexOf(dragSrc);
        const tgtIdx = rows.indexOf(row);
        if (srcIdx < tgtIdx) tbody.insertBefore(dragSrc, row.nextSibling);
        else tbody.insertBefore(dragSrc, row);

        // Сохраняем новый порядок
        const newOrder = [...tbody.querySelectorAll('tr')].map((r, i) => ({ id: r.dataset.id, sort_order: i + 1 }));
        try {
          await Promise.all(newOrder.map(item => API.put(`/system-settings/platforms/${item.id}`, { sort_order: item.sort_order })));
          platformsData.sort((a, b) => {
            const ai = newOrder.findIndex(x => x.id == a.id);
            const bi = newOrder.findIndex(x => x.id == b.id);
            return ai - bi;
          });
        } catch (err) {
          App.toast('Ошибка сохранения порядка', 'error');
        }
      });
    });
  }

  function openPlatformModal(id) {
    const modal = document.getElementById('ss-platform-modal');
    if (!modal) return;

    const p = id ? platformsData.find(x => x.id == id) : null;

    document.getElementById('ss-platform-modal-title').textContent = p ? 'Редактировать соцсеть' : 'Добавить соцсеть';
    document.getElementById('ss-pf-id').value        = p ? p.id : '';
    document.getElementById('ss-pf-code').value      = p ? p.code : '';
    document.getElementById('ss-pf-name').value      = p ? p.name : '';
    document.getElementById('ss-pf-color').value     = p ? p.color : '#6366f1';
    document.getElementById('ss-pf-color-hex').value = p ? p.color : '#6366f1';
    document.getElementById('ss-pf-sort').value      = p ? p.sort_order : 0;
    document.getElementById('ss-pf-active').checked  = p ? p.is_active == 1 : true;
    document.getElementById('ss-pf-error').classList.add('hidden');

    const preview = document.getElementById('ss-pf-icon-preview');
    if (p && p.icon_url) {
      preview.innerHTML = `<img src="${p.icon_url}" style="width:28px;height:28px;object-fit:contain;">`;
    } else {
      preview.innerHTML = `<span style="font-size:11px;color:var(--muted);">нет</span>`;
    }

    modal.classList.remove('hidden');
  }

  function closePlatformModal() {
    const modal = document.getElementById('ss-platform-modal');
    if (modal) modal.classList.add('hidden');
  }

  async function deletePlatform(id) {
    if (!confirm('Удалить платформу?')) return;
    try {
      await API.delete(`/system-settings/platforms/${id}`);
      App.toast('Платформа удалена', 'success');
      await loadPlatforms();
    } catch (e) {
      App.toast(e.message || 'Ошибка', 'error');
    }
  }

  function bindPlatformEvents() {
    const addBtn = document.getElementById('ss-platform-add-btn');
    if (addBtn) addBtn.addEventListener('click', () => openPlatformModal(null));

    const closeBtn = document.getElementById('ss-platform-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closePlatformModal);

    const cancelBtn = document.getElementById('ss-platform-modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closePlatformModal);

    const backdrop = document.getElementById('ss-platform-modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closePlatformModal);

    // Синхронизация color picker и hex input
    const colorPicker = document.getElementById('ss-pf-color');
    const colorHex    = document.getElementById('ss-pf-color-hex');
    if (colorPicker && colorHex) {
      colorPicker.addEventListener('input', () => { colorHex.value = colorPicker.value; });
      colorHex.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(colorHex.value)) colorPicker.value = colorHex.value;
      });
    }

    // Загрузка иконки
    const iconBtn   = document.getElementById('ss-pf-icon-btn');
    const iconInput = document.getElementById('ss-pf-icon-input');
    if (iconBtn && iconInput) {
      iconBtn.addEventListener('click', () => iconInput.click());
      iconInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const id = document.getElementById('ss-pf-id').value;
        if (!id) { App.toast('Сначала сохраните платформу, затем загрузите иконку', 'info'); return; }
        try {
          const fd = new FormData();
          fd.append('icon', file);
          const res = await API.upload(`/system-settings/platforms/${id}/icon`, fd);
          const url = (res.data && res.data.icon_url) || res.icon_url;
          document.getElementById('ss-pf-icon-preview').innerHTML =
            `<img src="${url}?v=${Date.now()}" style="width:28px;height:28px;object-fit:contain;">`;
          const pf = platformsData.find(x => x.id == id);
          if (pf) pf.icon_url = url;
          App.toast('Иконка загружена', 'success');
        } catch (e) {
          App.toast(e.message || 'Ошибка загрузки', 'error');
        }
      });
    }

    // Сохранение формы
    const form = document.getElementById('ss-platform-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl  = document.getElementById('ss-pf-error');
        const saveBtn = document.getElementById('ss-pf-save-btn');
        const id     = document.getElementById('ss-pf-id').value;
        const code   = document.getElementById('ss-pf-code').value.trim();
        const name   = document.getElementById('ss-pf-name').value.trim();
        const color  = document.getElementById('ss-pf-color').value;
        const sort   = parseInt(document.getElementById('ss-pf-sort').value) || 0;
        const active = document.getElementById('ss-pf-active').checked ? 1 : 0;

        if (!code || !name) {
          errEl.textContent = 'Код и название обязательны';
          errEl.classList.remove('hidden');
          return;
        }

        errEl.classList.add('hidden');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';

        try {
          if (id) {
            await API.put(`/system-settings/platforms/${id}`, { code, name, color, sort_order: sort, is_active: active });
          } else {
            await API.post('/system-settings/platforms', { code, name, color, sort_order: sort, is_active: active });
          }
          App.toast(id ? 'Платформа обновлена' : 'Платформа добавлена', 'success');
          closePlatformModal();
          await loadPlatforms();
        } catch (err) {
          errEl.textContent = err.message || 'Ошибка сохранения';
          errEl.classList.remove('hidden');
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Сохранить';
        }
      });
    }
  }

  // ── General tab ────────────────────────────────────────────────

  function renderGeneral(settings) {
    return `
      <div class="profile-card">
        <div class="profile-card-title">Регистрация</div>
        <div class="profile-form">
          <div style="display:flex;align-items:center;gap:12px;padding:4px 0 8px;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:600;color:var(--text);">
              <input type="checkbox" id="ss-reg-enabled" ${settings.registration_enabled == '1' ? 'checked' : ''}
                style="width:18px;height:18px;cursor:pointer;">
              Регистрация новых пользователей открыта
            </label>
          </div>
          <div>
            <button class="btn btn-blue btn-sm" id="ss-reg-save-btn">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Основные</div>
        <div class="profile-form">
          <div class="form-group">
            <label>Название сайта</label>
            <input type="text" id="ss-site-name" value="${settings.site_name || ''}">
          </div>
          <div>
            <button class="btn btn-blue btn-sm" id="ss-save-btn">Сохранить</button>
          </div>
        </div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Favicon</div>
        <div style="display:flex;align-items:center;gap:20px;">
          <div id="ss-favicon-preview" style="width:48px;height:48px;border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg);">
            ${settings.favicon
              ? `<img src="${settings.favicon}" style="width:100%;height:100%;object-fit:contain;">`
              : '<span style="font-size:11px;color:var(--muted);">нет</span>'}
          </div>
          <div>
            <input type="file" id="ss-favicon-input" accept=".ico,.png,.jpg,.jpeg,.webp,.svg" style="display:none">
            <button class="btn btn-ghost btn-sm" id="ss-favicon-btn">Загрузить favicon</button>
            <div style="font-size:11px;color:var(--muted);margin-top:6px;">ICO, PNG, SVG, WebP</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMail(settings) {
    return `
      <div class="profile-card">
        <div class="profile-card-title">SMTP</div>
        <div class="profile-form">
          <div class="form-row">
            <div class="form-group">
              <label>SMTP хост</label>
              <input type="text" id="ss-smtp-host" value="${settings.smtp_host || ''}">
            </div>
            <div class="form-group" style="max-width:120px;">
              <label>Порт</label>
              <input type="text" id="ss-smtp-port" value="${settings.smtp_port || '587'}">
            </div>
          </div>
          <div class="form-group">
            <label>Логин</label>
            <input type="text" id="ss-smtp-user" value="${settings.smtp_user || ''}">
          </div>
          <div class="form-group">
            <label>Пароль</label>
            <input type="password" id="ss-smtp-pass" value="${settings.smtp_pass || ''}" placeholder="••••••••">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>От кого (email)</label>
              <input type="text" id="ss-smtp-from" value="${settings.smtp_from || ''}">
            </div>
            <div class="form-group">
              <label>От кого (имя)</label>
              <input type="text" id="ss-smtp-from-name" value="${settings.smtp_from_name || ''}">
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-blue btn-sm" id="ss-mail-save-btn">Сохранить</button>
            <input type="text" id="ss-test-email-to" placeholder="Тестовый адрес" style="border:1px solid var(--border);border-radius:5px;padding:7px 12px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;width:220px;">
            <button class="btn btn-ghost btn-sm" id="ss-test-email-btn">Отправить тест</button>
          </div>
        </div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Шаблон письма — Подтверждение email</div>
        <div class="profile-form">
          <div class="form-group">
            <label>Тема письма</label>
            <input type="text" id="ss-verify-subject" value="${settings.email_verify_subject || ''}">
          </div>
          <div class="form-group">
            <label>Текст письма</label>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">Переменные: {name} — имя, {link} — ссылка подтверждения</div>
            <textarea id="ss-verify-template" rows="6" style="width:100%;border:1px solid var(--border);border-radius:5px;padding:10px 12px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;resize:vertical;">${settings.email_verify_template || ''}</textarea>
          </div>
          <button class="btn btn-blue btn-sm" id="ss-mail-template-save-btn">Сохранить шаблон</button>
        </div>
      </div>
    `;
  }

  function renderUsersTab(users) {
    return `
      <div class="profile-card">
        <div class="profile-card-title">Пользователи</div>
        <div id="ss-users-list">
          ${renderUsers(users)}
        </div>
      </div>
    `;
  }

  function bindEvents(settings, users) {
    if (currentTab === 'platforms') {
      bindPlatformEvents();
      return;
    }

    const regSaveBtn = document.getElementById('ss-reg-save-btn');
    if (regSaveBtn) {
      regSaveBtn.addEventListener('click', async () => {
        regSaveBtn.disabled = true; regSaveBtn.textContent = 'Сохранение...';
        try {
          const enabled = document.getElementById('ss-reg-enabled').checked ? '1' : '0';
          await API.put('/system-settings', { registration_enabled: enabled });
          App.toast('Настройки регистрации сохранены', 'success');
          const regSwitch = document.getElementById('auth-register-switch');
          if (regSwitch) regSwitch.style.display = enabled === '1' ? '' : 'none';
        } catch (e) { App.toast(e.message || 'Ошибка', 'error'); }
        finally { regSaveBtn.disabled = false; regSaveBtn.textContent = 'Сохранить'; }
      });
    }

    const saveBtn = document.getElementById('ss-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true; saveBtn.textContent = 'Сохранение...';
        try {
          await API.put('/system-settings', { site_name: document.getElementById('ss-site-name').value.trim() });
          App.toast('Настройки сохранены', 'success');
          const siteName = document.getElementById('ss-site-name').value.trim();
          if (siteName) {
            document.title = siteName;
            document.querySelectorAll('.brand-name').forEach(el => el.textContent = siteName);
          }
        } catch (e) { App.toast(e.message || 'Ошибка', 'error'); }
        finally { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; }
      });
    }

    const faviconBtn = document.getElementById('ss-favicon-btn');
    if (faviconBtn) {
      faviconBtn.addEventListener('click', () => document.getElementById('ss-favicon-input').click());
      document.getElementById('ss-favicon-input').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          const fd = new FormData(); fd.append('favicon', file);
          const res = await API.upload('/system-settings/favicon', fd);
          const faviconUrl = (res.data && res.data.favicon) || res.favicon;
          document.getElementById('ss-favicon-preview').innerHTML =
            `<img src="${faviconUrl}?v=${Date.now()}" style="width:100%;height:100%;object-fit:contain;">`;
          let link = document.querySelector("link[rel~='icon']");
          if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
          link.href = faviconUrl + '?v=' + Date.now();
          App.toast('Favicon обновлён', 'success');
        } catch (e) { App.toast(e.message || 'Ошибка загрузки', 'error'); }
      });
    }

    const mailSaveBtn = document.getElementById('ss-mail-save-btn');
    if (mailSaveBtn) {
      mailSaveBtn.addEventListener('click', async () => {
        mailSaveBtn.disabled = true; mailSaveBtn.textContent = 'Сохранение...';
        try {
          await API.put('/system-settings', {
            smtp_host:      document.getElementById('ss-smtp-host').value.trim(),
            smtp_port:      document.getElementById('ss-smtp-port').value.trim(),
            smtp_user:      document.getElementById('ss-smtp-user').value.trim(),
            smtp_pass:      document.getElementById('ss-smtp-pass').value,
            smtp_from:      document.getElementById('ss-smtp-from').value.trim(),
            smtp_from_name: document.getElementById('ss-smtp-from-name').value.trim()
          });
          App.toast('Настройки почты сохранены', 'success');
        } catch (e) { App.toast(e.message || 'Ошибка', 'error'); }
        finally { mailSaveBtn.disabled = false; mailSaveBtn.textContent = 'Сохранить'; }
      });
    }

    const testBtn = document.getElementById('ss-test-email-btn');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const to = document.getElementById('ss-test-email-to').value.trim();
        if (!to) { App.toast('Введите адрес для теста', 'error'); return; }
        testBtn.disabled = true; testBtn.textContent = 'Отправка...';
        try {
          await API.post('/system-settings/test-email', { to });
          App.toast('Тестовое письмо отправлено', 'success');
        } catch (e) { App.toast(e.message || 'Ошибка отправки', 'error'); }
        finally { testBtn.disabled = false; testBtn.textContent = 'Отправить тест'; }
      });
    }

    const templateSaveBtn = document.getElementById('ss-mail-template-save-btn');
    if (templateSaveBtn) {
      templateSaveBtn.addEventListener('click', async () => {
        templateSaveBtn.disabled = true; templateSaveBtn.textContent = 'Сохранение...';
        try {
          await API.put('/system-settings', {
            email_verify_subject:  document.getElementById('ss-verify-subject').value.trim(),
            email_verify_template: document.getElementById('ss-verify-template').value
          });
          App.toast('Шаблон сохранён', 'success');
        } catch (e) { App.toast(e.message || 'Ошибка', 'error'); }
        finally { templateSaveBtn.disabled = false; templateSaveBtn.textContent = 'Сохранить шаблон'; }
      });
    }

    const usersList = document.getElementById('ss-users-list');
    if (usersList) {
      usersList.addEventListener('change', async (e) => {
        const el = e.target;
        const userId = el.dataset.userId;
        if (!userId) return;
        const payload = {};
        if (el.dataset.field === 'role')      payload.role      = el.value;
        if (el.dataset.field === 'is_active') payload.is_active = el.checked ? 1 : 0;
        try {
          await API.put(`/system-settings/users/${userId}`, payload);
          App.toast('Сохранено', 'success');
        } catch (e) { App.toast(e.message || 'Ошибка', 'error'); }
      });
    }
  }

  function renderUsers(users) {
    if (!users.length) return '<div class="empty-state"><p>Пользователей нет</p></div>';
    return `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left;padding:8px 10px;color:var(--text2);font-weight:700;font-size:11px;text-transform:uppercase;">Пользователь</th>
            <th style="text-align:left;padding:8px 10px;color:var(--text2);font-weight:700;font-size:11px;text-transform:uppercase;">Роль</th>
            <th style="text-align:center;padding:8px 10px;color:var(--text2);font-weight:700;font-size:11px;text-transform:uppercase;">Активен</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:10px;">
                <div style="font-weight:600;color:var(--text);">${u.name || '—'}</div>
                <div style="font-size:11px;color:var(--muted);">${u.email}</div>
              </td>
              <td style="padding:10px;">
                <select data-user-id="${u.id}" data-field="role"
                  style="border:1px solid var(--border);border-radius:5px;padding:5px 8px;font-size:13px;background:var(--bg);color:var(--text);font-family:inherit;">
                  <option value="admin"  ${u.role === 'admin'  ? 'selected' : ''}>Администратор</option>
                  <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Редактор</option>
                  <option value="author" ${u.role === 'author' ? 'selected' : ''}>Автор</option>
                </select>
              </td>
              <td style="padding:10px;text-align:center;">
                <input type="checkbox" data-user-id="${u.id}" data-field="is_active"
                  ${u.is_active == 1 ? 'checked' : ''}
                  style="width:16px;height:16px;cursor:pointer;">
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return { render };
})();