-- Добавить поле display_id и таблицу счётчиков user_id_counters.
-- Выполнить один раз:
--   mysql -u USER -p DB_NAME < api/migrations/add_display_id_and_user_id_counters.sql

-- 1) Уникальный человекочитаемый ID пользователя в формате YYSSSS
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_id VARCHAR(6) NULL UNIQUE;

-- 2) Таблица для хранения счётчиков по годам (год регистрации пользователя).
CREATE TABLE IF NOT EXISTS user_id_counters (
  year SMALLINT NOT NULL PRIMARY KEY,
  last_serial INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

