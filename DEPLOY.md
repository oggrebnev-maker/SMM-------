# Деплой и окружения (staging/prod)

## Куда что относится

- **Staging (тест)**: `https://app.ya-smm.ru`
  - Код: `/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/app`
  - БД: `test_smm`
- **Production (боевой)**: `https://lk.ya-smm.ru`
  - Активная версия: `/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/lk-current` (симлинк)
  - Релизы: `/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/lk-releases/<release_id>`
  - Shared-данные (не являются “кодом”): `/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/lk-shared/`
    - `uploads/` (аватары, лого проектов, вотермарки)
    - `images/` (favicon и т.п.)

## Главное правило

- **Разработка ведётся только в `app`**.
- **Боевой сайт обновляется только через `promote` по вашему явному указанию** (без ручного копирования в `lk` и правок в `lk-current`).

## Команды

### Выложить staging → production

Запускать на сервере:

```bash
bash "/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/deploy/promote.sh"
```

Что делает:
- собирает новый релиз из `/app`
- НЕ переносит `uploads/` и `images/` (они shared)
- берёт production-конфиги из текущего релиза, чтобы не утащить staging-настройки
- переключает `lk-current` на новый релиз (атомарно)

### Откатить production на предыдущий релиз

```bash
bash "/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/deploy/rollback.sh"
```

## Типовые ситуации

### На staging не видны картинки/логотипы

Причина: в staging-БД пути вида `/uploads/...`, но в `app/uploads` нет файлов.

Команда (копирует только файлы, код не трогает):

```bash
rsync -a "/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/lk-shared/uploads/" "/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/app/uploads/"
chown -R ya_smm_ru_usr:ya_smm_ru_usr "/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/app/uploads"
```

### CORS для staging

Staging API должен разрешать origin `https://app.ya-smm.ru`.
Файл: `/var/www/ya_smm_ru_usr/data/www/ya-smm.ru/app/api/config/cors.php`

