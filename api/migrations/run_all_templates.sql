-- Хэштеги и подпись: выполнить один раз по порядку (БД: ya_smm_ru или ваша)
-- 1) Таблица хэштегов
CREATE TABLE IF NOT EXISTS project_hashtags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  tag VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_project_hashtags_project (project_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
-- 2) Тип хэштега (пост/комментарий) и настройки в projects
ALTER TABLE project_hashtags ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'post';
ALTER TABLE projects ADD COLUMN hashtags_settings JSON NULL;
-- 3) Подпись в projects
ALTER TABLE projects ADD COLUMN signature_settings JSON NULL;
