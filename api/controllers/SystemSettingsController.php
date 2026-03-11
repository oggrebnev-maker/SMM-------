<?php
class SystemSettingsController {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // GET /api/system-settings
    public function getSettings() {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');

        $stmt = $this->db->query("SELECT `key`, `value` FROM system_settings");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['key']] = $row['value'];
        }
        Response::success(['settings' => $settings]);
    }

    // PUT /api/system-settings
    public function updateSettings() {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');

        $data = json_decode(file_get_contents('php://input'), true);
        $allowed = [
            'site_name', 'registration_enabled',
            'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
            'smtp_from', 'smtp_from_name',
            'email_verify_subject', 'email_verify_template'
        ];

        foreach ($allowed as $key) {
            if (isset($data[$key])) {
                $stmt = $this->db->prepare(
                    "INSERT INTO system_settings (`key`, `value`) VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)"
                );
                $stmt->execute([$key, $data[$key]]);
            }
        }
        Response::success(['message' => 'Настройки сохранены']);
    }

    // POST /api/system-settings/favicon
    public function uploadFavicon() {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');

        if (empty($_FILES['favicon'])) {
            Response::error('Файл не передан', 400);
            return;
        }

        $file = $_FILES['favicon'];
        $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['ico', 'png', 'jpg', 'jpeg', 'webp', 'svg'];

        if (!in_array($ext, $allowed)) {
            Response::error('Недопустимый формат файла', 400);
            return;
        }

        $uploadDir = __DIR__ . '/../../images/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        $filename = 'favicon.' . $ext;
        $path     = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $path)) {
            Response::error('Ошибка загрузки файла', 500);
            return;
        }

        $url = '/images/' . $filename;
        $stmt = $this->db->prepare(
            "INSERT INTO system_settings (`key`, `value`) VALUES ('favicon', ?)
             ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)"
        );
        $stmt->execute([$url]);

        Response::success(['favicon' => $url]);
    }

    // GET /api/system-settings/public — без авторизации (для фронта)
    public function getPublicSettings() {
        $keys = ['site_name', 'registration_enabled', 'favicon'];
        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $this->db->prepare(
            "SELECT `key`, `value` FROM system_settings WHERE `key` IN ($placeholders)"
        );
        $stmt->execute($keys);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['key']] = $row['value'];
        }
        Response::success(['settings' => $settings]);
    }

    // GET /api/system-settings/users — список пользователей
    public function getUsers() {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');

        $stmt = $this->db->query(
            "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC"
        );
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::success(['users' => $users]);
    }

    // PUT /api/system-settings/users/{id}
    public function updateUser($id) {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');

        $data = json_decode(file_get_contents('php://input'), true);
        $fields = [];
        $params = [];

        if (isset($data['role']) && in_array($data['role'], ['admin', 'editor', 'author'])) {
            $fields[] = 'role = ?';
            $params[] = $data['role'];
        }
        if (isset($data['is_active'])) {
            $fields[] = 'is_active = ?';
            $params[] = $data['is_active'] ? 1 : 0;
        }

        if (empty($fields)) {
            Response::error('Нет данных для обновления', 400);
            return;
        }

        $params[] = $id;
        $stmt = $this->db->prepare(
            "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?"
        );
        $stmt->execute($params);
        Response::success(['message' => 'Пользователь обновлён']);
    }

    // POST /api/system-settings/test-email
    public function sendTestEmail() {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');

        $data = json_decode(file_get_contents('php://input'), true);
        $to = $data['to'] ?? '';
        if (!$to) { Response::error('Не указан адрес', 400); return; }

        $stmt = $this->db->query("SELECT `key`, `value` FROM system_settings");
        $s = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) $s[$row['key']] = $row['value'];

        $host     = $s['smtp_host']      ?? 'smtp.spaceweb.ru';
        $port     = (int)($s['smtp_port'] ?? 587);
        $user     = $s['smtp_user']      ?? '';
        $pass     = $s['smtp_pass']      ?? '';
        $from     = $s['smtp_from']      ?? $user;
        $fromName = $s['smtp_from_name'] ?? 'Я СММ-щик';

        require_once __DIR__ . '/../services/MailService.php';
        error_log("SMTP test: host=$host port=$port user=$user");
        $result = MailService::send($to, 'Тестовое письмо', 'Это тестовое письмо из настроек системы.', $host, $port, $user, $pass, $from, $fromName);

        if ($result) {
            Response::success(['message' => 'Письмо отправлено']);
        } else {
            Response::error('Ошибка отправки', 500);
        }
    }

    // GET /api/system-settings/platforms
    public function getPlatforms() {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');
        $stmt = $this->db->query("SELECT * FROM social_platforms ORDER BY sort_order ASC, id ASC");
        Response::success(['platforms' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // POST /api/system-settings/platforms
    public function createPlatform() {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['code']) || empty($data['name'])) {
            Response::error('code и name обязательны', 400); return;
        }
        $stmt = $this->db->prepare(
            "INSERT INTO social_platforms (code, name, color, icon_url, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            trim($data['code']),
            trim($data['name']),
            $data['color']      ?? '#6366f1',
            $data['icon_url']   ?? null,
            isset($data['is_active']) ? (int)$data['is_active'] : 1,
            (int)($data['sort_order'] ?? 0)
        ]);
        $id = $this->db->lastInsertId();
        $row = $this->db->query("SELECT * FROM social_platforms WHERE id = $id")->fetch(PDO::FETCH_ASSOC);
        Response::success(['platform' => $row]);
    }

    // PUT /api/system-settings/platforms/{id}
    public function updatePlatform($id) {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');
        $data = json_decode(file_get_contents('php://input'), true);
        $fields = []; $params = [];
        foreach (['name','color','icon_url','is_active','sort_order','code'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = ?";
                $params[] = $f === 'is_active' ? (int)$data[$f] : $data[$f];
            }
        }
        if (empty($fields)) { Response::error('Нет данных', 400); return; }
        $params[] = $id;
        $this->db->prepare("UPDATE social_platforms SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
        $row = $this->db->query("SELECT * FROM social_platforms WHERE id = $id")->fetch(PDO::FETCH_ASSOC);
        Response::success(['platform' => $row]);
    }

    // DELETE /api/system-settings/platforms/{id}
    public function deletePlatform($id) {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');
        $this->db->prepare("DELETE FROM social_platforms WHERE id = ?")->execute([$id]);
        Response::success(['message' => 'Удалено']);
    }

    // POST /api/system-settings/platforms/{id}/icon
    public function uploadPlatformIcon($id) {
        AuthMiddleware::handle();
        AuthMiddleware::requireRole('admin');
        if (empty($_FILES['icon'])) { Response::error('Файл не передан', 400); return; }
        $file = $_FILES['icon'];
        $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['png','jpg','jpeg','webp','svg'])) { Response::error('Недопустимый формат', 400); return; }
        $uploadDir = __DIR__ . '/../../images/platforms/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $filename = 'platform_' . $id . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) { Response::error('Ошибка загрузки', 500); return; }
        $url = '/images/platforms/' . $filename;
        $this->db->prepare("UPDATE social_platforms SET icon_url = ? WHERE id = ?")->execute([$url, $id]);
        Response::success(['icon_url' => $url]);
    }

}