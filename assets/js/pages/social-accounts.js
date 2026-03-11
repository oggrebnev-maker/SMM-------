/**
 * social-accounts.js — Страница аккаунтов соцсетей пользователя
 */
const PageSocialAccounts = (() => {

  let accounts  = [];
  let platforms = [];
  let dragSrc   = null;

  async function render() {
    const container = document.getElementById('page-container');
    container.innerHTML = '<div class="loading-state">Загрузка...</div>';

    try {
      const [aRes, pRes] = await Promise.all([
        API.get('/social-accounts'),
        API.get('/social-accounts/platforms')
      ]);
      accounts  = (aRes.data  && aRes.data.accounts)   || aRes.accounts  || [];
      platforms = (pRes.data  && pRes.data.platforms)  || pRes.platforms || [];
    } catch (e) {
      container.innerHTML = '<div class="error-state">Ошибка загрузки</div>';
      return;
    }

    container.style.maxWidth = 'none';

    window.addEventListener('hashchange', () => {
      container.style.maxWidth = '';
    }, { once: true });

    container.innerHTML = `
      <div style="display:flex;height:100%;min-height:100vh;">
        <div class="sa-main-col">

          <div class="page-header" style="flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <div class="page-title">Аккаунты</div>
              <button class="btn btn-blue btn-sm sa-mob-only-btn" id="sa-mob-connect-btn" style="gap:6px;">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Подключить
              </button>
            </div>
            <div class="page-subtitle">Подключённые аккаунты социальных сетей, в которые уже можно публиковать новые посты, отвечать на сообщения и комментарии, а также просматривать аналитику.</div>
          </div>

          <!-- Фильтры по платформам -->
          <div id="sa-filters" style="display:flex;gap:8px;flex-wrap:nowrap;margin-bottom:20px;align-items:center;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
            <button class="sa-filter-btn sa-filter-active" data-platform="all"
              style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--btn-radius);border:1.5px solid var(--accent);background:var(--accent);color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;">
              Все
            </button>
            ${platforms.map(p => `
              <button class="sa-filter-btn" data-platform="${p.code}"
                style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--btn-radius);border:1.5px solid var(--border);background:var(--surface);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;">
                ${p.icon_url
                  ? `<img src="${p.icon_url}" style="width:16px;height:16px;object-fit:contain;border-radius:50%;">`
                  : `<span style="width:16px;height:16px;border-radius:50%;background:${p.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:700;">${p.name.charAt(0)}</span>`
                }
                ${p.name}
              </button>
            `).join('')}
          </div>

          <!-- Список аккаунтов -->
          <div id="sa-list"></div>

        </div>

        <!-- Правый сайдбар — скрыт на мобильном через CSS -->
        <div class="sa-platforms-sidebar">
          <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px;">Доступные соцсети</div>
          <div id="sa-platforms-panel" style="display:flex;flex-direction:column;gap:6px;">
            ${platforms.map(p => `
              <button class="sa-connect-btn" data-platform="${p.code}"
                style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:var(--radius);border:1.5px solid var(--border);background:var(--bg);cursor:pointer;transition:all .15s;text-align:left;width:100%;font-family:inherit;">
                <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                  ${p.icon_url
                    ? `<img src="${p.icon_url}" style="width:36px;height:36px;object-fit:contain;">`
                    : `<div style="width:36px;height:36px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:15px;font-weight:700;">${p.name.charAt(0)}</span></div>`
                  }
                </div>
                <span style="font-size:13px;font-weight:600;color:var(--text);flex:1;">${p.name}</span><span style="font-size:20px;font-weight:300;color:var(--muted);line-height:1;">+</span>
              </button>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Модалка подключения аккаунта -->
      <div id="sa-modal" class="modal hidden">
        <div class="modal-backdrop" id="sa-modal-backdrop"></div>
        <div class="modal-box" style="width:480px;">
          <div class="modal-header">
            <h3 id="sa-modal-title">Подключение аккаунта</h3>
            <button class="btn-icon" id="sa-modal-close">
              <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <form id="sa-form" style="padding:22px 26px;display:flex;flex-direction:column;gap:20px;">
            <input type="hidden" id="sa-f-id">
            <input type="hidden" id="sa-f-platform">
            <input type="hidden" id="sa-f-name">

            <div id="sa-platform-desc" style="font-size:13px;color:var(--text2);line-height:1.6;"></div>

            <button type="button" id="sa-instruction-btn" style="display:inline-flex;align-items:center;gap:8px;align-self:flex-start;background:var(--bg);border:none;padding:8px 14px;border-radius:var(--btn-radius);cursor:pointer;font-family:inherit;color:var(--accent);font-size:13px;font-weight:600;transition:opacity .15s;" onmouseenter="this.style.opacity='.7'" onmouseleave="this.style.opacity='1'">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 7v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              Инструкция по подключению
            </button>

            <div id="sa-credentials-fields" style="display:flex;flex-direction:column;gap:20px;margin-top:8px;"></div>

            <div id="sa-f-error" class="form-error hidden"></div>

            <div class="modal-footer" style="justify-content:stretch;">
              <button type="submit" class="btn btn-blue btn-full" id="sa-f-save-btn">Подключить аккаунт</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Боковая панель инструкции -->
      <div id="sa-instruction-overlay" style="position:fixed;inset:0;z-index:1100;background:rgba(26,32,53,0.3);backdrop-filter:blur(2px);display:none;"></div>
      <div id="sa-instruction-panel" style="position:fixed;top:0;right:0;width:400px;height:100vh;background:var(--surface);border-left:1px solid var(--border);box-shadow:-8px 0 32px rgba(51,63,100,0.12);z-index:1200;flex-direction:column;display:none;">
        <div style="padding:24px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:15px;font-weight:800;color:var(--text);" id="sa-instruction-title">Инструкция</div>
          <button class="btn-icon" id="sa-instruction-close">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div id="sa-instruction-content" style="flex:1;overflow-y:auto;padding:24px;font-size:13px;color:var(--text2);line-height:1.7;"></div>
      </div>
    `;

    renderList('all');
    bindEvents();
  }

  function renderList(filterPlatform) {
    const el = document.getElementById('sa-list');
    if (!el) return;

    const filtered = filterPlatform === 'all'
      ? accounts
      : accounts.filter(a => a.platform === filterPlatform);

    if (!filtered.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:48px 0;">
          <div class="empty-icon"></div>
          <h3>Нет подключённых аккаунтов</h3>
          <p>Выберите платформу справа, чтобы подключить первый аккаунт</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div id="sa-accounts-list" style="display:flex;flex-direction:column;gap:10px;">
        ${filtered.map(a => renderAccountCard(a)).join('')}
      </div>`;

    initDragDrop();

    el.querySelectorAll('.sa-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });
    el.querySelectorAll('.sa-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteAccount(btn.dataset.id));
    });
    el.querySelectorAll('.sa-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleActive(btn.dataset.id, btn.dataset.active));
    });
  }

  function renderAccountCard(a) {
    const color    = a.platform_color || '#6366f1';
    const iconUrl  = a.platform_icon  || '';
    const platName = a.platform_name  || a.platform;
    const meta     = typeof a.meta === 'string' ? JSON.parse(a.meta || '{}') : (a.meta || {});
    const avatarUrl = meta.avatar_url || '';

    const iconHtml = avatarUrl
      ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : iconUrl
        ? `<img src="${iconUrl}" style="width:100%;height:100%;object-fit:contain;">`
        : `<div style="width:100%;height:100%;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:15px;font-weight:700;">${platName.charAt(0)}</span></div>`;

    return `
      <div draggable="true" data-id="${a.id}"
        style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:14px 16px;background:var(--surface);border:1.5px solid var(--border);border-radius:12px;cursor:default;transition:box-shadow .15s;${a.is_active == 0 ? 'opacity:0.55;' : ''}">

        <span class="sa-drag-handle" style="display:flex;align-items:center;color:var(--muted);cursor:grab;padding:2px 4px;flex-shrink:0;">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4" cy="3" r="1.2" fill="currentColor"/>
            <circle cx="4" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="4" cy="11" r="1.2" fill="currentColor"/>
            <circle cx="10" cy="3" r="1.2" fill="currentColor"/>
            <circle cx="10" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="10" cy="11" r="1.2" fill="currentColor"/>
          </svg>
        </span>

        <!-- Аватар с иконкой платформы -->
        <div style="position:relative;flex-shrink:0;width:56px;height:40px;">
          <!-- Аватар канала (слева, крупнее) -->
          <div style="position:absolute;left:0;top:0;width:40px;height:40px;border-radius:50%;overflow:hidden;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;">
            ${iconHtml}
          </div>
          <!-- Иконка платформы (справа, поверх) -->
          <div style="position:absolute;right:0;top:4px;width:28px;height:28px;border-radius:50%;overflow:hidden;background:#fff;border:2px solid var(--surface);display:flex;align-items:center;justify-content:center;">
            ${iconUrl
              ? `<img src="${iconUrl}" style="width:20px;height:20px;object-fit:contain;">`
              : `<div style="width:24px;height:24px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:10px;font-weight:700;">${platName.charAt(0)}</span></div>`
            }
          </div>
        </div>
        <!-- Инфо -->
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.name}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:3px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${a.is_active ? '#4ade80' : '#94a3b8'};flex-shrink:0;"></span>
            <span style="font-size:12px;color:${a.is_active ? '#4ade80' : 'var(--muted)'};font-weight:600;">${a.is_active ? 'Активен' : 'Отключён'}</span>
          </div>
        </div>

        <!-- Действия -->
        <!-- Действия -->
        <div class="sa-card-actions" style="display:flex;gap:4px;flex-shrink:0;">
          <button class="btn-icon sa-toggle-btn" data-id="${a.id}" data-active="${a.is_active}" title="${a.is_active ? 'Отключить' : 'Включить'}" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);color:${a.is_active ? '#4ade80' : 'var(--muted)'};">${a.is_active ? '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="10" rx="5" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="10" r="3" fill="currentColor"/></svg>' : '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="10" rx="5" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="10" r="3" fill="currentColor"/></svg>'}</button>
          <button class="btn-icon sa-edit-btn" data-id="${a.id}" title="Редактировать" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5a2.121 2.121 0 013 3L7 16H4v-3L13.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
          <button class="btn-icon sa-delete-btn" data-id="${a.id}" title="Удалить" style="width:34px;height:34px;border-radius:8px;background:rgba(252,63,29,0.07);border:1.5px solid rgba(252,63,29,0.2);color:var(--red);"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 6v9a1 1 0 001 1h4a1 1 0 001-1V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
        </div>
        <div class="sa-card-actions-bottom" style="width:100%;display:flex;gap:4px;padding-top:8px;border-top:1px solid var(--border);">
          <button class="btn-icon sa-toggle-btn" data-id="${a.id}" data-active="${a.is_active}" title="${a.is_active ? 'Отключить' : 'Включить'}" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);color:${a.is_active ? '#4ade80' : 'var(--muted)'};">${a.is_active ? '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="10" rx="5" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="10" r="3" fill="currentColor"/></svg>' : '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="10" rx="5" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="10" r="3" fill="currentColor"/></svg>'}</button>
          <button class="btn-icon sa-edit-btn" data-id="${a.id}" title="Редактировать" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5a2.121 2.121 0 013 3L7 16H4v-3L13.5 3.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
          <button class="btn-icon sa-delete-btn" data-id="${a.id}" title="Удалить" style="width:34px;height:34px;border-radius:8px;background:rgba(252,63,29,0.07);border:1.5px solid rgba(252,63,29,0.2);color:var(--red);"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 6v9a1 1 0 001 1h4a1 1 0 001-1V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
        </div>
      </div>`;
  }

  function initDragDrop() {
    const list = document.getElementById('sa-accounts-list');
    if (!list) return;

    list.querySelectorAll('[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        dragSrc = card;
        card.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.style.opacity = '';
        list.querySelectorAll('[draggable="true"]').forEach(c => c.style.boxShadow = '');
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        list.querySelectorAll('[draggable="true"]').forEach(c => c.style.boxShadow = '');
        if (card !== dragSrc) card.style.boxShadow = '0 0 0 2px var(--accent)';
      });
      card.addEventListener('dragleave', () => { card.style.boxShadow = ''; });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.style.boxShadow = '';
        if (dragSrc === card) return;
        const cards = [...list.querySelectorAll('[draggable="true"]')];
        const si = cards.indexOf(dragSrc);
        const ti = cards.indexOf(card);
        if (si < ti) list.insertBefore(dragSrc, card.nextSibling);
        else list.insertBefore(dragSrc, card);
        // Обновляем порядок в accounts[]
        const newOrder = [...list.querySelectorAll('[draggable="true"]')].map(c => c.dataset.id);
        accounts.sort((a, b) => newOrder.indexOf(String(a.id)) - newOrder.indexOf(String(b.id)));
      });
    });
  }

  function openModal(id) {
    const a = id ? accounts.find(x => x.id == id) : null;
    const platformCode = a ? a.platform : null;
    const p = platforms.find(x => x.code === platformCode) || platforms[0];
    if (!p) return;

    document.getElementById('sa-f-id').value       = a ? a.id : '';
    document.getElementById('sa-f-platform').value = p.code;
    document.getElementById('sa-f-name').value     = a ? a.name : '';
    document.getElementById('sa-f-error').classList.add('hidden');
    document.getElementById('sa-f-save-btn').textContent = a ? 'Сохранить' : 'Подключить аккаунт';
    document.getElementById('sa-modal-title').textContent = a ? `Редактировать аккаунт` : `Подключение аккаунта ${p.name}`;
    document.getElementById('sa-platform-desc').innerHTML = getPlatformDesc(p.code);

    const creds = a && a.credentials ? (typeof a.credentials === 'string' ? JSON.parse(a.credentials) : a.credentials) : {};
    document.getElementById('sa-credentials-fields').innerHTML = renderCredentialsFields(p.code, creds);

    document.getElementById('sa-instruction-btn').dataset.platform = p.code;
    document.getElementById('sa-modal').classList.remove('hidden');
    bindChannelInput();
  }

  function openModalForPlatform(code) {
    const p = platforms.find(x => x.code === code);
    if (!p) return;

    document.getElementById('sa-f-id').value       = '';
    document.getElementById('sa-f-platform').value = code;
    const pObj = platforms.find(x => x.code === code);
    document.getElementById('sa-f-name').value = pObj ? pObj.name : code;
    document.getElementById('sa-f-error').classList.add('hidden');
    document.getElementById('sa-f-save-btn').textContent = 'Подключить аккаунт';
    document.getElementById('sa-modal-title').textContent = `Подключение аккаунта ${p.name}`;
    document.getElementById('sa-platform-desc').innerHTML = getPlatformDesc(code);
    document.getElementById('sa-credentials-fields').innerHTML = renderCredentialsFields(code, {});

    document.getElementById('sa-instruction-btn').dataset.platform = code;
    document.getElementById('sa-modal').classList.remove('hidden');
    bindChannelInput();
  }

  function getPlatformDesc(code) {
    const siteName = document.title || 'Я СММ-щик';
    const descs = {
      telegram: `Для подключения Telegram вам необходимо создать бота через <a href="https://t.me/BotFather" target="_blank" style="color:var(--accent);font-weight:600;">@BotFather</a> — после создания вам будет выдан токен бота (ключ доступа). Добавьте своего бота в канал или группу в качестве администратора, затем введите токен и ссылку на канал ниже, чтобы завершить подключение в ${siteName}.`,
      vk:       'Для подключения ВКонтакте необходим Access Token с правами на публикацию и ID вашей группы.',
      ok:       'Для подключения Одноклассников необходим Access Token и ID вашей группы.',
      dzen:     'Для подключения Дзена необходим OAuth Token и ID вашего канала.',
      max:      'Для подключения Max необходим Access Token и ID вашего канала.',
    };
    return descs[code] || 'Введите данные для подключения аккаунта.';
  }

  function getInstructionContent(code) {
    const instructions = {
      telegram: `
        <h4 style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px;">Пошаговая инструкция</h4>
        <p style="margin-bottom:10px;"><strong style="color:var(--text);">Шаг 1.</strong> Откройте Telegram и найдите бота <a href="https://t.me/BotFather" target="_blank" style="color:var(--accent);font-weight:600;">@BotFather</a>.</p>
        <p style="margin-bottom:10px;"><strong style="color:var(--text);">Шаг 2.</strong> Отправьте команду <code style="background:var(--bg);padding:2px 6px;border-radius:4px;">/newbot</code> и следуйте инструкциям — придумайте имя и username для бота.</p>
        <p style="margin-bottom:10px;"><strong style="color:var(--text);">Шаг 3.</strong> После создания BotFather выдаст вам токен вида <code style="background:var(--bg);padding:2px 6px;border-radius:4px;">123456789:AAF...</code> — скопируйте его.</p>
        <p style="margin-bottom:10px;"><strong style="color:var(--text);">Шаг 4.</strong> Добавьте созданного бота в ваш канал или группу: зайдите в настройки канала → Администраторы → Добавить администратора → найдите вашего бота по username.</p>
        <p style="margin-bottom:10px;"><strong style="color:var(--text);">Шаг 5.</strong> Дайте боту права на публикацию сообщений.</p>
        <p style="margin-bottom:10px;"><strong style="color:var(--text);">Шаг 6.</strong> Вернитесь в форму подключения, введите токен и ссылку на канал (например <code style="background:var(--bg);padding:2px 6px;border-radius:4px;">https://t.me/mychannel</code>).</p>
        <p style="margin-top:16px;padding:12px;background:rgba(34,197,94,0.08);border-radius:8px;border-left:3px solid #4ade80;color:var(--text);">&#10003; После подключения бот сможет публиковать посты от имени канала.</p>
      `,
      vk: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Инструкция для ВКонтакте будет добавлена позже.</p>',
      ok: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Инструкция для Одноклассников будет добавлена позже.</p>',
      dzen: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Инструкция для Дзена будет добавлена позже.</p>',
      max: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Инструкция для Max будет добавлена позже.</p>',
    };
    return instructions[code] || '<p>Инструкция будет добавлена позже.</p>';
  }

  function renderCredentialsFields(code, creds) {
    if (code === 'telegram') {
      return `
        <div class="form-group">
          <label>Токен бота</label>
          <input type="text" class="sa-cred-field" data-key="bot_token"
            placeholder="123456789:AAF..."
            value="${creds.bot_token ? '••••••••' : ''}"
            autocomplete="off">
        </div>
        <div class="form-group">
          <label>Ссылка на канал</label>
          <div style="position:relative;">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--muted);font-weight:500;pointer-events:none;">https://t.me/</span>
            <input type="text" class="sa-cred-field" data-key="channel_username" id="sa-tg-channel"
              placeholder="mychannel"
              value="${creds.channel_username || ''}"
              autocomplete="off"
              style="padding-left:110px;">
          </div>
        </div>
      `;
    }

    const fields = {
      vk: [
        { key: 'access_token', label: 'Access Token', placeholder: 'vk1.a.xxx...' },
        { key: 'group_id',     label: 'ID группы',    placeholder: '123456789' },
      ],
      ok: [
        { key: 'access_token', label: 'Access Token', placeholder: 'xxxx' },
        { key: 'group_id',     label: 'ID группы',    placeholder: '123456789' },
      ],
      dzen: [
        { key: 'oauth_token',  label: 'OAuth Token',  placeholder: 'xxxx' },
        { key: 'channel_id',   label: 'ID канала',    placeholder: 'xxxx' },
      ],
      max: [
        { key: 'access_token', label: 'Access Token', placeholder: 'xxxx' },
        { key: 'channel_id',   label: 'ID канала',    placeholder: 'xxxx' },
      ],
    };

    const f = fields[code] || [];
    if (!f.length) return `<div style="font-size:13px;color:var(--muted);">Нет дополнительных полей для этой платформы.</div>`;

    return f.map(field => `
      <div class="form-group">
        <label>${field.label}</label>
        <input type="text" class="sa-cred-field" data-key="${field.key}"
          placeholder="${field.placeholder}"
          value="${creds[field.key] ? '••••••••' : ''}"
          autocomplete="off">
      </div>
    `).join('');
  }

  function bindChannelInput() {
    const input = document.getElementById('sa-tg-channel');
    if (!input) return;
    input.addEventListener('input', () => {
      let val = input.value.trim();
      // Если вставили полный URL — обрезаем
      val = val.replace(/^https?:\/\/t\.me\//i, '');
      val = val.replace(/^@/, '');
      val = val.replace(/[^a-zA-Z0-9_]/g, '');
      input.value = val;
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      let pasted = (e.clipboardData || window.clipboardData).getData('text');
      pasted = pasted.replace(/^https?:\/\/t\.me\//i, '');
      pasted = pasted.replace(/^@/, '');
      pasted = pasted.replace(/[^a-zA-Z0-9_]/g, '');
      input.value = pasted;
    });
  }

  function openInstruction(code) {
    const panel   = document.getElementById('sa-instruction-panel');
    const overlay = document.getElementById('sa-instruction-overlay');
    const p = platforms.find(x => x.code === code);
    document.getElementById('sa-instruction-title').textContent = `Инструкция: ${p ? p.name : ''}`;
    document.getElementById('sa-instruction-content').innerHTML = getInstructionContent(code);
    panel.style.display   = 'flex';
    overlay.style.display = 'block';
  }

  function closeInstruction() {
    document.getElementById('sa-instruction-panel').style.display  = 'none';
    document.getElementById('sa-instruction-overlay').style.display = 'none';
  }

  function closeModal() {
    document.getElementById('sa-modal').classList.add('hidden');
  }

  async function deleteAccount(id) {
    if (!confirm('Удалить аккаунт?')) return;
    try {
      await API.delete(`/social-accounts/${id}`);
      accounts = accounts.filter(a => a.id != id);
      const activeFilter = document.querySelector('.sa-filter-active');
      renderList(activeFilter ? activeFilter.dataset.platform : 'all');
      App.toast('Аккаунт удалён', 'success');
    } catch (e) {
      App.toast(e.message || 'Ошибка', 'error');
    }
  }

  async function toggleActive(id, currentActive) {
    try {
      const newActive = currentActive == 1 ? 0 : 1;
      await API.put(`/social-accounts/${id}`, { is_active: newActive });
      const acc = accounts.find(a => a.id == id);
      if (acc) acc.is_active = newActive;
      const activeFilter = document.querySelector('.sa-filter-active');
      renderList(activeFilter ? activeFilter.dataset.platform : 'all');
    } catch (e) {
      App.toast(e.message || 'Ошибка', 'error');
    }
  }

  function bindEvents() {
    // Фильтры
    document.getElementById('sa-filters').addEventListener('click', (e) => {
      const btn = e.target.closest('.sa-filter-btn');
      if (!btn) return;
      document.querySelectorAll('.sa-filter-btn').forEach(b => {
        b.classList.remove('sa-filter-active');
        b.style.background    = 'var(--surface)';
        b.style.borderColor   = 'var(--border)';
        b.style.color         = 'var(--text2)';
      });
      btn.classList.add('sa-filter-active');
      btn.style.background  = 'var(--accent)';
      btn.style.borderColor = 'var(--accent)';
      btn.style.color       = '#fff';
      renderList(btn.dataset.platform);
    });

    // Кнопки подключения платформ
    document.getElementById('sa-platforms-panel').addEventListener('click', (e) => {
      const btn = e.target.closest('.sa-connect-btn');
      if (!btn) return;
      openModalForPlatform(btn.dataset.platform);
    });

    // Мобильная кнопка подключить — открываем первую платформу или показываем выбор
    const mobConnectBtn = document.getElementById('sa-mob-connect-btn');
    if (mobConnectBtn) {
      mobConnectBtn.addEventListener('click', () => {
        if (platforms.length === 1) {
          openModalForPlatform(platforms[0].code);
        } else if (platforms.length > 1) {
          // Показываем простой список платформ под кнопкой
          const existing = document.getElementById('sa-mob-platform-list');
          if (existing) { existing.remove(); return; }
          const list = document.createElement('div');
          list.id = 'sa-mob-platform-list';
          list.style.cssText = 'position:absolute;top:100%;right:0;margin-top:6px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-lg);z-index:300;min-width:240px;padding:6px;';
platforms.forEach(p => {
  const item = document.createElement('button');
  item.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;padding:11px 14px;border:1.5px solid var(--border);background:var(--bg);font-family:inherit;cursor:pointer;border-radius:var(--radius);text-align:left;margin-bottom:6px;transition:border-color .15s,box-shadow .15s;';
  item.innerHTML = `
    <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
      ${p.icon_url
        ? `<img src="${p.icon_url}" style="width:36px;height:36px;object-fit:contain;">`
        : `<div style="width:36px;height:36px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:15px;font-weight:700;">${p.name.charAt(0)}</span></div>`
      }
    </div>
    <span style="font-size:13px;font-weight:600;color:var(--text);flex:1;">${p.name}</span>
    <span style="font-size:20px;font-weight:300;color:var(--muted);line-height:1;">+</span>`;
            item.addEventListener('mouseenter', () => item.style.background = 'var(--bg)');
            item.addEventListener('mouseleave', () => item.style.background = 'none');
            item.addEventListener('click', () => { list.remove(); openModalForPlatform(p.code); });
            list.appendChild(item);
          });
          const wrap = mobConnectBtn.parentElement;
          wrap.style.position = 'relative';
          wrap.appendChild(list);
          setTimeout(() => document.addEventListener('click', function h(e) {
            if (!list.contains(e.target) && e.target !== mobConnectBtn) { list.remove(); document.removeEventListener('click', h); }
          }), 0);
        }
      });
    }

    // Hover на кнопках подключения
    document.querySelectorAll('.sa-connect-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = 'var(--accent)';
        btn.style.boxShadow   = 'var(--shadow)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = 'var(--border)';
        btn.style.boxShadow   = 'none';
      });
    });

    // Закрытие модалки
    document.getElementById('sa-modal-close').addEventListener('click', closeModal);
    document.getElementById('sa-modal-backdrop').addEventListener('click', closeModal);

    // Инструкция
    document.getElementById('sa-instruction-btn').addEventListener('click', () => {
      const code = document.getElementById('sa-f-platform').value;
      openInstruction(code);
    });
    document.getElementById('sa-instruction-close').addEventListener('click', closeInstruction);
    document.getElementById('sa-instruction-overlay').addEventListener('click', closeInstruction);

    // Сохранение формы
    document.getElementById('sa-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl   = document.getElementById('sa-f-error');
      const saveBtn = document.getElementById('sa-f-save-btn');
      const id       = document.getElementById('sa-f-id').value;
      const platform = document.getElementById('sa-f-platform').value;
      const name     = document.getElementById('sa-f-name').value.trim();

      if (!name) {
        errEl.textContent = 'Введите название аккаунта';
        errEl.classList.remove('hidden');
        return;
      }

      // Собираем credentials
      const credentials = {};
      document.querySelectorAll('.sa-cred-field').forEach(input => {
        const val = input.value.trim();
        if (val && val !== '••••••••') {
          // Для channel_username добавляем @ если нет
          if (input.dataset.key === 'channel_username') {
            credentials[input.dataset.key] = val.startsWith('@') ? val : '@' + val;
          } else {
            credentials[input.dataset.key] = val;
          }
        }
      });

      errEl.classList.add('hidden');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Сохранение...';

      try {
        if (id) {
          const res = await API.put(`/social-accounts/${id}`, { name, credentials });
          const acc = (res.data && res.data.account) || res.account;
          const idx = accounts.findIndex(a => a.id == id);
          if (idx !== -1) accounts[idx] = acc;
        } else {
          const res = await API.post('/social-accounts', { platform, name, credentials });
          const acc = (res.data && res.data.account) || res.account;
          accounts.unshift(acc);
        }
        closeModal();
        const activeFilter = document.querySelector('.sa-filter-active');
        renderList(activeFilter ? activeFilter.dataset.platform : 'all');
        App.toast(id ? 'Аккаунт обновлён' : 'Аккаунт подключён', 'success');
      } catch (err) {
        errEl.textContent = err.message || 'Ошибка сохранения';
        errEl.classList.remove('hidden');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = id ? 'Сохранить' : 'Подключить';
      }
    });
  }

  return { render };
})();