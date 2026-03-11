/**
 * state.js — Глобальный стейт SPA
 * Хранит: текущий пользователь, текущий проект, подписчики
 */

const State = (() => {

  const _state = {
    user: null,          // { id, name, email, role, plan, plan_until }
    project: null,       // { id, name, color, description, logo }
    projects: [],        // список проектов пользователя
  };

  const _subscribers = {};

  // Подписка на изменение ключа
  function on(key, callback) {
    if (!_subscribers[key]) _subscribers[key] = [];
    _subscribers[key].push(callback);
  }

  // Отписка
  function off(key, callback) {
    if (!_subscribers[key]) return;
    _subscribers[key] = _subscribers[key].filter(cb => cb !== callback);
  }

  // Установить значение и уведомить подписчиков
  function set(key, value) {
    _state[key] = value;
    if (_subscribers[key]) {
      _subscribers[key].forEach(cb => cb(value));
    }
  }

  // Получить значение
  function get(key) {
    return _state[key];
  }

  // Установить текущий проект + сохранить в localStorage
  function setProject(project) {
    set('project', project);
    if (project) {
      localStorage.setItem('sp_project_id', project.id);
    } else {
      localStorage.removeItem('sp_project_id');
    }
  }

  // Получить сохранённый ID проекта
  function getSavedProjectId() {
    return localStorage.getItem('sp_project_id');
  }

  return { on, off, set, get, setProject, getSavedProjectId };

})();
