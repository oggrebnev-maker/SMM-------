-- Вотермарк проекта: изображение, позиция, прозрачность, размер (%)
-- Выполнить по порядку. Если колонка уже есть — ошибку "duplicate column" можно игнорировать.
ALTER TABLE projects ADD COLUMN watermark_image VARCHAR(512) NULL;
ALTER TABLE projects ADD COLUMN watermark_position VARCHAR(32) NOT NULL DEFAULT 'bottom_right';
ALTER TABLE projects ADD COLUMN watermark_opacity INT NOT NULL DEFAULT 80;
ALTER TABLE projects ADD COLUMN watermark_size INT NOT NULL DEFAULT 100;
