-- Настройки подписи проекта (Название, Как использовать, Текст подписи)
-- Выполнить вручную. Если колонка уже есть — ошибку можно игнорировать.
ALTER TABLE projects ADD COLUMN signature_settings JSON NULL COMMENT 'name, usage (manual|post_end|comment_end), text';
