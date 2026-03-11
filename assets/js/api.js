/**
 * api.js — HTTP-клиент
 * Базовый URL: /api (тот же домен)
 * Все запросы автоматически добавляют Bearer токен из localStorage
 */

const API = (() => {

  const BASE_URL = '/api';

  function getToken() {
    return localStorage.getItem('sp_token');
  }

  function getHeaders(withBody = false) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (withBody) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async function request(method, path, body = null) {
    const options = {
      method,
      headers: getHeaders(!!body),
    };
    if (body) options.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE_URL + path, options);
    } catch (err) {
      throw new Error('Нет соединения с сервером');
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Некорректный ответ сервера');
    }

    if (!res.ok) {
      if (res.status === 401) {
        Auth.logout();
        throw new Error('Сессия истекла. Войдите снова.');
      }
      throw new Error(data.message || `Ошибка ${res.status}`);
    }

    // Сервер возвращает { success, message, data } — возвращаем весь объект
    return data;
  }

  return {
    get:    (path)         => request('GET',    path),
    post:   (path, body)   => request('POST',   path, body),
    put:    (path, body)   => request('PUT',    path, body),
    delete: (path)         => request('DELETE', path),
    upload: async (path, formData) => {
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      let res;
      try {
        res = await fetch(BASE_URL + path, { method: 'POST', headers, body: formData });
      } catch (err) {
        throw new Error('Нет соединения с сервером');
      }
      let data;
      try { data = await res.json(); } catch { throw new Error('Некорректный ответ сервера'); }
      if (!res.ok) throw new Error(data.message || `Ошибка ${res.status}`);
      return data;
    },
  };

})();
