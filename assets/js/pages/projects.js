/**
 * pages/projects.js — Список и создание проектов
 */
const PageProjects = (() => {

  let projects = [];
  let dragSrc  = null;

  async function render() {
    const container = document.getElementById('page-container');
    container.innerHTML = '<div class="loading-state">Загрузка...</div>';

    try {
      const res = await API.get('/projects');
      projects = (res.data && res.data.projects) ? res.data.projects : [];
    } catch (e) {
      container.innerHTML = '<div class="error-state">Ошибка загрузки</div>';
      return;
    }

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:24px;">
        <div>
          <div class="page-title">Проекты</div>
          <div class="page-subtitle">Ваши рабочие пространства</div>
        </div>
      </div>

      <div id="projects-list"></div>

      <!-- Панель настроек проекта -->
      <div id="proj-settings-overlay" style="position:fixed;inset:0;z-index:800;background:rgba(26,32,53,0.25);backdrop-filter:blur(2px);display:none;"></div>
      <!-- UTM панель -->
      <div id="proj-utm-panel" style="position:fixed;top:0;right:0;width:380px;max-width:100vw;height:100vh;background:var(--surface);border-left:1px solid var(--border);box-shadow:-8px 0 32px rgba(51,63,100,0.12);z-index:950;display:none;flex-direction:column;">
        <div style="padding:24px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="btn-icon" id="proj-utm-back">
              <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-8 6 8 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div style="font-size:15px;font-weight:800;color:var(--text);">UTM-метки</div>
          </div>
          <button class="btn-icon" id="proj-utm-close">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px;">
          <p style="font-size:13px;color:var(--text2);line-height:1.5;">UTM-метки автоматически добавляются к ссылкам в публикациях этого проекта.</p>
          <div class="form-group">
            <label>utm_source</label>
            <input type="text" id="proj-utm-source" placeholder="telegram, vk, ok...">
          </div>
          <div class="form-group">
            <label>utm_medium</label>
            <input type="text" id="proj-utm-medium" placeholder="social, post...">
          </div>
          <div class="form-group">
            <label>utm_campaign</label>
            <input type="text" id="proj-utm-campaign" placeholder="название кампании">
          </div>
          <div class="form-group">
            <label>utm_content <span style="font-size:11px;color:var(--muted);font-weight:400;">(необязательно)</span></label>
            <input type="text" id="proj-utm-content" placeholder="{post_id}, баннер...">
          </div>
          <div id="proj-utm-error" class="form-error hidden"></div>
        </div>
        <div style="padding:0 24px 24px;display:flex;gap:10px;">
          <button class="btn btn-secondary" id="proj-utm-cancel" style="flex:1;">Отмена</button>
          <button class="btn btn-primary" id="proj-utm-save" style="flex:2;">Сохранить</button>
        </div>
      </div>
      <div id="proj-settings-panel" style="position:fixed;top:0;right:0;width:380px;max-width:100vw;height:100vh;background:var(--surface);border-left:1px solid var(--border);box-shadow:-8px 0 32px rgba(51,63,100,0.12);z-index:900;display:none;flex-direction:column;">
        <!-- Заголовок -->
        <div style="padding:24px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:15px;font-weight:800;color:var(--text);">Настройки проекта</div>
          <button class="btn-icon" id="proj-panel-close">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <!-- Быстрые действия -->
        <div style="padding:12px 24px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:2px;">
          <button id="proj-panel-add-channel" style="display:inline-flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border);padding:9px 14px;border-radius:var(--btn-radius);cursor:pointer;font-family:inherit;color:var(--accent);font-size:13px;font-weight:600;transition:all .15s;width:100%;text-align:left;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="14" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="14" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 13c0-1.657.895-3 2-3h2c1.105 0 2 1.343 2 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <span style="flex:1;">Добавить аккаунт</span>
            <span id="proj-btn-channels-badge" style="display:none;background:#4ade80;color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px;"></span>
          </button>
          <a href="#/publish-schedule" id="proj-schedule-btn" style="display:inline-flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border);padding:9px 14px;border-radius:var(--btn-radius);cursor:pointer;font-family:inherit;color:var(--accent);font-size:13px;font-weight:600;text-decoration:none;transition:all .15s;width:100%;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'" onclick="document.getElementById('proj-settings-panel').style.display='none';document.getElementById('proj-settings-overlay').style.display='none';">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <span style="flex:1;">Настроить расписание</span>
            <span id="proj-btn-schedule-badge" style="display:none;">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#4ade80"/><path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </a>
          <button id="proj-utm-open-btn" style="display:inline-flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border);padding:9px 14px;border-radius:var(--btn-radius);cursor:pointer;font-family:inherit;color:var(--accent);font-size:13px;font-weight:600;transition:all .15s;width:100%;text-align:left;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 10h14M3 6h14M3 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <span style="flex:1;">UTM-метки</span>
            <span id="proj-btn-utm-badge" style="display:none;">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#4ade80"/><path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:24px;">
          <input type="hidden" id="proj-panel-id">

          <!-- Аватар -->
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px;">Логотип проекта</div>
            <div style="display:flex;align-items:center;gap:16px;">
              <div id="proj-panel-avatar" style="width:64px;height:64px;border-radius:12px;background:var(--accent-lt);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1.5px solid var(--border);">
                <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="var(--muted)" stroke-width="1.5"/></svg>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <label class="btn btn-ghost btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                  Загрузить
                  <input type="file" id="proj-panel-logo-input" accept="image/*" style="display:none;">
                </label>
                <button class="btn btn-ghost btn-sm" id="proj-panel-logo-delete" style="display:none;">Удалить</button>
              </div>
            </div>
          </div>

          <!-- Название -->
          <div class="form-group">
            <label>Название *</label>
            <input type="text" id="proj-panel-name" placeholder="Название проекта" maxlength="150">
          </div>

          <!-- Описание -->
          <div class="form-group">
            <label>Описание</label>
            <textarea id="proj-panel-desc" placeholder="О чём этот проект..." rows="3"></textarea>
          </div>

          <!-- Цвет -->
          <div class="form-group" id="proj-panel-color-section">
            <label>Цвет метки</label>
            <div class="color-picker" id="proj-panel-colors">
              ${['#6366f1','#22d3ee','#f59e0b','#4ade80','#f87171','#e879f9','#fb923c','#333f64','#fc3f1d'].map(c =>
                `<div class="color-dot proj-panel-color-dot" data-color="${c}" style="background:${c}"></div>`
              ).join('')}
            </div>
            <input type="hidden" id="proj-panel-color">
          </div>

          <div id="proj-panel-error" class="form-error hidden"></div>
          <button class="btn btn-primary" id="proj-panel-save" style="width:100%;margin-bottom:24px;">Сохранить</button>
          <button id="proj-panel-cancel" style="display:none;"></button>

          <!-- Подключённые аккаунты (скрытые, нужны для загрузки бейджей) -->
          <div style="display:none;"><div id="proj-panel-channels"></div></div>
          <div style="display:none;"><div id="proj-schedule-info"></div></div>
          <div style="display:none;"><div id="proj-utm-status"></div></div>
        </div>
      </div>

      <!-- Модал создания/редактирования проекта -->
      <div id="project-modal" class="modal hidden">
        <div class="modal-backdrop" id="modal-backdrop"></div>
        <div class="modal-box">
          <div class="modal-header">
            <h3 id="project-modal-title">Новый проект</h3>
            <button class="btn-icon" id="modal-close">
              <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <form id="project-form" style="padding:22px 26px;display:flex;flex-direction:column;gap:16px;">
            <input type="hidden" id="proj-id">
            <div class="form-group">
              <label>Название *</label>
              <input type="text" id="proj-name" placeholder="Бренд «Кофейня»" maxlength="150">
            </div>
            <div class="form-group">
              <label>Описание</label>
              <textarea id="proj-desc" placeholder="О чём этот проект..." rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Цвет метки</label>
              <div class="color-picker">
                ${['#6366f1','#22d3ee','#f59e0b','#4ade80','#f87171','#e879f9','#fb923c','#333f64','#fc3f1d'].map(c => `
                  <div class="color-dot" data-color="${c}" style="background:${c}"></div>
                `).join('')}
              </div>
              <input type="hidden" id="proj-color" value="#6366f1">
            </div>
            <div id="project-form-error" class="form-error hidden"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" id="modal-cancel">Отмена</button>
              <button type="submit" class="btn btn-primary" id="proj-submit">
                <span class="btn-text">Создать</span>
                <span class="btn-loader hidden">⟳</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Полноэкранное окно проекта (как редактирование поста) -->
      <div id="project-view-modal" class="project-view-modal">
        <div class="project-view-backdrop" id="project-view-backdrop"></div>
        <div class="project-view-panel">
          <div class="project-view-header">
            <div class="project-view-header-left">
              <div class="project-view-avatar" id="project-view-avatar"></div>
              <h3 class="project-view-title" id="project-view-title">Проект</h3>
            </div>
            <button type="button" class="btn-icon" id="project-view-close" aria-label="Закрыть">
              <svg viewBox="0 0 20 20" fill="none" width="20" height="20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="project-view-body">
            <div class="project-view-main" id="project-view-main">
              <div id="project-view-section-general" class="project-view-section" data-section="general">
                <div class="project-view-section-inner">
                  <div class="project-view-card">
                    <h2 class="project-view-section-title">Общие настройки</h2>
                    <div class="form-group">
                      <label>Аватар</label>
                      <div class="project-view-avatar-field">
                        <div class="project-view-avatar-row">
                          <div class="project-view-form-avatar" id="project-view-form-avatar"></div>
                          <div class="project-view-avatar-actions">
                            <label class="btn btn-ghost btn-sm" for="project-view-logo-input">Загрузить</label>
                            <input type="file" id="project-view-logo-input" accept="image/*" style="display:none">
                            <button type="button" class="btn btn-danger btn-sm" id="project-view-logo-delete" style="display:none">Удалить</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="form-group" id="project-view-color-wrap">
                      <label>Цвет метки</label>
                      <div class="project-view-colors" id="project-view-colors"></div>
                      <input type="hidden" id="project-view-color">
                    </div>
                    <div class="form-group">
                      <label>Название проекта</label>
                      <input type="text" id="project-view-name" placeholder="Название проекта" maxlength="150">
                    </div>
                    <div class="form-group">
                      <label>Описание проекта</label>
                      <textarea id="project-view-desc" placeholder="О чём этот проект..." rows="3"></textarea>
                    </div>
                    <div class="form-group">
                      <label>Добавить в команду</label>
                      <div class="project-view-team-dropdown" id="project-view-team-dropdown">
                        <div class="project-view-team-empty" id="project-view-team-empty">
                          <button type="button" class="project-view-team-add-btn" id="project-view-create-team-btn">+</button>
                          <span class="project-view-team-empty-placeholder">Создать команду</span>
                        </div>
                        <div id="project-view-teams-list" class="project-view-teams-list"></div>
                      </div>
                    </div>
                    <div id="project-view-general-error" class="form-error hidden"></div>
                    <div class="project-view-save-wrap">
                      <button type="button" class="btn btn-primary btn-size-1 btn-full" id="project-view-general-save">Сохранить</button>
                    </div>
                  </div>
                </div>
              </div>
              <div id="project-view-section-schedule" class="project-view-section hidden" data-section="schedule">
                <div class="project-view-section-inner">
                  <div class="project-view-card">
                    <h2 class="project-view-section-title">Расписание публикаций</h2>
                    <p class="project-view-section-desc">Укажите время публикации постов проекта, которое будет проставляться по умолчанию. Это упростит и ускорит процесс создания материалов.</p>
                    <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
                      <button type="button" class="btn btn-danger btn-sm" id="project-view-schedule-clear">Очистить расписание</button>
                    </div>
                    <div id="project-view-ps-grid" class="ps-grid"></div>
                  </div>
                </div>
                <div id="project-view-ps-modal" class="modal hidden">
                  <div class="modal-backdrop" id="project-view-ps-modal-backdrop"></div>
                  <div class="modal-box" style="width:520px;">
                    <div class="modal-header">
                      <h3>Добавить время в расписание</h3>
                      <button type="button" class="btn-icon" id="project-view-ps-modal-close"><svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
                    </div>
                    <div style="padding:24px;display:flex;gap:32px;">
                      <div class="ps-time-picker">
                        <div class="ps-time-col">
                          <button type="button" class="ps-time-btn" id="project-view-ps-h-up">▲</button>
                          <span id="project-view-ps-time-hours" class="ps-time-part">12</span>
                          <button type="button" class="ps-time-btn" id="project-view-ps-h-down">▼</button>
                        </div>
                        <span class="ps-time-sep">:</span>
                        <div class="ps-time-col">
                          <button type="button" class="ps-time-btn" id="project-view-ps-m-up">▲</button>
                          <span id="project-view-ps-time-mins" class="ps-time-part">00</span>
                          <button type="button" class="ps-time-btn" id="project-view-ps-m-down">▼</button>
                        </div>
                      </div>
                      <div style="flex:1;">
                        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
                          <button type="button" class="ps-preset-btn" data-preset="weekdays">Будни</button>
                          <button type="button" class="ps-preset-btn" data-preset="weekend">Выходные</button>
                          <button type="button" class="ps-preset-btn" data-preset="all">Каждый день</button>
                        </div>
                        <div id="project-view-ps-days-list" style="display:flex;flex-direction:column;gap:8px;">
                          ${['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'].map((dayName, i) => {
                            const d = [0,1,2,3,4,5,6][i];
                            return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:500;color:var(--text);">
                              <input type="checkbox" class="project-view-ps-day-check" data-day="${d}" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;">
                              ${dayName}
                            </label>`;
                          }).join('')}
                        </div>
                      </div>
                    </div>
                    <div style="padding:0 24px 24px;">
                      <button type="button" class="btn btn-primary btn-full" id="project-view-ps-modal-save">Добавить в расписание</button>
                    </div>
                  </div>
                </div>
              </div>
              <div id="project-view-section-fields" class="project-view-section hidden" data-section="fields">
                <div class="project-view-section-inner">
                  <div class="project-view-card">
                    <h2 class="project-view-section-title">Аккаунты проекта</h2>
                    <p class="project-view-section-desc">Подключённые аккаунты доступны при планировании постов в этом проекте.</p>
                    <div class="project-view-channels-actions">
                      <button type="button" class="btn btn-primary btn-size-2" id="project-view-add-account-btn">Добавить существующий</button>
                      <a href="#/social-accounts" class="btn btn-ghost btn-size-2" id="project-view-connect-account-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v12"/><path d="M4 10h12"/></svg><span>Создать новый</span></a>
                    </div>
                    <h3 class="project-view-channels-heading">Подключенные аккаунты</h3>
                    <div id="project-view-channels-wrap" class="project-view-channels-wrap"></div>
                  </div>
                </div>
              </div>
              <div id="project-view-section-watermark" class="project-view-section hidden" data-section="watermark"><p class="project-view-placeholder">Вотермарк</p></div>
              <div id="project-view-section-templates" class="project-view-section hidden" data-section="templates"><p class="project-view-placeholder">Шаблоны</p></div>
              <div id="project-view-section-hashtags" class="project-view-section hidden" data-section="hashtags"><p class="project-view-placeholder">Хэштеги</p></div>
              <div id="project-view-section-utm" class="project-view-section hidden" data-section="utm">
                <div class="project-view-section-inner">
                  <div class="project-view-card">
                    <h2 class="project-view-section-title">UTM метки</h2>
                    <p class="project-view-section-desc">Параметры UTM добавляются к ссылке и передают в системы аналитики (Яндекс.Метрика, Google Analytics) данные об источнике перехода. Так вы сможете видеть, откуда приходит трафик и насколько эффективны рекламные кампании.</p>
                    <div class="project-view-utm-head">
                      <label class="project-view-utm-enable">
                        <input type="checkbox" id="project-view-utm-enabled" class="project-view-utm-checkbox">
                        <span>Включить UTM генератор</span>
                      </label>
                      <span class="project-view-utm-help" id="project-view-utm-help">
                        <span class="project-view-utm-help-tooltip">Когда пост публикуется, система сама заменяет специальные метки на настоящие данные. Например, вместо метки {post_date} появится реальная дата публикации, вместо {page_name} — название вашей страницы, и так далее. Вот полный список таких меток:<ul class="project-view-utm-help-list"><li><code>{page_id}</code> — ID страницы в соцсети</li><li><code>{page_name}</code> — название страницы в соцсети</li><li><code>{post_datetime}</code> — дата и время публикации</li><li><code>{post_date}</code> — дата публикации</li><li><code>{post_num}</code> — номер поста</li><li><code>{post_time}</code> — время публикации</li><li><code>{project}</code> — название проекта</li><li><code>{soc_net}</code> — соцсеть</li></ul></span>?</span>
                    </div>
                    <div class="project-view-utm-fields">
                      <div class="form-group">
                        <div class="project-view-utm-label-row">
                          <label>utm_campaign</label>
                          <span class="project-view-utm-field-help" id="project-view-utm-campaign-help" role="button" title="Подсказка">?</span>
                        </div>
                        <p class="project-view-utm-field-hint project-view-utm-field-hint--closed" id="project-view-utm-campaign-hint">Это название конкретной рекламной кампании, которое вы сами придумываете и добавляете в ссылку. Нужна для того, чтобы в аналитике сразу было видно, из какой именно кампании пришёл посетитель. <strong>Пример: utm_campaign=black_friday</strong> — значит, человек перешёл по ссылке из акции «Чёрная пятница».</p>
                        <input type="text" id="project-view-utm-campaign" class="form-control" placeholder="{page_id}">
                      </div>
                      <div class="form-group">
                        <div class="project-view-utm-label-row">
                          <label>utm_content</label>
                          <span class="project-view-utm-field-help" id="project-view-utm-content-help" role="button" title="Подсказка">?</span>
                        </div>
                        <p class="project-view-utm-field-hint project-view-utm-field-hint--closed" id="project-view-utm-content-hint">Уточняет, на какой именно элемент объявления нажал пользователь. Используется, когда в одной кампании несколько похожих ссылок и нужно понять, какая из них сработала лучше. <strong>Пример: utm_content=button_top</strong> — человек нажал на кнопку в верхней части страницы, а не на ссылку в тексте.</p>
                        <input type="text" id="project-view-utm-content" class="form-control" placeholder="{post_num}">
                      </div>
                      <div class="form-group">
                        <div class="project-view-utm-label-row">
                          <label>utm_medium</label>
                          <span class="project-view-utm-field-help" id="project-view-utm-medium-help" role="button" title="Подсказка">?</span>
                        </div>
                        <p class="project-view-utm-field-hint project-view-utm-field-hint--closed" id="project-view-utm-medium-hint">Указывает канал или способ, через который пришёл пользователь.</p>
                        <ul class="project-view-utm-hint-list project-view-utm-hint-list-medium">
                          <li><strong>utm_medium=cpc</strong> — платная реклама (клик по объявлению)</li>
                          <li><strong>utm_medium=email</strong> — переход из email-рассылки</li>
                          <li><strong>utm_medium=social</strong> — публикация в социальных сетях</li>
                        </ul>
                        <input type="text" id="project-view-utm-medium" class="form-control" placeholder="{page_name}">
                      </div>
                      <div class="form-group">
                        <div class="project-view-utm-label-row">
                          <label>utm_source</label>
                          <span class="project-view-utm-field-help" id="project-view-utm-source-help" role="button" title="Подсказка">?</span>
                        </div>
                        <p class="project-view-utm-field-hint project-view-utm-field-hint--closed" id="project-view-utm-source-hint">Указывает конкретный источник, с которого пришёл пользователь.</p>
                        <ul class="project-view-utm-hint-list project-view-utm-hint-list-source">
                          <li><strong>utm_source=google</strong> — пришёл из Google</li>
                          <li><strong>utm_source=vk</strong> — пришёл из ВКонтакте</li>
                          <li><strong>utm_source=newsletter</strong> — пришёл из email-рассылки</li>
                        </ul>
                        <input type="text" id="project-view-utm-source" class="form-control" placeholder="{soc_net}">
                      </div>
                      <div class="form-group">
                        <div class="project-view-utm-label-row">
                          <label>utm_term</label>
                          <span class="project-view-utm-field-help" id="project-view-utm-term-help" role="button" title="Подсказка">?</span>
                        </div>
                        <p class="project-view-utm-field-hint project-view-utm-field-hint--closed" id="project-view-utm-term-hint">Фиксирует ключевое слово, по которому было показано рекламное объявление. Используется в основном в контекстной рекламе, чтобы понять, какой именно поисковый запрос привёл пользователя. <strong>Пример: utm_term=купить+масло+моторное</strong> — пользователь увидел объявление, когда искал «купить масло моторное».</p>
                        <input type="text" id="project-view-utm-term" class="form-control" placeholder="{post_datetime}">
                      </div>
                    </div>
                    <div class="project-view-save-wrap">
                      <button type="button" class="btn btn-primary btn-size-1 btn-full" id="project-view-utm-save">Сохранить</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="project-view-sidebar" id="project-view-sidebar">
              <div class="project-view-sidebar-title">Настройки проекта</div>
              <nav class="project-view-nav">
                <button type="button" class="project-settings-nav-btn active" data-section="general" id="project-nav-general">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.98a2 2 0 0 1 1.69.9l.66 1.2A2 2 0 0 0 12 6h8a2 2 0 0 1 2 2v3.3"/><path d="m14.305 19.53.923-.382"/><path d="m15.228 16.852-.923-.383"/><path d="m16.852 15.228-.383-.923"/><path d="m16.852 20.772-.383.924"/><path d="m19.148 15.228.383-.923"/><path d="m19.53 21.696-.382-.924"/><path d="m20.772 16.852.924-.383"/><path d="m20.772 19.148.924.383"/><circle cx="18" cy="18" r="3"/></svg>
                  <span>Общие настройки</span><svg class="project-settings-nav-check" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>
                </button>
                <button type="button" class="project-settings-nav-btn" data-section="fields" id="project-nav-fields">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="14" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="14" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 13c0-1.657.895-3 2-3h2c1.105 0 2 1.343 2 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  <span>Аккаунты проекта</span><span class="project-settings-nav-status" id="project-nav-status-fields">не добавлены</span><svg class="project-settings-nav-check" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>
                </button>
                <button type="button" class="project-settings-nav-btn" data-section="schedule" id="project-nav-schedule">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <span>Расписание</span><span class="project-settings-nav-status" id="project-nav-status-schedule">не настроено</span><svg class="project-settings-nav-check" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>
                </button>
                <button type="button" class="project-settings-nav-btn" data-section="utm" id="project-nav-utm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  <span>UTM метки</span><span class="project-settings-nav-status" id="project-nav-status-utm">не добавлены</span><svg class="project-settings-nav-check" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>
                </button>
                <button type="button" class="project-settings-nav-btn" data-section="templates" id="project-nav-templates">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                  <span>Шаблоны</span><span class="project-settings-nav-status" id="project-nav-status-templates">не добавлены</span><svg class="project-settings-nav-check" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>
                </button>
                <button type="button" class="project-settings-nav-btn" data-section="hashtags" id="project-nav-hashtags">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3L8 21"/><path d="M16 3l-2 18"/></svg>
                  <span>Хэштеги</span><span class="project-settings-nav-status" id="project-nav-status-hashtags">не добавлены</span><svg class="project-settings-nav-check" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>
                </button>
                <button type="button" class="project-settings-nav-btn" data-section="watermark" id="project-nav-watermark">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.001 15.085A1.5 1.5 0 0 1 9 16.5"/><circle cx="18.5" cy="8.5" r="3.5"/><circle cx="7.5" cy="16.5" r="5.5"/><circle cx="7.5" cy="4.5" r="2.5"/></svg>
                  <span>Watermark</span><span class="project-settings-nav-status" id="project-nav-status-watermark">не добавлен</span><svg class="project-settings-nav-check" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    `;

    renderList();
    initModal();
    initColorPicker();
    initProjectViewModal();
    const path = (location.hash || '#').replace('#', '').split('?')[0];
    if (path === '/projects/create') openModal(null);
  }

  function renderList() {
    const el = document.getElementById('projects-list');
    if (!el) return;

    if (!projects.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:60px 0;">
          <div class="empty-icon">📁</div>
          <h3>Нет проектов</h3>
          <p>Создайте первый проект, чтобы начать работу</p>
        </div>`;
      return;
    }

    const current = State.get('project');

    el.innerHTML = `
      <div id="proj-cards-list" style="display:flex;flex-direction:column;gap:10px;">
        ${projects.map(p => renderProjectCard(p, current)).join('')}
      </div>`;

    initDragDrop();
    bindCardEvents();
  }

  function renderProjectCard(p, current) {
    const isActive = current && current.id == p.id;
    return `
      <div draggable="true" data-id="${p.id}"
        class="proj-card" style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:14px 16px;background:var(--surface);border:1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'};border-radius:12px;transition:box-shadow .15s,border-color .15s;${isActive ? 'background:var(--accent-lt);' : ''}">

        <span class="proj-drag-handle" style="display:flex;align-items:center;color:var(--muted);cursor:grab;padding:2px 4px;flex-shrink:0;">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4" cy="3" r="1.2" fill="currentColor"/>
            <circle cx="4" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="4" cy="11" r="1.2" fill="currentColor"/>
            <circle cx="10" cy="3" r="1.2" fill="currentColor"/>
            <circle cx="10" cy="7" r="1.2" fill="currentColor"/>
            <circle cx="10" cy="11" r="1.2" fill="currentColor"/>
          </svg>
        </span>

        <!-- Цветная метка / логотип -->
        <div style="width:40px;height:40px;border-radius:10px;background:${p.logo ? 'transparent' : (p.color || '#6366f1')};flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:${p.logo ? '50%' : '10px'};border:${p.logo ? '1.5px solid var(--border)' : 'none'};">
          ${p.logo
            ? `<img src="${p.logo}" style="width:100%;height:100%;object-fit:cover;">`
            : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/></svg>`
          }
        </div>

        <!-- Инфо -->
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:3px;">
            ${p.description
              ? `<span style="font-size:12px;color:var(--muted);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.description.length > 100 ? p.description.substring(0,100)+'…' : p.description}</span>`
              : '<span style="font-size:12px;color:var(--muted);font-weight:500;font-style:italic;">Без описания</span>'
            }
          </div>
        </div>

        <!-- Действия -->
        <div class="proj-card-actions" style="display:flex;gap:4px;flex-shrink:0;">
          <button class="btn-icon proj-settings-btn" data-id="${p.id}" title="Редактировать" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
          <button type="button" class="btn-icon proj-team-btn" data-id="${p.id}" title="Команда" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);color:inherit;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg></button>
          <button class="btn-icon proj-delete-btn" data-id="${p.id}" title="Удалить" style="width:34px;height:34px;border-radius:8px;background:rgba(252,63,29,0.07);border:1.5px solid rgba(252,63,29,0.2);color:var(--red);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>

        <!-- Мобильные действия снизу -->
        <div class="sa-card-actions-bottom" style="width:100%;display:flex;gap:4px;padding-top:8px;border-top:1px solid var(--border);">
          <button class="btn-icon proj-settings-btn" data-id="${p.id}" title="Редактировать" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
          <button type="button" class="btn-icon proj-team-btn" data-id="${p.id}" title="Команда" style="width:34px;height:34px;border-radius:8px;background:var(--bg);border:1.5px solid var(--border);color:inherit;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg></button>
          <button class="btn-icon proj-delete-btn" data-id="${p.id}" title="Удалить" style="width:34px;height:34px;border-radius:8px;background:rgba(252,63,29,0.07);border:1.5px solid rgba(252,63,29,0.2);color:var(--red);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>

      </div>`;
  }

  function bindCardEvents() {
    document.querySelectorAll('.proj-select-btn').forEach(btn => {
      btn.addEventListener('click', () => selectProject(btn.dataset.id));
    });
    document.querySelectorAll('.proj-settings-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openSettingsPanel(btn.dataset.id); });
    });
    document.querySelectorAll('.proj-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteProject(btn.dataset.id); });
    });
    document.querySelectorAll('.proj-team-btn').forEach(btn => {
      btn.addEventListener('click', (e) => e.stopPropagation());
    });
    document.querySelectorAll('#proj-cards-list > div[data-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openProjectView(card.dataset.id);
      });
    });
  }

  let currentProjectViewId = null;

  function openProjectView(projectId) {
    const p = projects.find(x => x.id == projectId);
    if (!p) return;
    currentProjectViewId = p.id;
    const modal = document.getElementById('project-view-modal');
    const titleEl = document.getElementById('project-view-title');
    const avatarEl = document.getElementById('project-view-avatar');
    if (titleEl) titleEl.textContent = p.name;
    if (avatarEl) {
      const color = p.color || '#6366f1';
      if (p.logo) {
        avatarEl.innerHTML = `<img src="${p.logo}" alt="">`;
        avatarEl.style.background = 'transparent';
        avatarEl.style.borderRadius = '50%';
      } else {
        avatarEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/></svg>`;
        avatarEl.style.background = color;
        avatarEl.style.borderRadius = '10px';
      }
    }
    switchProjectViewSection('general');
    fillProjectViewGeneralForm(p);
    updateProjectViewNavStatuses(p);
    if (modal) modal.classList.add('project-view-modal--open');
  }

  /**
   * @param {{ title: string, text?: string, okLabel?: string }} opts
   */
  function projectViewConfirm(opts) {
    const title = typeof opts === 'string' ? opts : opts.title;
    const text = typeof opts === 'string' ? '' : (opts.text || '');
    const okLabel = (typeof opts === 'object' && opts.okLabel) ? opts.okLabel : 'Удалить';
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'project-view-confirm-backdrop';
      overlay.innerHTML = `
        <div class="project-view-confirm-box">
          <div class="project-view-confirm-title">${title}</div>
          ${text ? `<div class="project-view-confirm-text">${text}</div>` : ''}
          <div class="project-view-confirm-actions">
            <button type="button" class="btn btn-secondary btn-size-2" data-role="cancel">Отмена</button>
            <button type="button" class="btn btn-danger btn-size-2" data-role="ok">${okLabel}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      overlay.querySelector('[data-role="ok"]').addEventListener('click', () => close(true));
      overlay.querySelector('[data-role="cancel"]').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
    });
  }

  function updateProjectViewNavStatuses(p) {
    const setStatus = (id, text, isSet) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.classList.toggle('is-set', !!isSet);
    };
    setStatus('project-nav-status-fields', 'не добавлены', false);
    setStatus('project-nav-status-schedule', 'не настроено', false);
    setStatus('project-nav-status-utm', 'не добавлены', false);
    setStatus('project-nav-status-templates', 'не добавлены', false);
    setStatus('project-nav-status-hashtags', 'не добавлены', false);
    setStatus('project-nav-status-watermark', 'не добавлен', false);

    API.get('/projects/' + p.id + '/channels').then(res => {
      const channels = (res.data && res.data.channels) ? res.data.channels : [];
      setStatus('project-nav-status-fields', channels.length ? 'добавлены' : 'не добавлены', channels.length > 0);
    }).catch(() => {});

    API.get('/projects/' + p.id + '/publish-schedules').then(res => {
      const slots = (res.data && res.data.schedules) ? res.data.schedules : [];
      setStatus('project-nav-status-schedule', slots.length ? 'настроено' : 'не настроено', slots.length > 0);
    }).catch(() => {});

    const utm = p.utm_template ? (typeof p.utm_template === 'string' ? JSON.parse(p.utm_template) : p.utm_template) : {};
    const hasUtm = !!(utm.enabled !== false && (utm.source || utm.medium || utm.campaign || utm.content || utm.term));
    setStatus('project-nav-status-utm', hasUtm ? 'добавлены' : 'не добавлены', hasUtm);

    if (p.templates_count !== undefined && p.templates_count > 0) {
      setStatus('project-nav-status-templates', 'добавлены', true);
    }
    if (p.hashtags_count !== undefined && p.hashtags_count > 0) {
      setStatus('project-nav-status-hashtags', 'добавлены', true);
    }
    if (p.watermark_added) {
      setStatus('project-nav-status-watermark', 'добавлен', true);
    }
  }

  function switchProjectViewSection(sectionId) {
    document.querySelectorAll('.project-view-section').forEach(el => {
      el.classList.toggle('hidden', el.dataset.section !== sectionId);
    });
    document.querySelectorAll('.project-settings-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    if (sectionId === 'fields' && currentProjectViewId) {
      renderProjectViewChannels(currentProjectViewId);
    }
    if (sectionId === 'schedule' && currentProjectViewId) {
      loadProjectViewSchedules().then(() => renderProjectViewScheduleGrid());
    }
    if (sectionId === 'utm' && currentProjectViewId) {
      const p = projects.find(x => x.id == currentProjectViewId);
      if (p) fillProjectViewUtmForm(p);
    }
  }

  const PROJECT_VIEW_DAYS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  let projectViewSchedules = [];
  let projectViewScheduleModalHours = 12;
  let projectViewScheduleModalMins = 0;

  async function loadProjectViewSchedules() {
    if (!currentProjectViewId) return;
    try {
      const res = await API.get('/projects/' + currentProjectViewId + '/publish-schedules');
      projectViewSchedules = (res.data && res.data.schedules) ? res.data.schedules : [];
    } catch (e) {
      projectViewSchedules = [];
    }
  }

  function renderProjectViewScheduleGrid() {
    const grid = document.getElementById('project-view-ps-grid');
    if (!grid) return;
    const order = [1, 2, 3, 4, 5, 6, 0];
    grid.innerHTML = '<div class="ps-grid-inner">' +
      order.map(d => {
        const daySlots = projectViewSchedules.filter(s => parseInt(s.day_of_week) === d).sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
        return `<div class="ps-day-col">
          <div class="ps-day-head">
            <span>${PROJECT_VIEW_DAYS[d]}</span>
            <button type="button" class="ps-add-btn project-view-ps-add-btn" data-day="${d}" title="Добавить время">+</button>
          </div>
          <div class="ps-day-slots" id="project-view-ps-slots-${d}">
            ${daySlots.map(s => `
              <div class="ps-slot" data-id="${s.id}">
                <span>${s.time_of_day.slice(0, 5)}</span>
                <button type="button" class="ps-slot-del project-view-ps-slot-del" data-id="${s.id}" title="Удалить">×</button>
              </div>`).join('')}
          </div>
        </div>`;
      }).join('') +
      '</div>';
    grid.querySelectorAll('.project-view-ps-add-btn').forEach(btn => {
      btn.addEventListener('click', () => openProjectViewScheduleModal(parseInt(btn.dataset.day)));
    });
    grid.querySelectorAll('.project-view-ps-slot-del').forEach(btn => {
      btn.addEventListener('click', () => deleteProjectViewScheduleSlot(parseInt(btn.dataset.id)));
    });
  }

  function openProjectViewScheduleModal(presetDay) {
    projectViewScheduleModalHours = 12;
    projectViewScheduleModalMins = 0;
    const modal = document.getElementById('project-view-ps-modal');
    if (!modal) return;
    const hoursEl = document.getElementById('project-view-ps-time-hours');
    const minsEl = document.getElementById('project-view-ps-time-mins');
    if (hoursEl) hoursEl.textContent = String(projectViewScheduleModalHours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(projectViewScheduleModalMins).padStart(2, '0');
    modal.querySelectorAll('.project-view-ps-day-check').forEach(c => {
      c.checked = presetDay !== undefined && parseInt(c.dataset.day) === presetDay;
    });
    modal.classList.remove('hidden');
  }

  function closeProjectViewScheduleModal() {
    document.getElementById('project-view-ps-modal').classList.add('hidden');
  }

  function updateProjectViewScheduleTimeDisplay() {
    const hoursEl = document.getElementById('project-view-ps-time-hours');
    const minsEl = document.getElementById('project-view-ps-time-mins');
    if (hoursEl) hoursEl.textContent = String(projectViewScheduleModalHours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(projectViewScheduleModalMins).padStart(2, '0');
  }

  async function saveProjectViewScheduleSlot() {
    const days = [];
    document.querySelectorAll('.project-view-ps-day-check:checked').forEach(c => days.push(parseInt(c.dataset.day)));
    if (!days.length) {
      App.toast('Выберите хотя бы один день', 'error');
      return;
    }
    const time = String(projectViewScheduleModalHours).padStart(2, '0') + ':' + String(projectViewScheduleModalMins).padStart(2, '0');
    try {
      const res = await API.post('/projects/' + currentProjectViewId + '/publish-schedules', { days, time });
      if (res.data && res.data.created) projectViewSchedules = projectViewSchedules.concat(res.data.created);
      closeProjectViewScheduleModal();
      renderProjectViewScheduleGrid();
      const p = projects.find(x => x.id == currentProjectViewId);
      if (p) updateProjectViewNavStatuses(p);
      App.toast('Добавлено в расписание', 'success');
    } catch (e) {
      App.toast('Ошибка сохранения', 'error');
    }
  }

  async function deleteProjectViewScheduleSlot(id) {
    try {
      await API.delete('/projects/' + currentProjectViewId + '/publish-schedules/' + id);
      projectViewSchedules = projectViewSchedules.filter(s => s.id != id);
      renderProjectViewScheduleGrid();
      const p = projects.find(x => x.id == currentProjectViewId);
      if (p) updateProjectViewNavStatuses(p);
    } catch (e) {
      App.toast('Ошибка удаления', 'error');
    }
  }

  function initProjectViewScheduleModal() {
    const modal = document.getElementById('project-view-ps-modal');
    if (!modal) return;
    document.getElementById('project-view-ps-modal-close').addEventListener('click', closeProjectViewScheduleModal);
    document.getElementById('project-view-ps-modal-backdrop').addEventListener('click', closeProjectViewScheduleModal);
    document.getElementById('project-view-ps-h-up').addEventListener('click', () => { projectViewScheduleModalHours = (projectViewScheduleModalHours + 1) % 24; updateProjectViewScheduleTimeDisplay(); });
    document.getElementById('project-view-ps-h-down').addEventListener('click', () => { projectViewScheduleModalHours = (projectViewScheduleModalHours - 1 + 24) % 24; updateProjectViewScheduleTimeDisplay(); });
    document.getElementById('project-view-ps-m-up').addEventListener('click', () => { projectViewScheduleModalMins = (projectViewScheduleModalMins + 5) % 60; updateProjectViewScheduleTimeDisplay(); });
    document.getElementById('project-view-ps-m-down').addEventListener('click', () => { projectViewScheduleModalMins = (projectViewScheduleModalMins - 5 + 60) % 60; updateProjectViewScheduleTimeDisplay(); });
    modal.querySelectorAll('.ps-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.preset;
        modal.querySelectorAll('.project-view-ps-day-check').forEach(c => {
          const d = parseInt(c.dataset.day);
          c.checked = p === 'weekdays' ? (d >= 1 && d <= 5) : p === 'weekend' ? (d === 0 || d === 6) : true;
        });
      });
    });
    document.getElementById('project-view-ps-modal-save').addEventListener('click', saveProjectViewScheduleSlot);
  }

  function initProjectViewScheduleClear() {
    const btn = document.getElementById('project-view-schedule-clear');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const ok = await projectViewConfirm({ title: 'Очистить расписание?', text: 'Вся настройка по дням недели будет удалена.', okLabel: 'Очистить' });
      if (!ok) return;
      try {
        await API.delete('/projects/' + currentProjectViewId + '/publish-schedules');
        projectViewSchedules = [];
        renderProjectViewScheduleGrid();
        const p = projects.find(x => x.id == currentProjectViewId);
        if (p) updateProjectViewNavStatuses(p);
        App.toast('Расписание очищено', 'success');
      } catch (e) {
        App.toast('Ошибка', 'error');
      }
    });
  }

  function initProjectViewUtm() {
    const hintIds = [
      'project-view-utm-campaign-hint',
      'project-view-utm-content-hint',
      'project-view-utm-medium-hint',
      'project-view-utm-source-hint',
      'project-view-utm-term-hint',
    ];
    const toggleHint = (helpId, hintId) => {
      const h = document.getElementById(helpId);
      const t = document.getElementById(hintId);
      if (h && t) h.addEventListener('click', () => {
        hintIds.forEach(id => {
          const el = document.getElementById(id);
          if (!el) return;
          if (id === hintId) {
            el.classList.toggle('project-view-utm-field-hint--closed');
          } else {
            el.classList.add('project-view-utm-field-hint--closed');
          }
        });
      });
    };
    toggleHint('project-view-utm-campaign-help', 'project-view-utm-campaign-hint');
    toggleHint('project-view-utm-content-help', 'project-view-utm-content-hint');
    toggleHint('project-view-utm-medium-help', 'project-view-utm-medium-hint');
    toggleHint('project-view-utm-source-help', 'project-view-utm-source-hint');
    toggleHint('project-view-utm-term-help', 'project-view-utm-term-hint');
    const btn = document.getElementById('project-view-utm-save');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!currentProjectViewId) return;
      const enabledEl = document.getElementById('project-view-utm-enabled');
      const get = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
      const utm_template = {
        enabled: enabledEl ? enabledEl.checked : true,
        campaign: get('project-view-utm-campaign'),
        content: get('project-view-utm-content'),
        medium: get('project-view-utm-medium'),
        source: get('project-view-utm-source'),
        term: get('project-view-utm-term')
      };
      try {
        await API.put('/projects/' + currentProjectViewId, { utm_template });
        const p = projects.find(x => x.id == currentProjectViewId);
        if (p) {
          p.utm_template = utm_template;
          updateProjectViewNavStatuses(p);
        }
        App.toast('UTM-метки сохранены', 'success');
      } catch (e) {
        App.toast(e.message || 'Ошибка', 'error');
      }
    });
  }

  function renderProjectViewChannels(projectId) {
    const wrap = document.getElementById('project-view-channels-wrap');
    if (!wrap) return;
    wrap.innerHTML = '<div style="font-size:13px;color:var(--muted);">Загрузка...</div>';
    API.get('/projects/' + projectId + '/channels').then(res => {
      const channels = (res.data && res.data.channels) ? res.data.channels : [];
      if (!channels.length) {
        wrap.innerHTML = '<div style="font-size:13px;color:var(--muted);font-style:italic;">В проекте нет подключённых аккаунтов</div>';
        return;
      }
      wrap.innerHTML = '<div class="project-view-channels-list" id="project-view-channels-list">' +
        channels.map(ch => {
          const meta = ch.meta || {};
          const avatar = meta.avatar_url || '';
          const color = ch.platform_color || '#6366f1';
          const platIcon = ch.platform_icon || '';
          const isActive = ch.is_active !== undefined ? !!ch.is_active : true;
          const avatarHtml = avatar
            ? `<img src="${avatar}" alt="">`
            : `<div class="project-view-channel-initial" style="width:100%;height:100%;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:14px;font-weight:700;">${(ch.alias || ch.name || '?').substring(0, 2).toUpperCase()}</span></div>`;
          const iconCircle = platIcon
            ? `<div class="project-view-channel-icon-circle"><img src="${platIcon}" alt=""></div>`
            : '';
          const accountName = ch.alias || ch.name || 'Аккаунт';
          return `<div class="project-view-channel-row" data-chid="${ch.id}" data-pid="${projectId}" draggable="true" title="${accountName}">
            <div class="project-view-channel-drag-handle" aria-label="Перетащить">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="3" r="1.2" fill="currentColor"/><circle cx="4" cy="7" r="1.2" fill="currentColor"/><circle cx="4" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="3" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="10" cy="11" r="1.2" fill="currentColor"/></svg>
            </div>
            <div class="project-view-channel-mastercard">
              <div class="project-view-channel-avatar-circle">${avatarHtml}</div>
              ${iconCircle}
            </div>
            <div class="project-view-channel-name">${accountName}</div>
            <div class="project-view-channel-controls">
              <label class="project-view-channel-toggle-wrap" title="${isActive ? 'Выключить' : 'Включить'}">
                <input type="checkbox" class="project-view-channel-toggle" data-chid="${ch.id}" data-pid="${projectId}" ${isActive ? 'checked' : ''} aria-label="${isActive ? 'Выключить' : 'Включить'}">
                <span class="project-view-channel-toggle-slider"></span>
              </label>
              <button type="button" class="project-view-channel-delete" data-chid="${ch.id}" data-pid="${projectId}" title="Удалить из проекта" aria-label="Удалить из проекта"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
            </div>
          </div>`;
        }).join('') + '</div>';

      wrap.querySelectorAll('.project-view-channel-toggle').forEach(toggle => {
        const wrapLabel = toggle.closest('.project-view-channel-toggle-wrap');
        const updateTooltip = () => {
          const t = toggle.checked ? 'Выключить' : 'Включить';
          if (wrapLabel) wrapLabel.title = t;
          toggle.setAttribute('aria-label', t);
        };
        updateTooltip();
        toggle.addEventListener('change', async () => {
          const pid = toggle.dataset.pid;
          const chid = toggle.dataset.chid;
          const active = toggle.checked;
          updateTooltip();
          try {
            await API.patch('/projects/' + pid + '/channels/' + chid, { is_active: active ? 1 : 0 });
            App.toast(active ? 'Аккаунт включён' : 'Аккаунт выключен', 'success');
          } catch (e) {
            toggle.checked = !active;
            updateTooltip();
            App.toast(e.message || 'Ошибка', 'error');
          }
        });
      });
      wrap.querySelectorAll('.project-view-channel-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await projectViewConfirm({ title: 'Удалить аккаунт из проекта?', text: 'Это действие уберёт данный аккаунт из проекта. Для полного удаления перейдите в раздел Аккаунты.' });
          if (!ok) return;
          try {
            await API.delete('/projects/' + btn.dataset.pid + '/channels/' + btn.dataset.chid);
            renderProjectViewChannels(btn.dataset.pid);
            const p = projects.find(x => x.id == projectId);
            if (p) updateProjectViewNavStatuses(p);
            App.toast('Аккаунт удалён из проекта', 'success');
          } catch (e) { App.toast(e.message || 'Ошибка', 'error'); }
        });
      });
      initProjectViewChannelsDragDrop(projectId);
    }).catch(() => {
      wrap.innerHTML = '<div style="font-size:13px;color:var(--muted);">Ошибка загрузки</div>';
    });
  }

  let projectViewChannelsDragSrc = null;
  function initProjectViewChannelsDragDrop(projectId) {
    const list = document.getElementById('project-view-channels-list');
    if (!list) return;
    const rows = list.querySelectorAll('.project-view-channel-row');
    rows.forEach(row => {
      row.addEventListener('dragstart', (e) => {
        projectViewChannelsDragSrc = row;
        row.classList.add('project-view-channel-row-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', row.dataset.chid);
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('project-view-channel-row-dragging');
        list.querySelectorAll('.project-view-channel-row').forEach(r => r.classList.remove('project-view-channel-row-drag-over'));
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        list.querySelectorAll('.project-view-channel-row').forEach(r => r.classList.remove('project-view-channel-row-drag-over'));
        if (row !== projectViewChannelsDragSrc) row.classList.add('project-view-channel-row-drag-over');
      });
      row.addEventListener('dragleave', () => row.classList.remove('project-view-channel-row-drag-over'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('project-view-channel-row-drag-over');
        if (!projectViewChannelsDragSrc || projectViewChannelsDragSrc === row) return;
        const next = row.nextSibling;
        list.insertBefore(projectViewChannelsDragSrc, next || row);
        projectViewChannelsDragSrc = null;
      });
    });
  }

  const PROJECT_VIEW_COLORS = ['#6366f1','#22d3ee','#f59e0b','#4ade80','#f87171','#e879f9','#fb923c','#333f64','#fc3f1d'];

  function fillProjectViewGeneralForm(p) {
    if (!p) return;
    const formAv = document.getElementById('project-view-form-avatar');
    const nameInp = document.getElementById('project-view-name');
    const descInp = document.getElementById('project-view-desc');
    const colorInp = document.getElementById('project-view-color');
    const colorWrap = document.getElementById('project-view-color-wrap');
    const delBtn = document.getElementById('project-view-logo-delete');
    if (nameInp) nameInp.value = p.name || '';
    if (descInp) descInp.value = p.description || '';
    const color = p.color || '#6366f1';
    if (colorInp) colorInp.value = color;
    const colorsEl = document.getElementById('project-view-colors');
    if (colorsEl) {
      colorsEl.innerHTML = PROJECT_VIEW_COLORS.map(c =>
        `<div class="color-dot project-view-color-dot" data-color="${c}" style="background:${c}" role="button" tabindex="0"></div>`
      ).join('');
      colorsEl.querySelectorAll('.project-view-color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          colorsEl.querySelectorAll('.project-view-color-dot').forEach(d => d.classList.remove('selected'));
          dot.classList.add('selected');
          if (colorInp) colorInp.value = dot.dataset.color;
        });
      });
      const sel = colorsEl.querySelector(`[data-color="${color}"]`);
      if (sel) sel.classList.add('selected');
    }
    if (formAv) {
      if (p.logo) {
        formAv.innerHTML = `<img src="${p.logo}" alt="">`;
        formAv.style.borderRadius = '50%';
        if (delBtn) delBtn.style.display = '';
        if (colorWrap) colorWrap.style.display = 'none';
      } else {
        formAv.innerHTML = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="var(--muted)" stroke-width="1.5"/></svg>`;
        formAv.style.borderRadius = '12px';
        if (delBtn) delBtn.style.display = 'none';
        if (colorWrap) colorWrap.style.display = '';
      }
    }
    renderProjectViewTeamsList();
  }

  function fillProjectViewUtmForm(p) {
    if (!p) return;
    const utm = p.utm_template ? (typeof p.utm_template === 'string' ? JSON.parse(p.utm_template) : p.utm_template) : {};
    const enabledEl = document.getElementById('project-view-utm-enabled');
    if (enabledEl) enabledEl.checked = utm.enabled !== false;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('project-view-utm-campaign', utm.campaign);
    set('project-view-utm-content', utm.content);
    set('project-view-utm-medium', utm.medium);
    set('project-view-utm-source', utm.source);
    set('project-view-utm-term', utm.term);
  }

  function renderProjectViewTeamsList() {
    const listEl = document.getElementById('project-view-teams-list');
    const emptyField = document.getElementById('project-view-team-empty');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (emptyField) emptyField.style.display = '';
    API.get('/teams').then(res => {
      const teams = (res.data && res.data.teams) ? res.data.teams : (res.data && Array.isArray(res.data)) ? res.data : [];
      if (teams.length) {
        if (emptyField) emptyField.style.display = 'none';
        teams.forEach(t => {
          const item = document.createElement('div');
          item.className = 'project-view-team-item';
          item.textContent = t.name || 'Команда';
          listEl.appendChild(item);
        });
      }
    }).catch(() => {});
  }

  function closeProjectView() {
    const modal = document.getElementById('project-view-modal');
    if (modal) modal.classList.remove('project-view-modal--open');
    currentProjectViewId = null;
  }

  function initProjectViewModal() {
    const backdrop = document.getElementById('project-view-backdrop');
    const closeBtn = document.getElementById('project-view-close');
    if (backdrop) backdrop.addEventListener('click', closeProjectView);
    if (closeBtn) closeBtn.addEventListener('click', closeProjectView);

    document.querySelectorAll('.project-settings-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchProjectViewSection(btn.dataset.section));
    });

    const logoInput = document.getElementById('project-view-logo-input');
    const logoDelete = document.getElementById('project-view-logo-delete');
    const formAvatar = document.getElementById('project-view-form-avatar');
    const colorWrap = document.getElementById('project-view-color-wrap');
    const teamEmpty = document.getElementById('project-view-team-empty');
    if (logoInput) {
      logoInput.addEventListener('change', async () => {
        if (!logoInput.files[0] || !currentProjectViewId) return;
        const fd = new FormData();
        fd.append('logo', logoInput.files[0]);
        try {
          const res = await fetch(`/api/projects/${currentProjectViewId}/logo`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('sp_token') },
            body: fd
          });
          const data = await res.json();
          if (data.success && data.data && data.data.logo) {
            const p = projects.find(x => x.id == currentProjectViewId);
            if (p) p.logo = data.data.logo;
            if (formAvatar) {
              formAvatar.innerHTML = `<img src="${data.data.logo}" alt="">`;
              formAvatar.style.borderRadius = '50%';
            }
            if (logoDelete) logoDelete.style.display = '';
            if (colorWrap) colorWrap.style.display = 'none';
            App.toast('Логотип загружен', 'success');
          } else App.toast(data.message || 'Ошибка', 'error');
        } catch (e) { App.toast('Ошибка загрузки', 'error'); }
      });
    }
    if (logoDelete) {
      logoDelete.addEventListener('click', async () => {
        if (!currentProjectViewId) return;
        try {
          await API.delete(`/projects/${currentProjectViewId}/logo`);
          const p = projects.find(x => x.id == currentProjectViewId);
          if (p) p.logo = null;
          if (formAvatar) {
            formAvatar.innerHTML = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="var(--muted)" stroke-width="1.5"/></svg>`;
            formAvatar.style.borderRadius = '12px';
          }
          logoDelete.style.display = 'none';
          if (colorWrap) colorWrap.style.display = '';
          App.toast('Логотип удалён', 'success');
        } catch (e) { App.toast('Ошибка', 'error'); }
      });
    }

    const generalSave = document.getElementById('project-view-general-save');
    if (generalSave) {
      generalSave.addEventListener('click', async () => {
        if (!currentProjectViewId) return;
        const name = document.getElementById('project-view-name')?.value?.trim();
        const desc = document.getElementById('project-view-desc')?.value?.trim() || '';
        const color = document.getElementById('project-view-color')?.value || '#6366f1';
        const errEl = document.getElementById('project-view-general-error');
        if (!name) {
          if (errEl) { errEl.textContent = 'Введите название'; errEl.classList.remove('hidden'); }
          return;
        }
        if (errEl) errEl.classList.add('hidden');
        try {
          const res = await API.put(`/projects/${currentProjectViewId}`, { name, description: desc, color });
          const updated = (res.data && res.data.project) || res.project;
          const idx = projects.findIndex(x => x.id == currentProjectViewId);
          if (idx !== -1) projects[idx] = updated;
          const current = State.get('project');
          if (current && current.id == currentProjectViewId) State.setProject(updated);
          document.getElementById('project-view-title').textContent = updated.name;
          const avEl = document.getElementById('project-view-avatar');
          if (avEl) {
            if (updated.logo) {
              avEl.innerHTML = `<img src="${updated.logo}" alt="">`;
              avEl.style.borderRadius = '50%';
            } else {
              avEl.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/></svg>`;
              avEl.style.background = updated.color || '#6366f1';
              avEl.style.borderRadius = '10px';
            }
          }
          renderList();
          App.toast('Настройки сохранены', 'success');
        } catch (e) {
          if (errEl) { errEl.textContent = e.message || 'Ошибка'; errEl.classList.remove('hidden'); }
        }
      });
    }

    const createTeamBtn = document.getElementById('project-view-create-team-btn');
    if (createTeamBtn) {
      createTeamBtn.addEventListener('click', () => { /* пока без ссылки */ });
      if (teamEmpty) {
        teamEmpty.addEventListener('click', () => createTeamBtn.click());
      }
    }

    const addAccountBtn = document.getElementById('project-view-add-account-btn');
    if (addAccountBtn) {
      addAccountBtn.addEventListener('click', () => {
        if (!currentProjectViewId) return;
        openAddChannelPanel(currentProjectViewId, () => {
          renderProjectViewChannels(currentProjectViewId);
          const p = projects.find(x => x.id == currentProjectViewId);
          if (p) updateProjectViewNavStatuses(p);
        });
      });
    }
    initProjectViewScheduleModal();
    initProjectViewScheduleClear();
    initProjectViewUtm();
  }


    function toggleColorSection(hasLogo) {
      const colorSection = document.getElementById('proj-panel-color-section');
      if (colorSection) colorSection.style.display = hasLogo ? 'none' : '';
    }
  function openSettingsPanel(id) {
    const p = projects.find(x => x.id == id);
    if (!p) return;

    document.getElementById('proj-panel-id').value   = p.id;

    // Загружаем каналы проекта
    const chEl = document.getElementById('proj-panel-channels');
    chEl.innerHTML = '<div style="font-size:12px;color:var(--muted);">Загрузка...</div>';
    API.get('/projects/' + p.id + '/channels').then(res => {
      const channels = (res.data && res.data.channels) ? res.data.channels : [];
      renderChannels(channels, p.id, chEl);
      const badge = document.getElementById('proj-btn-channels-badge');
      if (badge) { if (channels.length) { badge.textContent = channels.length; badge.style.display = ''; } else { badge.style.display = 'none'; } }
    }).catch(() => {
      chEl.innerHTML = '<div style="font-size:12px;color:var(--muted);">Ошибка загрузки</div>';
    });
    // Загружаем расписание проекта
    const schEl = document.getElementById('proj-schedule-info');
    const schBtn = document.getElementById('proj-schedule-btn');
    if (schEl) {
      schEl.textContent = 'Загрузка...';
      API.get('/projects/' + p.id + '/publish-schedules').then(res => {
        const slots = (res.data && res.data.schedules) ? res.data.schedules : [];
        const schBadgeEl = document.getElementById('proj-btn-schedule-badge');
        if (!slots.length) {
          schEl.textContent = 'Расписание не настроено';
          if (schBadgeEl) schBadgeEl.style.display = 'none';
          return;
        }
        // Определяем уникальные времена и дни
        const times = [...new Set(slots.map(s => s.time_of_day.slice(0,5)))];
        const days = slots.map(s => parseInt(s.day_of_week));
        const allDays = [0,1,2,3,4,5,6].every(d => days.includes(d));
        const weekdays = [1,2,3,4,5].every(d => days.includes(d)) && ![0,6].some(d => days.includes(d));
        const weekend = [0,6].every(d => days.includes(d)) && ![1,2,3,4,5].some(d => days.includes(d));
        if (times.length === 1) {
          const t = times[0];
          if (allDays) schEl.textContent = 'Расписание настроено ежедневно на ' + t;
          else if (weekdays) schEl.textContent = 'Расписание настроено по будним дням на ' + t;
          else if (weekend) schEl.textContent = 'Расписание настроено по выходным на ' + t;
          else schEl.textContent = 'Расписание публикаций настроено';
        } else {
          schEl.textContent = 'Расписание публикаций настроено';
        }
        schEl.style.color = 'var(--text)';
        const schBadge = document.getElementById('proj-btn-schedule-badge');
        if (schBadge) schBadge.style.display = '';
      }).catch(() => {
        if (schEl) schEl.textContent = 'Ошибка загрузки расписания';
      });
    }

    // Кнопка добавить аккаунт
    document.getElementById('proj-panel-add-channel').onclick = () => openAddChannelPanel(p.id);
    document.getElementById('proj-panel-name').value  = p.name;
    document.getElementById('proj-panel-desc').value  = p.description || '';
    document.getElementById('proj-panel-color').value = p.color || '#6366f1';
    document.getElementById('proj-panel-error').classList.add('hidden');
    // UTM статус
    const utm = p.utm_template ? (typeof p.utm_template === 'string' ? JSON.parse(p.utm_template) : p.utm_template) : {};
    const utmStatus = document.getElementById('proj-utm-status');
    const hasUtm = utm.source || utm.medium || utm.campaign;
    if (utmStatus) {
      utmStatus.textContent = hasUtm ? 'Настроены' : 'Не настроены';
      utmStatus.style.color = hasUtm ? 'var(--text)' : 'var(--muted)';
    }
    const utmBadge = document.getElementById('proj-btn-utm-badge');
    if (utmBadge) utmBadge.style.display = hasUtm ? '' : 'none';
    // Сохраняем utm в панель (для кнопки UTM)
    document.getElementById('proj-utm-panel')._utm = utm;
    document.getElementById('proj-utm-panel')._pid = p.id;

    // Цвет
    document.querySelectorAll('.proj-panel-color-dot').forEach(d => {
      d.classList.toggle('selected', d.dataset.color === (p.color || '#6366f1'));
    });
    document.querySelectorAll('.proj-panel-color-dot').forEach(dot => {
      dot.onclick = () => {
        document.querySelectorAll('.proj-panel-color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        document.getElementById('proj-panel-color').value = dot.dataset.color;
      };
    });

    // Аватар
    const av = document.getElementById('proj-panel-avatar');
    const delBtn = document.getElementById('proj-panel-logo-delete');
    if (p.logo) {
      av.innerHTML = `<img src="${p.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      av.style.background = 'transparent';
      av.style.borderRadius = '50%';
      delBtn.style.display = '';
    } else {
      av.innerHTML = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="var(--muted)" stroke-width="1.5"/></svg>`;
      delBtn.style.display = 'none';
    }
    toggleColorSection(!!p.logo);

    // Загрузка логотипа
    const logoInput = document.getElementById('proj-panel-logo-input');
    logoInput.onchange = async () => {
      if (!logoInput.files[0]) return;
      const fd = new FormData();
      fd.append('logo', logoInput.files[0]);
      try {
        const res = await fetch(`/api/projects/${p.id}/logo`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('sp_token') },
          body: fd
        });
        const data = await res.json();
        if (data.success) {
          const logo = data.data.logo;
          av.innerHTML = `<img src="${logo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          av.style.background = 'transparent';
          av.style.borderRadius = '50%';
          delBtn.style.display = '';
          toggleColorSection(true);
          const proj = projects.find(x => x.id == p.id);
          if (proj) proj.logo = logo;
          renderList();
          App.toast('Логотип загружен', 'success');
        } else {
          App.toast(data.message || 'Ошибка', 'error');
        }
      } catch(e) { App.toast('Ошибка загрузки', 'error'); }
    };

    // Удаление логотипа
    delBtn.onclick = async () => {
      try {
        await API.delete(`/projects/${p.id}/logo`);
        av.innerHTML = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M3 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="var(--muted)" stroke-width="1.5"/></svg>`;
        av.style.background = 'var(--accent-lt)';
        av.style.borderRadius = '12px';
        delBtn.style.display = 'none';
        toggleColorSection(false);
        const proj = projects.find(x => x.id == p.id);
        if (proj) proj.logo = null;
        renderList();
        App.toast('Логотип удалён', 'success');
      } catch(e) { App.toast('Ошибка', 'error'); }
    };

    // Сохранение
    document.getElementById('proj-panel-save').onclick = async () => {
      const name  = document.getElementById('proj-panel-name').value.trim();
      const desc  = document.getElementById('proj-panel-desc').value.trim();
      const color = document.getElementById('proj-panel-color').value;
      const utmPanel = document.getElementById('proj-utm-panel');
      const savedUtm = utmPanel._utm || {};
      const utm_template = { source: savedUtm.source||'', medium: savedUtm.medium||'', campaign: savedUtm.campaign||'', content: savedUtm.content||'' };
      const errEl = document.getElementById('proj-panel-error');
      if (!name) { errEl.textContent = 'Введите название'; errEl.classList.remove('hidden'); return; }
      errEl.classList.add('hidden');
      try {
        const res = await API.put(`/projects/${p.id}`, { name, description: desc, color, utm_template });
        const updated = (res.data && res.data.project) || res.project;
        const idx = projects.findIndex(x => x.id == p.id);
        if (idx !== -1) projects[idx] = updated;
        const current = State.get('project');
        if (current && current.id == p.id) State.setProject(updated);
        closeSettingsPanel();
        renderList();
        App.toast('Проект обновлён', 'success');
      } catch(e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
    };

    document.getElementById('proj-settings-overlay').style.display = 'block';
    const panel = document.getElementById('proj-settings-panel');
    panel.style.display = 'flex';
  }

  function renderChannels(channels, pid, el) {
    if (!channels.length) {
      el.innerHTML = '<div style="font-size:13px;color:var(--muted);font-style:italic;padding:4px 0;">В проекте нет подключённых аккаунтов</div>';
      return;
    }
    el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;">' +
      channels.map(ch => {
        const meta = ch.meta || {};
        const avatar = meta.avatar_url || '';
        const color = ch.platform_color || '#6366f1';
        const platIcon = ch.platform_icon || '';
        const avatarHtml = avatar
          ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
          : platIcon
            ? `<img src="${platIcon}" style="width:100%;height:100%;object-fit:contain;">`
            : `<div style="width:100%;height:100%;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:13px;font-weight:700;">${(ch.platform_name||ch.platform||'?').charAt(0)}</span></div>`;
        return `<div style="position:relative;width:56px;height:40px;" title="${ch.alias || ch.name}">
          <div style="position:absolute;left:0;top:0;width:40px;height:40px;border-radius:50%;overflow:hidden;border:1px solid var(--border);">${avatarHtml}</div>
          ${platIcon ? `<div style="position:absolute;right:0;top:4px;width:22px;height:22px;border-radius:50%;overflow:hidden;background:#fff;border:2px solid var(--surface);"><img src="${platIcon}" style="width:100%;height:100%;object-fit:contain;"></div>` : ''}
          <button class="proj-ch-delete" data-chid="${ch.id}" data-pid="${pid}" style="position:absolute;top:-4px;left:-4px;width:16px;height:16px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;font-weight:700;">×</button>
        </div>`;
      }).join('') + '</div>';

    el.querySelectorAll('.proj-ch-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Отвязать аккаунт от проекта?')) return;
        try {
          await API.delete('/projects/' + btn.dataset.pid + '/channels/' + btn.dataset.chid);
          const res = await API.get('/projects/' + btn.dataset.pid + '/channels');
          const updated = (res.data && res.data.channels) ? res.data.channels : [];
          renderChannels(updated, pid, el);
          App.toast('Аккаунт отвязан', 'success');
        } catch(e) { App.toast(e.message || 'Ошибка', 'error'); }
      });
    });
  }

  function openAddChannelPanel(pid, onAfterSave) {
    let panel = document.getElementById('proj-add-channel-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'proj-add-channel-panel';
      panel.style.cssText = 'position:fixed;top:0;right:0;width:380px;max-width:100vw;height:100vh;background:var(--surface);border-left:1px solid var(--border);box-shadow:-8px 0 32px rgba(51,63,100,0.15);z-index:1000;display:flex;flex-direction:column;';
      document.body.appendChild(panel);
    }
    panel._onAfterSave = onAfterSave;

    panel.innerHTML = `
      <div style="padding:24px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
        <button class="btn-icon" id="proj-add-ch-back">
          <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div style="font-size:15px;font-weight:800;color:var(--text);">Добавить аккаунт в проект</div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:20px;">
        <p style="font-size:13px;color:var(--text2);line-height:1.6;">После подключения аккаунта все каналы и группы, где у вас есть права на публикацию, станут доступны при планировании постов в этом проекте.</p>
        <a href="#/social-accounts" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;text-decoration:none;padding:12px 20px;" onclick="document.getElementById('proj-add-channel-panel').style.display='none';document.getElementById('proj-settings-overlay').style.display='none';document.getElementById('proj-settings-panel').style.display='none';">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Подключить новый аккаунт
        </a>

        <div style="border-top:1px solid var(--border);padding-top:20px;">
          <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:6px;">Выбрать из подключённых</div>
          <p style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:14px;">Выберите аккаунты из ранее подключённых. Если аккаунт уже добавлен в другой проект, он будет доступен и здесь.</p>

          <div style="position:relative;margin-bottom:12px;">
            <input type="text" id="proj-add-ch-search" placeholder="Поиск по названию"
              style="width:100%;padding:10px 14px 10px 38px;border:1.5px solid var(--border);border-radius:var(--radius);background:var(--bg);font-family:inherit;font-size:13px;color:var(--text);outline:none;">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);"><circle cx="9" cy="9" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M14 14l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>

          <div id="proj-add-ch-list" style="display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto;">
            <div style="font-size:12px;color:var(--muted);padding:8px;">Загрузка...</div>
          </div>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:10px;">
        <button class="btn btn-primary" id="proj-add-ch-save" style="flex:2;">Сохранить</button>
        <button class="btn btn-secondary" id="proj-add-ch-cancel" style="flex:1;">Отмена</button>
      </div>
    `;

    panel.style.display = 'flex';

    document.getElementById('proj-add-ch-back').onclick = () => { panel.style.display = 'none'; };
    document.getElementById('proj-add-ch-cancel').onclick  = () => { panel.style.display = 'none'; };

    // Загружаем аккаунты пользователя и уже подключённые каналы
    Promise.all([
      API.get('/social-accounts'),
      API.get('/projects/' + pid + '/channels')
    ]).then(([aRes, cRes]) => {
      const accounts  = (aRes.data && aRes.data.accounts)   ? aRes.data.accounts  : [];
      const channels  = (cRes.data && cRes.data.channels)   ? cRes.data.channels  : [];
      const usedIds   = channels.map(ch => ch.social_account_id);
      const available = accounts.filter(a => !usedIds.includes(a.id) && a.is_active);

      const listEl = document.getElementById('proj-add-ch-list');

      if (!available.length) {
        listEl.innerHTML = '<div style="font-size:13px;color:var(--muted);font-style:italic;text-align:center;padding:24px 0;">Все аккаунты уже подключены<br>или нет доступных аккаунтов</div>';
        return;
      }

      let selectedIds = new Set();

      function renderAccountList(filter) {
        const filtered = filter
          ? available.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()))
          : available;

        listEl.innerHTML = filtered.map(a => {
          const meta = typeof a.meta === 'string' ? JSON.parse(a.meta || '{}') : (a.meta || {});
          const avatar = meta.avatar_url || '';
          const color  = a.platform_color || '#6366f1';
          const icon   = a.platform_icon  || '';
          const avatarHtml = avatar
            ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : icon
              ? `<img src="${icon}" style="width:100%;height:100%;object-fit:contain;">`
              : `<div style="width:100%;height:100%;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:13px;font-weight:700;">${(a.platform_name||a.platform||'?').charAt(0)}</span></div>`;
          const checked = selectedIds.has(a.id);
          return `<label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'};border-radius:var(--radius);background:${checked ? 'var(--accent-lt)' : 'var(--bg)'};cursor:pointer;transition:all .15s;">
            <input type="checkbox" class="proj-acc-check" data-id="${a.id}" ${checked ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent);flex-shrink:0;cursor:pointer;">
            <div style="position:relative;width:40px;height:40px;flex-shrink:0;">
              <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;border:1px solid var(--border);">${avatarHtml}</div>
              ${icon ? `<div style="position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;border-radius:50%;overflow:hidden;background:#fff;border:1.5px solid var(--surface);"><img src="${icon}" style="width:100%;height:100%;object-fit:contain;"></div>` : ''}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.name}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">${a.platform_name || a.platform}</div>
            </div>
          </label>`;
        }).join('');

        listEl.querySelectorAll('.proj-acc-check').forEach(cb => {
          cb.addEventListener('change', () => {
            const id = parseInt(cb.dataset.id);
            if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
            renderAccountList(document.getElementById('proj-add-ch-search')?.value || '');
          });
        });
      }

      renderAccountList('');

      document.getElementById('proj-add-ch-search').addEventListener('input', (e) => {
        renderAccountList(e.target.value);
      });

      document.getElementById('proj-add-ch-save').onclick = async () => {
        if (!selectedIds.size) { App.toast('Выберите хотя бы один аккаунт', 'info'); return; }
        const saveBtn = document.getElementById('proj-add-ch-save');
        saveBtn.disabled = true; saveBtn.textContent = 'Сохранение...';
        try {
          for (const id of selectedIds) {
            await API.post('/projects/' + pid + '/channels', { social_account_id: id });
          }
          App.toast('Аккаунты подключены', 'success');
          panel.style.display = 'none';
          const chEl = document.getElementById('proj-panel-channels');
          if (chEl) {
            const res = await API.get('/projects/' + pid + '/channels');
            const updated = (res.data && res.data.channels) ? res.data.channels : [];
            renderChannels(updated, pid, chEl);
          }
          if (typeof panel._onAfterSave === 'function') panel._onAfterSave(pid);
        } catch(e) {
          App.toast(e.message || 'Ошибка', 'error');
        } finally {
          saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
        }
      };
    }).catch(() => {
      document.getElementById('proj-add-ch-list').innerHTML = '<div style="font-size:13px;color:var(--muted);">Ошибка загрузки</div>';
    });
  }

  function closeSettingsPanel() {
    document.getElementById('proj-settings-overlay').style.display = 'none';
    document.getElementById('proj-settings-panel').style.display = 'none';
    document.getElementById('proj-utm-panel').style.display = 'none';
  }

  function openUtmPanel() {
    const utmPanel = document.getElementById('proj-utm-panel');
    const utm = utmPanel._utm || {};
    document.getElementById('proj-utm-source').value   = utm.source   || '';
    document.getElementById('proj-utm-medium').value   = utm.medium   || '';
    document.getElementById('proj-utm-campaign').value = utm.campaign || '';
    document.getElementById('proj-utm-content').value  = utm.content  || '';
    document.getElementById('proj-utm-error').classList.add('hidden');
    utmPanel.style.display = 'flex';
  }

  function closeUtmPanel() {
    document.getElementById('proj-utm-panel').style.display = 'none';
  }

  function selectProject(id) {
    const project = projects.find(p => p.id == id);
    if (!project) return;
    State.setProject(project);
    App.toast(`Проект «${project.name}» выбран`, 'success');
    renderList();
  }

  function initDragDrop() {
    const list = document.getElementById('proj-cards-list');
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
        const newOrder = [...list.querySelectorAll('[draggable="true"]')].map(c => c.dataset.id);
        projects.sort((a, b) => newOrder.indexOf(String(a.id)) - newOrder.indexOf(String(b.id)));
      });
    });
  }

  function openModal(id) {
    const p = id ? projects.find(x => x.id == id) : null;
    document.getElementById('proj-id').value    = p ? p.id : '';
    document.getElementById('proj-name').value  = p ? p.name : '';
    document.getElementById('proj-desc').value  = p ? (p.description || '') : '';
    const color = p ? (p.color || '#6366f1') : '#6366f1';
    document.getElementById('proj-color').value = color;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    document.querySelector(`.color-dot[data-color="${color}"]`)?.classList.add('selected');
    document.getElementById('project-modal-title').textContent = p ? 'Редактировать проект' : 'Новый проект';
    document.getElementById('proj-submit').querySelector('.btn-text').textContent = p ? 'Сохранить' : 'Создать';
    document.getElementById('project-form-error').classList.add('hidden');
    document.getElementById('project-modal').classList.remove('hidden');
    document.getElementById('proj-name').focus();
  }

  function closeModal() {
    document.getElementById('project-modal').classList.add('hidden');
    const path = (location.hash || '#').replace('#', '').split('?')[0];
    if (path === '/projects/create' && typeof App !== 'undefined' && App.navigate) {
      App.navigate('/projects');
    }
  }

  function initModal() {
    const btnNew = document.getElementById('btn-new-project');
    if (btnNew) btnNew.addEventListener('click', () => openModal(null));
    const deskBtn = document.getElementById('btn-new-project-desk');
    if (deskBtn) deskBtn.addEventListener('click', () => openModal(null));
    document.getElementById('proj-panel-close').addEventListener('click', closeSettingsPanel);
    document.getElementById('proj-panel-cancel').addEventListener('click', closeSettingsPanel);
    document.getElementById('proj-utm-open-btn').addEventListener('click', openUtmPanel);
    document.getElementById('proj-utm-back').addEventListener('click', closeUtmPanel);
    document.getElementById('proj-utm-close').addEventListener('click', closeSettingsPanel);
    document.getElementById('proj-utm-cancel').addEventListener('click', closeUtmPanel);
    document.getElementById('proj-utm-save').addEventListener('click', async () => {
      const pid = document.getElementById('proj-utm-panel')._pid;
      if (!pid) return;
      const utm_template = {
        source:   document.getElementById('proj-utm-source').value.trim(),
        medium:   document.getElementById('proj-utm-medium').value.trim(),
        campaign: document.getElementById('proj-utm-campaign').value.trim(),
        content:  document.getElementById('proj-utm-content').value.trim()
      };
      const errEl = document.getElementById('proj-utm-error');
      errEl.classList.add('hidden');
      try {
        const proj = projects.find(x => x.id == pid);
        const res = await API.put('/projects/' + pid, {
          name: proj ? proj.name : '',
          description: proj ? (proj.description || '') : '',
          color: proj ? (proj.color || '#6366f1') : '#6366f1',
          utm_template
        });
        const updated = (res.data && res.data.project) || res.project;
        const idx = projects.findIndex(x => x.id == pid);
        if (idx !== -1) projects[idx] = updated;
        const current = State.get('project');
        if (current && current.id == pid) State.setProject(updated);
        document.getElementById('proj-utm-panel')._utm = utm_template;
        const hasUtm = utm_template.source || utm_template.medium || utm_template.campaign;
        const statusEl = document.getElementById('proj-utm-status');
        if (statusEl) { statusEl.textContent = hasUtm ? 'Настроены' : 'Не настроены'; statusEl.style.color = hasUtm ? 'var(--text)' : 'var(--muted)'; }
        closeUtmPanel();
        App.toast('UTM-метки сохранены', 'success');
      } catch(e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
    });
    document.getElementById('proj-settings-overlay').addEventListener('click', closeSettingsPanel);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', closeModal);

    document.getElementById('project-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl  = document.getElementById('project-form-error');
      const id     = document.getElementById('proj-id').value;
      const name   = document.getElementById('proj-name').value.trim();
      const desc   = document.getElementById('proj-desc').value.trim();
      const color  = document.getElementById('proj-color').value;

      if (!name) {
        errEl.textContent = 'Введите название проекта';
        errEl.classList.remove('hidden');
        return;
      }

      const btn     = document.getElementById('proj-submit');
      const btnText = btn.querySelector('.btn-text');
      const btnLoad = btn.querySelector('.btn-loader');
      btnText.classList.add('hidden');
      btnLoad.classList.remove('hidden');
      btn.disabled = true;
      errEl.classList.add('hidden');

      try {
        if (id) {
          const res = await API.put(`/projects/${id}`, { name, description: desc, color });
          const updated = (res.data && res.data.project) || res.project;
          const idx = projects.findIndex(p => p.id == id);
          if (idx !== -1) projects[idx] = updated;
          // Обновляем выбранный проект если это он
          const current = State.get('project');
          if (current && current.id == id) State.setProject(updated);
          App.toast('Проект обновлён', 'success');
        } else {
          const res = await API.post('/projects', { name, description: desc, color });
          const created = (res.data && res.data.project) || res.project;
          projects.unshift(created);
          App.toast('Проект создан', 'success');
        }
        closeModal();
        renderList();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      } finally {
        btnText.classList.remove('hidden');
        btnLoad.classList.add('hidden');
        btn.disabled = false;
      }
    });
  }

  function initColorPicker() {
    const defaultColor = '#6366f1';
    document.querySelector(`.color-dot[data-color="${defaultColor}"]`)?.classList.add('selected');
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        document.getElementById('proj-color').value = dot.dataset.color;
      });
    });
  }

  async function deleteProject(id) {
    const p = projects.find(x => x.id == id);
    if (!confirm(`Удалить проект «${p ? p.name : id}»?`)) return;
    try {
      await API.delete(`/projects/${id}`);
      projects = projects.filter(x => x.id != id);
      // Сбросить выбранный проект если удалили его
      const current = State.get('project');
      if (current && current.id == id) State.setProject(null);
      renderList();
      App.toast('Проект удалён', 'success');
    } catch (e) {
      App.toast(e.message || 'Ошибка', 'error');
    }
  }

  return { render };

})();
