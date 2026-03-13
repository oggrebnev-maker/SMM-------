const PagePublishSchedule = (function () {

  const DAYS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const DAYS_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

  let currentProjectId = null;
  let projects = [];
  let schedules = [];
  let modalHours = 12;
  let modalMins = 0;
  let modalDays = [];

  async function init(container) {
    container.innerHTML = '<div class="loading-state">Загрузка...</div>';
    projects = await loadProjects();
    if (!projects.length) {
      container.innerHTML = `<div class="page-header"><h1 class="page-title">Расписание публикаций</h1></div><div class="empty-state"><div class="empty-icon">📋</div><h3>Нет проектов</h3><p>Создайте проект чтобы настроить расписание</p></div>`;
      return;
    }
    // Выбираем проект из стейта или первый
    const stateProj = window.State ? State.get('project') : null;
    const stateProjId = stateProj ? (stateProj.id || null) : null;
    currentProjectId = (stateProjId && projects.find(p => p.id == stateProjId)) ? stateProjId : projects[0].id;
    render(container);
    await loadSchedules();
    renderGrid();
  }

  async function loadProjects() {
    try {
      const res = await API.get('/projects');
      return (res.data && res.data.projects) ? res.data.projects.filter(p => p.is_active) : [];
    } catch(e) { return []; }
  }

  async function loadSchedules() {
    try {
      const res = await API.get('/projects/' + currentProjectId + '/publish-schedules');
      schedules = (res.data && res.data.schedules) ? res.data.schedules : [];
    } catch(e) { schedules = []; }
  }

  function render(container) {
    const proj = projects.find(p => p.id == currentProjectId) || projects[0];
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Расписание публикаций</h1>
          <p class="page-subtitle">Время автоматической публикации постов по дням недели</p>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div class="ps-project-select-wrap">
          <select id="ps-project-select" class="ps-project-select">
            ${projects.map(p => `<option value="${p.id}" ${p.id == currentProjectId ? 'selected' : ''}>${escHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-sm ps-clear-btn-full" id="ps-clear-btn">
          <svg class="ps-clear-icon-svg" width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 6v9a1 1 0 001 1h4a1 1 0 001-1V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <span class="ps-clear-text-label"> Очистить расписание</span>
        </button>
      </div>
      <div id="ps-grid" class="ps-grid"></div>
      <div id="ps-modal" class="modal hidden">
        <div class="modal-backdrop" id="ps-modal-backdrop"></div>
        <div class="modal-box" style="width:520px;">
          <div class="modal-header">
            <h3>Добавить время в расписание</h3>
            <button class="btn-icon" id="ps-modal-close">
              <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div style="padding:24px;display:flex;gap:32px;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
              <div style="display:flex;gap:8px;">
                <button class="ps-time-btn" id="ps-h-up">▲</button>
                <button class="ps-time-btn" id="ps-m-up">▲</button>
              </div>
              <div id="ps-time-display" class="ps-time-display">12 : 00</div>
              <div style="display:flex;gap:8px;">
                <button class="ps-time-btn" id="ps-h-down">▼</button>
                <button class="ps-time-btn" id="ps-m-down">▼</button>
              </div>
            </div>
            <div style="flex:1;">
              <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
                <button class="ps-preset-btn" data-preset="weekdays">Будни</button>
                <button class="ps-preset-btn" data-preset="weekend">Выходные</button>
                <button class="ps-preset-btn" data-preset="all">Каждый день</button>
              </div>
              <div id="ps-days-list" style="display:flex;flex-direction:column;gap:8px;">
                ${[1,2,3,4,5,6,0].map(d => `
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:500;color:var(--text);">
                  <input type="checkbox" class="ps-day-check" data-day="${d}" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;">
                  ${DAYS[d]}
                </label>`).join('')}
              </div>
            </div>
          </div>
          <div style="padding:0 24px 24px;">
            <button class="btn btn-primary btn-full" id="ps-modal-save">Добавить в расписание</button>
          </div>
        </div>
      </div>`;

    bindEvents(container);
  }

  function renderGrid() {
    const grid = document.getElementById('ps-grid');
    if (!grid) return;
    // Дни: Пн=1..Вс=0, показываем Пн-Вс
    const order = [1,2,3,4,5,6,0];
    grid.innerHTML = `<div class="ps-grid-inner">` +
      order.map(d => {
        const daySlots = schedules.filter(s => parseInt(s.day_of_week) === d).sort((a,b) => a.time_of_day.localeCompare(b.time_of_day));
        return `<div class="ps-day-col">
          <div class="ps-day-head">
            <span>${DAYS[d]}</span>
            <button class="ps-add-btn" data-day="${d}" title="Добавить время">+</button>
          </div>
          <div class="ps-day-slots" id="ps-slots-${d}">
            ${daySlots.map(s => `
              <div class="ps-slot" data-id="${s.id}">
                <span>${s.time_of_day.slice(0,5)}</span>
                <button class="ps-slot-del" data-id="${s.id}" title="Удалить">×</button>
              </div>`).join('')}
          </div>
        </div>`;
      }).join('') +
    `</div>`;

    // Кнопки добавления в колонках
    grid.querySelectorAll('.ps-add-btn').forEach(btn => {
      btn.addEventListener('click', () => openModal(parseInt(btn.dataset.day)));
    });
    // Удаление слота
    grid.querySelectorAll('.ps-slot-del').forEach(btn => {
      btn.addEventListener('click', () => deleteSlot(parseInt(btn.dataset.id)));
    });
  }

  function bindEvents(container) {
    // Смена проекта
    document.getElementById('ps-project-select').addEventListener('change', async function() {
      currentProjectId = parseInt(this.value);
      await loadSchedules();
      renderGrid();
    });

    // Очистить расписание
    document.getElementById('ps-clear-btn').addEventListener('click', async () => {
      if (!confirm('Очистить всё расписание для этого проекта?')) return;
      try {
        await API.delete('/projects/' + currentProjectId + '/publish-schedules');
        schedules = [];
        renderGrid();
        showToast('Расписание очищено', 'success');
      } catch(e) { showToast('Ошибка', 'error'); }
    });

    // Модалка
    document.getElementById('ps-modal-close').addEventListener('click', closeModal);
    document.getElementById('ps-modal-backdrop').addEventListener('click', closeModal);

    // Кнопки времени
    document.getElementById('ps-h-up').addEventListener('click', () => { modalHours = (modalHours + 1) % 24; updateTimeDisplay(); });
    document.getElementById('ps-h-down').addEventListener('click', () => { modalHours = (modalHours - 1 + 24) % 24; updateTimeDisplay(); });
    document.getElementById('ps-m-up').addEventListener('click', () => { modalMins = (modalMins + 5) % 60; updateTimeDisplay(); });
    document.getElementById('ps-m-down').addEventListener('click', () => { modalMins = (modalMins - 5 + 60) % 60; updateTimeDisplay(); });

    // Пресеты
    document.querySelectorAll('.ps-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.preset;
        const checks = document.querySelectorAll('.ps-day-check');
        checks.forEach(c => {
          const d = parseInt(c.dataset.day);
          if (p === 'weekdays') c.checked = d >= 1 && d <= 5;
          else if (p === 'weekend') c.checked = d === 0 || d === 6;
          else c.checked = true;
        });
      });
    });

    // Сохранить
    document.getElementById('ps-modal-save').addEventListener('click', saveSlot);
  }

  function openModal(presetDay) {
    modalDays = presetDay !== undefined ? [presetDay] : [];
    modalHours = 12; modalMins = 0;
    updateTimeDisplay();
    // Сбрасываем чекбоксы
    document.querySelectorAll('.ps-day-check').forEach(c => {
      c.checked = (presetDay !== undefined && parseInt(c.dataset.day) === presetDay);
    });
    document.getElementById('ps-modal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('ps-modal').classList.add('hidden');
  }

  function updateTimeDisplay() {
    const h = String(modalHours).padStart(2, '0');
    const m = String(modalMins).padStart(2, '0');
    document.getElementById('ps-time-display').textContent = h + ' : ' + m;
  }

  async function saveSlot() {
    const days = [];
    document.querySelectorAll('.ps-day-check:checked').forEach(c => days.push(parseInt(c.dataset.day)));
    if (!days.length) { showToast('Выберите хотя бы один день', 'error'); return; }
    const h = String(modalHours).padStart(2, '0');
    const m = String(modalMins).padStart(2, '0');
    const time = h + ':' + m;
    try {
      const res = await API.post('/projects/' + currentProjectId + '/publish-schedules', { days, time });
      if (res.data && res.data.created) {
        schedules = schedules.concat(res.data.created);
      }
      closeModal();
      renderGrid();
      showToast('Добавлено в расписание', 'success');
    } catch(e) { showToast('Ошибка сохранения', 'error'); }
  }

  async function deleteSlot(id) {
    try {
      await API.delete('/projects/' + currentProjectId + '/publish-schedules/' + id);
      schedules = schedules.filter(s => s.id != id);
      renderGrid();
    } catch(e) { showToast('Ошибка удаления', 'error'); }
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function showToast(msg, type) { if(window.App && App.showToast) App.showToast(msg, type); }

  return { init };
})();
