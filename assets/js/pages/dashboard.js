/**
 * pages/dashboard.js — Дашборд
 */

const PageDashboard = (() => {

  function render() {
    const user    = State.get('user');
    const project = State.get('project');

    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return 'Доброе утро';
      if (h < 18) return 'Добрый день';
      return 'Добрый вечер';
    })();

    document.getElementById('page-container').innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${greeting}, ${user?.name?.split(' ')[0] || 'коллега'} 👋</h1>
          <p class="page-subtitle">${project ? `Проект: ${project.name}` : 'Выберите проект для начала работы'}</p>
        </div>
      </div>

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

      ${!project ? `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>Проект не выбран</h3>
          <p>Создайте или выберите проект, чтобы начать работу с контентом</p>
          <button class="btn btn-primary" onclick="App.navigate('/projects')">Перейти к проектам</button>
        </div>
      ` : ''}
    `;
  }

  return { render };

})();
