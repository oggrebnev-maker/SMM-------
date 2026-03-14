-- Хэштеги проекта: список тегов для подстановки в посты
CREATE TABLE IF NOT EXISTS project_hashtags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  tag VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_project_hashtags_project (project_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
