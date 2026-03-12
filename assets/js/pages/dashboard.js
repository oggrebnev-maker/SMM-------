/**
 * pages/dashboard.js — Дашборд
 */

const PageDashboard = (() => {

  let projects = [];

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
    const projectIcon = (p) => p && p.logo
      ? `<span class="posts-topbar-dropdown-icon"><img src="${p.logo}" alt=""></span>`
      : `<span class="posts-topbar-dropdown-dot" style="background:${p ? (p.color || '#6366f1') : '#9aa0b8'};"></span>`;

    const projectBlockHtml = `
      <div class="posts-topbar-block">
        <div class="posts-topbar-heading">Выбор проекта</div>
        <div class="posts-topbar-project">
          <button type="button" class="posts-topbar-dropdown" id="dashboard-project-btn" title="Выбор проекта">
            ${projectIcon(project)}
            <span class="posts-topbar-dropdown-label">${projectName}</span>
            <svg class="posts-topbar-dropdown-chevron" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div class="posts-topbar-dropdown-panel hidden" id="dashboard-project-panel">
            ${projects.length ? projects.map(p => `
              <button type="button" class="posts-topbar-dropdown-item ${project && p.id == project.id ? 'active' : ''}" data-id="${p.id}">
                ${p.logo ? `<span class="posts-topbar-dropdown-icon"><img src="${p.logo}" alt=""></span>` : `<span class="posts-topbar-dropdown-dot" style="background:${p.color || '#6366f1'};"></span>`}
                <span>${p.name}</span>
              </button>
            `).join('') : '<div class="posts-topbar-dropdown-empty">Нет проектов</div>'}
          </div>
        </div>
      </div>
    `;
    if (topbarLeft) topbarLeft.innerHTML = projectBlockHtml;

    if (container) container.innerHTML = `
      <div class="dashboard-page">
        <div class="dashboard-content">
      <div class="dashboard-cards">
        <div class="dash-card" onclick="App.navigate('/posts')">
          <div class="dash-card-icon" style="background:rgba(99,102,241,0.15);color:#6366f1">
            <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
              <path d="M4 4h12M4 8h12M4 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="dash-card-value">—</div>
          <div class="dash-card-label">Постов в этом месяце</div>
        </div>

        <div class="dash-card" onclick="App.navigate('/calendar')">
          <div class="dash-card-icon" style="background:rgba(34,211,238,0.12);color:#22d3ee">
            <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
              <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3 8h14M7 3v2M13 3v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="dash-card-value">—</div>
          <div class="dash-card-label">Запланировано</div>
        </div>

        <div class="dash-card" onclick="App.navigate('/drafts')">
          <div class="dash-card-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b">
            <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
              <path d="M13 3H7a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 8h4M8 11h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="dash-card-value">—</div>
          <div class="dash-card-label">Черновиков</div>
        </div>

        <div class="dash-card" onclick="App.navigate('/stats')">
          <div class="dash-card-icon" style="background:rgba(74,222,128,0.1);color:#4ade80">
            <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
              <path d="M3 15l4-5 4 2 4-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="dash-card-value">—</div>
          <div class="dash-card-label">Охват за неделю</div>
        </div>
      </div>
        </div>
      </div>
    `;

    const projectBtn = document.getElementById('dashboard-project-btn');
    const projectPanel = document.getElementById('dashboard-project-panel');
    if (projectBtn && projectPanel) {
      projectBtn.addEventListener('click', () => projectPanel.classList.toggle('hidden'));
      projectPanel.querySelectorAll('.posts-topbar-dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const p = projects.find(pr => pr.id == id);
          if (p) State.setProject(p);
          projectPanel.classList.add('hidden');
          render();
        });
      });
      document.addEventListener('click', (e) => {
        if (!projectBtn.contains(e.target) && !projectPanel.contains(e.target)) projectPanel.classList.add('hidden');
      });
    }
  }

  return { render };

})();
