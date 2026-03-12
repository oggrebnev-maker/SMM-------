-- Добавить колонки OAuth в users, если их ещё нет (привязка ВК/Яндекс/Google).
-- Выполнить один раз: mysql -u USER -p ya_smm_ru < api/migrations/add_oauth_columns_if_missing.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_yandex_id   VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS oauth_yandex_avatar VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS oauth_yandex_name   VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS oauth_vk_id       VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS oauth_vk_avatar   VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS oauth_vk_name     VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS oauth_google_id   VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS oauth_google_avatar VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS oauth_google_name   VARCHAR(255) NULL;
