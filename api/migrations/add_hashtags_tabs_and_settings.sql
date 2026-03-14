-- Вкладки «Хэштеги поста» и «Хэштеги комментариев» + настройки размещения
-- Выполнить по порядку. Если колонка уже есть — ошибку "duplicate column" можно игнорировать.
ALTER TABLE project_hashtags ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'post';
ALTER TABLE projects ADD COLUMN hashtags_settings JSON NULL COMMENT 'post: {max_count,placement,mode}, comment: {...}';
