/**
 * pages/posts.js — Контент / Публикации: топбар и экран
 */

const PagePosts = (() => {

  const VIEW_WEEK = 'week';
  const VIEW_MONTH = 'month';
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  let projects = [];
  let currentDate = new Date();
  let viewMode = VIEW_WEEK;
  /** Список загруженных изображений поста: { file: File, objectUrl: string }[] */
  let postsFormMediaList = [];
  /** Кнопки поста: { text: string, url: string }[] */
  let postsFormButtonsList = [];

  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  }

  function formatWeekRange(monday) {
    const sun = new Date(monday);
    sun.setDate(sun.getDate() + 6);
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    return `${monday.getDate()}–${sun.getDate()}.${month}`;
  }

  function formatMonth(d) {
    return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`;
  }

  function getDateLabel() {
    if (viewMode === VIEW_WEEK) return formatWeekRange(getMonday(currentDate));
    return formatMonth(currentDate);
  }

  function getWeekNumberInYear(d) {
    const date = new Date(d);
    const dayNum = date.getDay() || 7;
    date.setDate(date.getDate() + 4 - dayNum);
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function getDateBlockTitle() {
    if (viewMode === VIEW_WEEK) return `Неделя ${getWeekNumberInYear(currentDate)}`;
    return `Месяц ${currentDate.getMonth() + 1}`;
  }

  function getViewLabel() {
    return viewMode === VIEW_WEEK ? 'Неделя' : 'Месяц';
  }

  /** Дни для недели: 7 дат с понедельника по воскресенье */
  function getDaysForWeek() {
    const monday = getMonday(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({ date: d, dayName: DAY_NAMES_SHORT[d.getDay()], dayNum: d.getDate() });
    }
    return days;
  }

  /** Дни для месяца: массив ячеек (7 колонок × 5–6 рядов), пустые в начале/конце — null */
  function getDaysForMonth() {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const firstWeekday = first.getDay();
    const totalDays = last.getDate();
    const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const cells = startOffset + totalDays;
    const rows = Math.ceil(cells / 7);
    const grid = [];
    let dayNum = 1;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < 7; col++) {
        const i = r * 7 + col;
        if (i < startOffset || dayNum > totalDays) {
          grid.push({ date: null, dayName: '', dayNum: null });
        } else {
          const d = new Date(y, m, dayNum);
          grid.push({ date: d, dayName: DAY_NAMES_SHORT[d.getDay()], dayNum });
          dayNum++;
        }
      }
    }
    return grid;
  }

  function prevUnit() {
    const d = new Date(currentDate);
    if (viewMode === VIEW_WEEK) d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    currentDate = d;
    render();
  }

  function nextUnit() {
    const d = new Date(currentDate);
    if (viewMode === VIEW_WEEK) d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    currentDate = d;
    render();
  }

  function cycleViewMode(step) {
    const order = [VIEW_WEEK, VIEW_MONTH];
    const i = order.indexOf(viewMode);
    viewMode = order[(i + step + order.length) % order.length];
    render();
  }

  async function render() {
    const container = document.getElementById('page-container');
    const topbarLeft = document.getElementById('app-topbar-left');
    if (container) container.innerHTML = '<div class="loading-state">Загрузка...</div>';

    try {
      const res = await API.get('/projects');
      projects = (res.data && res.data.projects) ? res.data.projects : [];
    } catch (e) {
      projects = [];
    }

    const project = State.get('project');
    const projectName = project ? project.name : 'Не выбран';
    const projectNameShort = projectName.length > 20 ? projectName.slice(0, 20) + '…' : projectName;
    const projectIcon = (p) => p && p.logo
      ? `<span class="posts-topbar-dropdown-icon"><img src="${p.logo}" alt=""></span>`
      : `<span class="posts-topbar-dropdown-dot" style="background:${p ? (p.color || '#6366f1') : '#9aa0b8'};"></span>`;

    const topbarBlocksHtml = `
      <div class="posts-topbar-block">
        <div class="posts-topbar-heading">Выбор проекта</div>
        <div class="posts-topbar-project">
          <button type="button" class="posts-topbar-dropdown" id="posts-project-btn" title="Выбор проекта">
            ${projectIcon(project)}
            <span class="posts-topbar-dropdown-label">${projectNameShort}</span>
            <svg class="posts-topbar-dropdown-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div class="posts-topbar-dropdown-panel hidden" id="posts-project-panel">
            ${projects.length ? projects.map(p => `
              <button type="button" class="posts-topbar-dropdown-item ${project && p.id == project.id ? 'active' : ''}" data-id="${p.id}">
                ${p.logo ? `<span class="posts-topbar-dropdown-icon"><img src="${p.logo}" alt=""></span>` : `<span class="posts-topbar-dropdown-dot" style="background:${p.color || '#6366f1'};"></span>`}
                <span>${p.name}</span>
              </button>
            `).join('') : '<div class="posts-topbar-dropdown-empty">Нет проектов</div>'}
            <button type="button" class="btn btn-primary btn-sm posts-topbar-dropdown-add" data-action="create-project">
              <span class="posts-topbar-dropdown-add-plus">+</span>
              <span>Создать проект</span>
            </button>
          </div>
        </div>
      </div>
      <div class="posts-topbar-block">
        <div class="posts-topbar-heading">${getDateBlockTitle()}</div>
        <div class="posts-topbar-date">
          <button type="button" class="posts-topbar-arrow" id="posts-date-prev" title="Назад" aria-label="Назад">
            <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="posts-topbar-date-value" id="posts-date-label">${getDateLabel()}</span>
          <button type="button" class="posts-topbar-arrow" id="posts-date-next" title="Вперёд" aria-label="Вперёд">
            <svg viewBox="0 0 20 20" fill="none"><path d="M8 4l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="posts-topbar-block">
        <div class="posts-topbar-heading">Режим просмотра</div>
        <div class="posts-topbar-view">
          <button type="button" class="posts-topbar-arrow" id="posts-view-prev" title="Предыдущий режим" aria-label="Предыдущий режим">
            <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="posts-topbar-view-value" id="posts-view-label">${getViewLabel()}</span>
          <button type="button" class="posts-topbar-arrow" id="posts-view-next" title="Следующий режим" aria-label="Следующий режим">
            <svg viewBox="0 0 20 20" fill="none"><path d="M8 4l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    `;
    if (topbarLeft) topbarLeft.innerHTML = topbarBlocksHtml;

    if (container) container.innerHTML = `
      <div class="posts-page">
        <div class="posts-content">
          <div class="posts-grid posts-grid--${viewMode}">
            <div class="posts-grid-inner">
              ${(viewMode === VIEW_WEEK ? getDaysForWeek() : getDaysForMonth()).map(cell => {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const isPast = cell.date ? cell.date < todayStart : true;
                const canAdd = cell.date && !isPast;
                const dateStr = cell.date ? cell.date.toISOString().slice(0, 10) : '';
                return `
                <div class="posts-grid-cell ${cell.date ? '' : 'posts-grid-cell--empty'}">
                  <div class="posts-grid-cell-head">
                    ${cell.dayName ? `<span class="posts-grid-cell-day">${cell.dayName}</span>` : ''}
                    <button type="button" class="posts-grid-cell-add" title="${canAdd ? 'Добавить пост' : (isPast ? 'Прошлая дата' : '')}" aria-label="${canAdd ? 'Добавить пост' : (isPast ? 'Прошлая дата' : '')}" ${canAdd ? `data-date="${dateStr}"` : 'disabled'}>${canAdd ? '+' : '−'}</button>
                  </div>
                  <div class="posts-grid-cell-body">
                    ${cell.dayNum != null ? `<span class="posts-grid-cell-num">${cell.dayNum}</span>` : ''}
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
      <div id="posts-create-modal" class="posts-modal">
        <div class="posts-modal-backdrop" id="posts-modal-backdrop"></div>
        <div class="posts-modal-panel">
          <div class="posts-modal-header">
            <h3>Новый пост</h3>
            <button type="button" class="btn-icon" id="posts-modal-close" aria-label="Закрыть">
              <svg viewBox="0 0 20 20" fill="none" width="20" height="20"><path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="posts-modal-body">
            <div class="posts-modal-form-wrap">
              <div class="posts-editor-card">
                <div class="posts-editor-tabs">
                  <button type="button" class="posts-editor-tab active" data-type="post" aria-pressed="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                    Пост
                  </button>
                  <button type="button" class="posts-editor-tab" data-type="story" aria-pressed="false">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg>
                    Story
                  </button>
                  <button type="button" class="posts-editor-tab" data-type="reels" aria-pressed="false">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Reels / Shorts / Clips
                  </button>
                </div>
                <div class="posts-editor-channels">
                  <div id="posts-editor-channel-tags" class="posts-editor-channel-tags"></div>
                  <label class="posts-editor-all-wrap">
                    <input type="checkbox" id="posts-editor-all" title="Выбрать все">
                    <span>Все</span>
                  </label>
                </div>
              <form id="posts-create-form" class="posts-modal-form">
                <div class="form-group">
                  <label class="posts-form-section-label">Креативы</label>
                  <div id="posts-form-media-uploads" class="posts-form-media-uploads" role="button" tabindex="0" aria-label="Перетащите сюда или нажмите для добавления Фото/Видео">
                    <div class="posts-form-media-thumbnails" id="posts-form-media-thumbnails"></div>
                    <div class="posts-form-media-drop-hint" id="posts-form-media-drop-hint">Перетащите сюда или нажмите для добавления Фото/Видео</div>
                  </div>
                  <input type="file" id="posts-form-media-input" accept="image/jpeg,image/png,image/webp,image/gif" multiple style="display:none;">
                </div>
                <div class="form-group">
                  <label for="posts-form-content">Текст поста</label>
                  <textarea id="posts-form-content" name="content" rows="4" placeholder="Введите текст поста..." required style="resize:vertical;min-height:80px;"></textarea>
                  <div class="posts-form-attach-row">
                    <button type="button" class="btn-instr" data-attach="place" title="Место">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      Место
                    </button>
                    <button type="button" class="btn-instr" data-attach="poll" title="Опрос">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                      Опрос
                    </button>
                    <button type="button" class="btn-instr" data-attach="link" title="Ссылка">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                      Ссылка
                    </button>
                    <button type="button" class="btn-instr" data-attach="button" title="Кнопка">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                      Кнопка
                    </button>
                  </div>
                </div>
                <div class="form-group posts-buttons-block hidden" id="posts-buttons-block">
                  <div class="posts-buttons-block-header">
                    <span class="posts-form-section-label">Кнопки</span>
                    <div class="posts-buttons-block-actions">
                      <button type="button" class="btn-icon posts-buttons-trash" id="posts-buttons-trash" title="Удалить блок кнопок" aria-label="Удалить блок кнопок">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                      <button type="button" class="btn btn-ghost btn-sm" id="posts-buttons-add">+ Добавить</button>
                    </div>
                  </div>
                  <div id="posts-buttons-chips" class="posts-buttons-chips"></div>
                </div>
                <div id="posts-add-button-modal" class="posts-add-button-modal hidden">
                  <div class="posts-add-button-modal-backdrop" id="posts-add-button-modal-backdrop"></div>
                  <div class="posts-add-button-modal-box">
                    <h3 class="posts-add-button-modal-title">Добавить кнопку</h3>
                    <div class="form-group">
                      <label for="posts-add-button-text">Текст на кнопке *</label>
                      <input type="text" id="posts-add-button-text" placeholder="Текст на кнопке" maxlength="120">
                      <span class="form-field-error hidden" id="posts-add-button-text-error">Это обязательное поле</span>
                    </div>
                    <div class="form-group">
                      <label for="posts-add-button-url">Ссылка *</label>
                      <input type="url" id="posts-add-button-url" placeholder="https://...">
                      <span class="form-field-error hidden" id="posts-add-button-url-error">Это обязательное поле</span>
                    </div>
                    <div class="posts-modal-footer posts-add-button-modal-footer">
                      <button type="button" class="btn btn-secondary" id="posts-add-button-cancel">Отмена</button>
                      <button type="button" class="btn btn-primary" id="posts-add-button-save">Сохранить</button>
                    </div>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="posts-form-date">Дата публикации</label>
                    <input type="date" id="posts-form-date" name="scheduled_date" required>
                  </div>
                  <div class="form-group">
                    <label for="posts-form-time">Время</label>
                    <input type="time" id="posts-form-time" name="scheduled_time" value="12:00" required>
                  </div>
                </div>
                <div class="form-group" id="posts-channels-wrap">
                  <label>Каналы для публикации</label>
                  <div id="posts-create-channels" class="posts-form-channels"></div>
                </div>
                <div id="posts-form-error" class="form-error hidden"></div>
                <div class="posts-modal-footer">
                  <button type="button" class="btn btn-secondary" id="posts-modal-cancel">Отмена</button>
                  <button type="submit" class="btn btn-primary" id="posts-form-submit">Создать пост</button>
                </div>
              </form>
              </div>
            </div>
            <div class="posts-modal-preview">
              <div class="posts-preview-header">
                <div class="posts-preview-platforms posts-preview-platforms--icons" id="posts-preview-platforms"></div>
              </div>
              <div class="posts-preview-frame" id="posts-preview-frame">
                <div class="posts-preview-inner posts-preview-inner--telegram" id="posts-preview-inner">
                  <span class="posts-preview-telegram-pill">Telegram</span>
                  <div class="posts-preview-telegram-bubble">
                    <div class="posts-preview-telegram-channel" id="posts-preview-channel-name">Канал :: Официальный канал</div>
                    <div class="posts-preview-telegram-media" id="posts-preview-telegram-media"><span class="posts-preview-telegram-media-placeholder">Изображение</span></div>
                    <div class="posts-preview-telegram-text-wrap">
                      <div class="posts-preview-text" id="posts-preview-text">Введите текст поста — предпросмотр обновится здесь.</div>
                    </div>
                    <div class="posts-preview-telegram-footer">
                      <span class="posts-preview-telegram-views"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> 1</span>
                      <span class="posts-preview-telegram-time" id="posts-preview-time">10:00</span>
                    </div>
                    <div class="posts-preview-telegram-comments">
                      <span class="posts-preview-telegram-comments-avatar"></span>
                      <span>0 комментариев</span>
                      <span class="posts-preview-telegram-comments-arrow" aria-hidden="true">→</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('posts-date-prev').addEventListener('click', prevUnit);
    document.getElementById('posts-date-next').addEventListener('click', nextUnit);
    document.getElementById('posts-view-prev').addEventListener('click', () => cycleViewMode(-1));
    document.getElementById('posts-view-next').addEventListener('click', () => cycleViewMode(1));

    const projectBtn = document.getElementById('posts-project-btn');
    const projectPanel = document.getElementById('posts-project-panel');
    if (projectBtn && projectPanel) {
      projectBtn.addEventListener('click', () => {
        projectPanel.classList.toggle('hidden');
      });
      projectPanel.querySelectorAll('.posts-topbar-dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const p = projects.find(pr => pr.id == id);
          if (p) State.setProject(p);
          projectPanel.classList.add('hidden');
          render();
        });
      });
      const addBtn = projectPanel.querySelector('.posts-topbar-dropdown-add');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          projectPanel.classList.add('hidden');
          App.navigate('/projects/create');
        });
      }
    }


    document.querySelectorAll('.posts-grid-cell-add:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.date;
        if (date) openCreateModal(date);
      });
    });

    const modal = document.getElementById('posts-create-modal');
    if (modal) {
      document.getElementById('posts-modal-backdrop').addEventListener('click', closeCreateModal);
      document.getElementById('posts-modal-close').addEventListener('click', closeCreateModal);
      document.getElementById('posts-modal-cancel').addEventListener('click', closeCreateModal);
      document.getElementById('posts-create-form').addEventListener('submit', onSubmitCreatePost);
      const contentEl = document.getElementById('posts-form-content');
      if (contentEl) {
        contentEl.addEventListener('input', updatePreviewText);
        contentEl.addEventListener('paste', () => setTimeout(updatePreviewText, 0));
      }
      const mediaInput = document.getElementById('posts-form-media-input');
      const uploadsZone = document.getElementById('posts-form-media-uploads');
      document.querySelectorAll('.posts-editor-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.posts-editor-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          tab.setAttribute('aria-pressed', 'true');
          document.querySelectorAll('.posts-editor-tab').forEach(t => { if (t !== tab) t.setAttribute('aria-pressed', 'false'); });
        });
      });
      if (mediaInput) {
        mediaInput.addEventListener('change', () => {
          const files = mediaInput.files && mediaInput.files.length ? Array.from(mediaInput.files) : [];
          addPostsFormMediaFiles(files);
          renderPostsFormMedia();
          mediaInput.value = '';
        });
      }
      if (uploadsZone) {
        uploadsZone.addEventListener('click', (e) => {
          if (e.target.closest('.posts-form-media-remove')) return;
          if (mediaInput) mediaInput.click();
        });
        uploadsZone.addEventListener('dragenter', (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadsZone.classList.add('posts-form-media-uploads--dragover');
        });
        uploadsZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = e.dataTransfer.types.indexOf('Files') >= 0 ? 'copy' : 'move';
          uploadsZone.classList.add('posts-form-media-uploads--dragover');
        });
        uploadsZone.addEventListener('dragleave', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!uploadsZone.contains(e.relatedTarget)) uploadsZone.classList.remove('posts-form-media-uploads--dragover');
        });
        uploadsZone.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadsZone.classList.remove('posts-form-media-uploads--dragover');
          const data = (e.dataTransfer.getData('text/plain') || '').trim();
          if (data.startsWith('reorder-')) {
            const fromIndex = parseInt(data.replace('reorder-', ''), 10);
            const toThumb = e.target.closest('.posts-form-media-thumb');
            const toIndex = toThumb ? parseInt(toThumb.dataset.index, 10) : postsFormMediaList.length;
            reorderPostsFormMedia(fromIndex, toIndex);
            renderPostsFormMedia();
          } else {
            const files = e.dataTransfer && e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
            const imageFiles = files.filter(f => f.type && f.type.match(ALLOWED_IMAGE_TYPES));
            addPostsFormMediaFiles(imageFiles);
            renderPostsFormMedia();
          }
        });
      }
      const btnAttachButton = document.querySelector('[data-attach="button"]');
      const buttonsBlock = document.getElementById('posts-buttons-block');
      if (btnAttachButton && buttonsBlock) {
        btnAttachButton.addEventListener('click', () => {
          buttonsBlock.classList.remove('hidden');
          document.querySelectorAll('.posts-form-attach-row .btn-instr').forEach(el => el.classList.remove('active'));
          btnAttachButton.classList.add('active');
          renderPostsFormButtons();
        });
      }
      const trashBtn = document.getElementById('posts-buttons-trash');
      if (trashBtn && buttonsBlock) {
        trashBtn.addEventListener('click', () => {
          postsFormButtonsList.length = 0;
          renderPostsFormButtons();
          buttonsBlock.classList.add('hidden');
          const btn = document.querySelector('[data-attach="button"]');
          if (btn) btn.classList.remove('active');
        });
      }
      const addBtn = document.getElementById('posts-buttons-add');
      const addModal = document.getElementById('posts-add-button-modal');
      if (addBtn && addModal) {
        addBtn.addEventListener('click', () => {
          document.getElementById('posts-add-button-text').value = '';
          document.getElementById('posts-add-button-url').value = '';
          document.getElementById('posts-add-button-text-error').classList.add('hidden');
          document.getElementById('posts-add-button-url-error').classList.add('hidden');
          addModal.classList.remove('hidden');
        });
      }
      if (addModal) {
        const backdrop = document.getElementById('posts-add-button-modal-backdrop');
        const cancelBtn = document.getElementById('posts-add-button-cancel');
        const saveBtn = document.getElementById('posts-add-button-save');
        function closeAddButtonModal() { addModal.classList.add('hidden'); }
        if (backdrop) backdrop.addEventListener('click', closeAddButtonModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeAddButtonModal);
        if (saveBtn) saveBtn.addEventListener('click', () => {
          const text = (document.getElementById('posts-add-button-text').value || '').trim();
          const url = (document.getElementById('posts-add-button-url').value || '').trim();
          const textErr = document.getElementById('posts-add-button-text-error');
          const urlErr = document.getElementById('posts-add-button-url-error');
          textErr.classList.add('hidden');
          urlErr.classList.add('hidden');
          let ok = true;
          if (!text) { textErr.classList.remove('hidden'); ok = false; }
          if (!url) { urlErr.classList.remove('hidden'); ok = false; }
          if (!ok) return;
          postsFormButtonsList.push({ text, url });
          renderPostsFormButtons();
          closeAddButtonModal();
        });
      }
    }
  }

  function renderPostsFormButtons() {
    const container = document.getElementById('posts-buttons-chips');
    if (!container) return;
    container.innerHTML = '';
    postsFormButtonsList.forEach((item, index) => {
      const chip = document.createElement('span');
      chip.className = 'posts-buttons-chip';
      chip.textContent = item.text;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'posts-buttons-chip-remove';
      rm.setAttribute('aria-label', 'Удалить кнопку');
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        postsFormButtonsList.splice(index, 1);
        renderPostsFormButtons();
      });
      chip.appendChild(rm);
      container.appendChild(chip);
    });
  }

  function updatePreviewText() {
    const content = document.getElementById('posts-form-content');
    const preview = document.getElementById('posts-preview-text');
    if (!content || !preview) return;
    const text = content.value.trim() || 'Введите текст поста — предпросмотр обновится здесь.';
    preview.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
  }

  const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  function isValidImageFile(file) {
    return file && file.type && file.type.match(ALLOWED_IMAGE_TYPES) && file.size <= MAX_IMAGE_SIZE;
  }

  function addPostsFormMediaFiles(fileList) {
    if (!fileList || !fileList.length) return;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!isValidImageFile(file)) {
        if (typeof App !== 'undefined' && App.toast) App.toast('Допустимы только JPG, PNG, WEBP, GIF до 10 МБ', 'error');
        continue;
      }
      postsFormMediaList.push({ file, objectUrl: URL.createObjectURL(file) });
    }
  }

  function removePostsFormMediaAtIndex(index) {
    const item = postsFormMediaList[index];
    if (item && item.objectUrl) URL.revokeObjectURL(item.objectUrl);
    postsFormMediaList.splice(index, 1);
  }

  function reorderPostsFormMedia(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const item = postsFormMediaList.splice(fromIndex, 1)[0];
    if (!item) return;
    const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
    postsFormMediaList.splice(insertAt, 0, item);
  }

  function clearPostsFormMedia() {
    postsFormMediaList.forEach(item => { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
    postsFormMediaList.length = 0;
  }

  function renderPostsFormMedia() {
    const thumbnailsEl = document.getElementById('posts-form-media-thumbnails');
    const dropHintEl = document.getElementById('posts-form-media-drop-hint');
    const previewMediaEl = document.getElementById('posts-preview-telegram-media');
    const placeholderHtml = '<span class="posts-preview-telegram-media-placeholder">Изображение</span>';
    if (!thumbnailsEl) return;
    thumbnailsEl.innerHTML = '';
    postsFormMediaList.forEach((item, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'posts-form-media-thumb';
      wrap.draggable = true;
      wrap.dataset.index = String(index);
      wrap.innerHTML = '<img src="' + item.objectUrl + '" alt=""><button type="button" class="posts-form-media-remove" title="Удалить" aria-label="Удалить изображение">&times;</button>';
      const btn = wrap.querySelector('.posts-form-media-remove');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removePostsFormMediaAtIndex(index);
        renderPostsFormMedia();
      });
      wrap.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'reorder-' + index);
        e.dataTransfer.setDragImage(wrap, 36, 36);
      });
      thumbnailsEl.appendChild(wrap);
    });
    if (dropHintEl) dropHintEl.classList.toggle('hidden', postsFormMediaList.length > 0);
    if (previewMediaEl) {
      if (postsFormMediaList.length > 0) {
        const first = postsFormMediaList[0];
        previewMediaEl.innerHTML = '<img src="' + first.objectUrl + '" alt="Превью" class="posts-preview-telegram-media-img">';
      } else {
        previewMediaEl.innerHTML = placeholderHtml;
      }
    }
  }

  function setPreviewPlatform(platformCode, channelName) {
    const inner = document.getElementById('posts-preview-inner');
    const tabs = document.querySelectorAll('.posts-preview-platform-btn');
    if (!inner) return;
    const known = ['telegram', 'vk'];
    const theme = platformCode && known.includes(platformCode) ? platformCode : 'default';
    inner.className = 'posts-preview-inner posts-preview-inner--' + theme;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.platform === platformCode));
    const channelEl = document.getElementById('posts-preview-channel-name');
    if (channelEl) {
      const name = (channelName || 'Канал').trim();
      channelEl.innerHTML = '<span class="tg-name">' + escapeHtml(name) + '</span><span class="tg-suffix"> :: Официальный канал</span>';
    }
  }

  function closeCreateModal() {
    const el = document.getElementById('posts-create-modal');
    if (el) el.classList.remove('posts-modal--open');
  }

  async function openCreateModal(dateStr) {
    const project = State.get('project');
    if (!project || !project.id) {
      if (typeof App !== 'undefined' && App.toast) App.toast('Сначала выберите проект', 'error');
      return;
    }
    const form = document.getElementById('posts-create-form');
    const contentEl = document.getElementById('posts-form-content');
    const dateEl = document.getElementById('posts-form-date');
    const timeEl = document.getElementById('posts-form-time');
    const channelsWrap = document.getElementById('posts-channels-wrap');
    const channelsContainer = document.getElementById('posts-create-channels');
    const errorEl = document.getElementById('posts-form-error');
    if (!form || !contentEl || !dateEl || !timeEl) return;
    contentEl.value = '';
    dateEl.value = dateStr;
    timeEl.value = '12:00';
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    clearPostsFormMedia();
    renderPostsFormMedia();
    postsFormButtonsList.length = 0;
    renderPostsFormButtons();
    const buttonsBlockReset = document.getElementById('posts-buttons-block');
    if (buttonsBlockReset) buttonsBlockReset.classList.add('hidden');
    const btnAttachReset = document.querySelector('[data-attach="button"]');
    if (btnAttachReset) btnAttachReset.classList.remove('active');
    const addModalReset = document.getElementById('posts-add-button-modal');
    if (addModalReset) addModalReset.classList.add('hidden');
    const mediaInputReset = document.getElementById('posts-form-media-input');
    if (mediaInputReset) mediaInputReset.value = '';
    channelsContainer.innerHTML = '<span class="posts-form-channels-loading">Загрузка каналов...</span>';
    channelsWrap.classList.remove('hidden');
    document.getElementById('posts-create-modal').classList.add('posts-modal--open');
    let channels = [];
    try {
      const res = await API.get('/projects/' + project.id + '/channels');
      channels = (res.data && res.data.channels) ? res.data.channels : (res.channels || []);
    } catch (e) {
      channels = [];
    }
    channelsContainer.innerHTML = '';
    const platformsContainer = document.getElementById('posts-preview-platforms');
    const previewInner = document.getElementById('posts-preview-inner');
    const previewText = document.getElementById('posts-preview-text');
    if (channels.length === 0) {
      channelsContainer.innerHTML = '<span class="posts-form-channels-empty">Нет подключённых каналов. Добавьте каналы в настройках проекта.</span>';
      if (platformsContainer) platformsContainer.innerHTML = '<span class="posts-preview-no-channels">Нет каналов для предпросмотра</span>';
      if (previewText) previewText.textContent = 'Добавьте каналы в настройках проекта.';
    } else {
      channels.forEach(ch => {
        const color = ch.platform_color || '#6366f1';
        const name = ch.name || ch.platform_name || ch.platform || 'Канал';
        const id = 'posts-channel-' + (ch.id || ch.channel_id || Math.random().toString(36).slice(2));
        const label = document.createElement('label');
        label.className = 'posts-form-channel-item';
        label.htmlFor = id;
        label.innerHTML = `
          <input type="checkbox" name="channel_ids[]" value="${ch.id || ch.channel_id}" id="${id}">
          <span class="posts-form-channel-dot" style="background:${color};"></span>
          <span class="posts-form-channel-name">${escapeHtml(name)}</span>
        `;
        channelsContainer.appendChild(label);
      });
      const channelTagsEl = document.getElementById('posts-editor-channel-tags');
      const allCheckEl = document.getElementById('posts-editor-all');
      if (channelTagsEl) {
        channelTagsEl.innerHTML = '';
        channels.forEach(ch => {
          const meta = ch.meta || {};
          const avatarUrl = meta.avatar_url || '';
          const platIcon = ch.platform_icon || '';
          const color = ch.platform_color || '#6366f1';
          const name = ch.name || ch.platform_name || ch.platform || 'Канал';
          const chId = ch.id || ch.channel_id;
          const initials = name.slice(0, 2).toUpperCase();
          const mainHtml = avatarUrl
            ? `<img src="${escapeHtml(avatarUrl)}" alt="">`
            : initials;
          const platformLetter = (ch.platform_name || ch.platform || '?').charAt(0);
          const platformHtml = platIcon
            ? `<img src="${escapeHtml(platIcon)}" alt="">`
            : `<span class="posts-editor-channel-platform-letter">${escapeHtml(platformLetter)}</span>`;
          const platformClass = platIcon
            ? 'posts-editor-channel-avatar-platform posts-editor-channel-avatar-platform--img'
            : 'posts-editor-channel-avatar-platform';
          const tag = document.createElement('button');
          tag.type = 'button';
          tag.className = 'posts-editor-channel';
          tag.dataset.channelId = chId;
          tag.title = name;
          tag.setAttribute('aria-label', name);
          tag.innerHTML = `
            <span class="posts-editor-channel-avatar" style="--platform-color:${escapeHtml(color)}">
              <span class="posts-editor-channel-avatar-main">${mainHtml}</span>
              <span class="${platformClass}">${platformHtml}</span>
            </span>
            <span class="posts-editor-channel-check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 10l4 4 8-8"/></svg></span>
          `;
          tag.addEventListener('click', () => {
            const cb = document.querySelector(`input[name="channel_ids[]"][value="${chId}"]`);
            if (cb) {
              cb.checked = !cb.checked;
              tag.classList.toggle('selected', cb.checked);
              updatePostsEditorAllCheckbox();
            }
          });
          channelTagsEl.appendChild(tag);
        });
      }
      if (allCheckEl) {
        allCheckEl.checked = false;
        allCheckEl.onchange = () => {
          const checkboxes = document.querySelectorAll('#posts-create-channels input[name="channel_ids[]"]');
          const tags = document.querySelectorAll('.posts-editor-channel');
          checkboxes.forEach(cb => { cb.checked = allCheckEl.checked; });
          tags.forEach(t => t.classList.toggle('selected', allCheckEl.checked));
        };
      }
      function updatePostsEditorAllCheckbox() {
        const checkboxes = document.querySelectorAll('#posts-create-channels input[name="channel_ids[]"]');
        const all = document.getElementById('posts-editor-all');
        if (!all || !checkboxes.length) return;
        const checked = document.querySelectorAll('#posts-create-channels input[name="channel_ids[]"]:checked').length;
        all.checked = checked === checkboxes.length;
      }
      if (platformsContainer) {
        platformsContainer.innerHTML = '';
        channels.forEach((ch, i) => {
          const code = (ch.platform_code || ch.platform || 'telegram').toLowerCase();
          const name = ch.name || ch.platform_name || ch.platform || 'Канал';
          const platIcon = ch.platform_icon || '';
          const color = ch.platform_color || '#6366f1';
          const iconHtml = platIcon
            ? `<img src="${escapeHtml(platIcon)}" alt="" class="posts-preview-platform-icon-img">`
            : getPlatformIconSvg(code, color);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'posts-preview-platform-btn posts-preview-platform-btn--icon' + (i === 0 ? ' active' : '');
          btn.dataset.platform = code;
          btn.title = name;
          btn.innerHTML = iconHtml;
          btn.addEventListener('click', () => setPreviewPlatform(code, name));
          platformsContainer.appendChild(btn);
        });
      }
      const firstCode = (channels[0].platform_code || channels[0].platform || 'telegram').toLowerCase();
      setPreviewPlatform(firstCode, channels[0].name || channels[0].platform_name);
    }
    updatePreviewText();
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getPlatformIconSvg(code, color) {
    if (code === 'telegram') {
      return '<span class="posts-preview-platform-icon-svg" style="color:#0088cc">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' +
        '</span>';
    }
    if (code === 'vk' || code === 'vkontakte') {
      return '<span class="posts-preview-platform-icon-svg" style="color:#0077ff">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.727-1.033-1-1.49-1.378-2.119-1.378-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.12-5.335-3.202C4.624 10.857 4 8.57 4 6.404c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V8.284c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.744-.576.744z"/></svg>' +
        '</span>';
    }
    return '<span class="posts-preview-platform-icon-svg posts-preview-platform-icon-fallback" style="background:' + color + ';color:#fff">' +
      '<span>' + (code.charAt(0) || '?').toUpperCase() + '</span></span>';
  }

  async function onSubmitCreatePost(e) {
    e.preventDefault();
    const project = State.get('project');
    const errorEl = document.getElementById('posts-form-error');
    const submitBtn = document.getElementById('posts-form-submit');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    if (!project || !project.id) {
      errorEl.textContent = 'Выберите проект в шапке страницы.';
      errorEl.classList.remove('hidden');
      return;
    }
    const content = document.getElementById('posts-form-content').value.trim();
    if (!content) {
      errorEl.textContent = 'Введите текст поста.';
      errorEl.classList.remove('hidden');
      return;
    }
    const date = document.getElementById('posts-form-date').value;
    const time = document.getElementById('posts-form-time').value;
    const scheduled_at = date && time ? date + 'T' + time + ':00' : null;
    if (!scheduled_at) {
      errorEl.textContent = 'Укажите дату и время публикации.';
      errorEl.classList.remove('hidden');
      return;
    }
    const channelIds = Array.from(document.querySelectorAll('#posts-create-channels input[name="channel_ids[]"]:checked')).map(cb => cb.value);
    const hasImages = postsFormMediaList.length > 0;
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Создаём...'; }
    try {
      if (hasImages) {
        const fd = new FormData();
        fd.append('content', content);
        fd.append('scheduled_at', scheduled_at);
        channelIds.forEach(id => fd.append('channel_ids[]', id));
        postsFormMediaList.forEach(item => fd.append('image[]', item.file));
        postsFormButtonsList.forEach((b, i) => {
          fd.append('buttons[' + i + '][text]', b.text);
          fd.append('buttons[' + i + '][url]', b.url);
        });
        await API.upload('/projects/' + project.id + '/posts', fd);
      } else {
        const body = { content, scheduled_at, channel_ids: channelIds.length ? channelIds : undefined };
        if (postsFormButtonsList.length) body.buttons = postsFormButtonsList;
        await API.post('/projects/' + project.id + '/posts', body);
      }
      closeCreateModal();
      if (typeof App !== 'undefined' && App.toast) App.toast('Пост создан и запланирован', 'success');
      render();
    } catch (err) {
      const msg = (err && err.message) || (err && err.data && err.data.message) || 'Не удалось создать пост. Попробуйте позже.';
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      if (typeof App !== 'undefined' && App.toast) App.toast(msg, 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
  }

  return { render };

})();
