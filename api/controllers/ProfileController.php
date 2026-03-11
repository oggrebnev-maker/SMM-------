<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ProfileController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function get(): void {
        $user = AuthMiddleware::handle();
        $stmt = $this->db->prepare("
            SELECT id, name, email, phone, role, avatar, plan, plan_until,
                   oauth_yandex_id, oauth_yandex_avatar, oauth_yandex_name,
                   oauth_vk_id, oauth_vk_avatar, oauth_vk_name,
                   oauth_google_id, oauth_google_avatar, oauth_google_name,
                   created_at
            FROM users WHERE id = :id
        ");
        $stmt->execute(['id' => $user['id']]);
        $profile = $stmt->fetch();
        if (!$profile) Response::error('Пользователь не найден', 404);
        Response::success($profile);
    }

    public function update(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        $v = new Validator();
        if (isset($data['name']))  $v->required('name', $data['name'])->maxLength('name', $data['name'], 100);
        if (isset($data['email'])) $v->required('email', $data['email'])->email('email', $data['email'])->maxLength('email', $data['email'], 150);
        if (isset($data['phone'])) $v->maxLength('phone', $data['phone'], 20);
        if ($v->fails()) Response::error('Ошибка валидации', 422, $v->errors());

        if (isset($data['email'])) {
            $stmt = $this->db->prepare("SELECT id FROM users WHERE email = :email AND id != :id");
            $stmt->execute(['email' => strtolower(trim($data['email'])), 'id' => $user['id']]);
            if ($stmt->fetch()) Response::error('Email уже используется', 409);
        }

        $fields = [];
        $params = ['id' => $user['id']];

        if (isset($data['name']))  { $fields[] = 'name = :name';   $params['name']  = trim($data['name']); }
        if (isset($data['email'])) { $fields[] = 'email = :email'; $params['email'] = strtolower(trim($data['email'])); }
        if (isset($data['phone'])) { $fields[] = 'phone = :phone'; $params['phone'] = trim($data['phone']) ?: null; }

        if (empty($fields)) Response::error('Нет данных для обновления', 422);

        $stmt = $this->db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id");
        $stmt->execute($params);

        $stmt = $this->db->prepare("SELECT id, name, email, phone, role, avatar, plan, plan_until, oauth_yandex_id, oauth_vk_id, oauth_google_id FROM users WHERE id = :id");
        $stmt->execute(['id' => $user['id']]);
        Response::success($stmt->fetch(), 'Профиль обновлён');
    }

    public function changePassword(): void {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        $v = new Validator();
        $v->required('current_password', $data['current_password'] ?? '')
          ->required('new_password', $data['new_password'] ?? '')
          ->minLength('new_password', $data['new_password'] ?? '', 8);
        if ($v->fails()) Response::error('Ошибка валидации', 422, $v->errors());

        $stmt = $this->db->prepare("SELECT password FROM users WHERE id = :id");
        $stmt->execute(['id' => $user['id']]);
        $row = $stmt->fetch();

        if (!password_verify($data['current_password'], $row['password'])) {
            Response::error('Неверный текущий пароль', 401);
        }

        $stmt = $this->db->prepare("UPDATE users SET password = :password WHERE id = :id");
        $stmt->execute([
            'password' => password_hash($data['new_password'], PASSWORD_BCRYPT),
            'id'       => $user['id'],
        ]);

        Response::success(null, 'Пароль изменён');
    }

    public function uploadAvatar(): void {
        $user = AuthMiddleware::handle();

        if (!isset($_FILES['avatar'])) Response::error('Файл не загружен', 422);

        $file = $_FILES['avatar'];
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (!in_array($file['type'], $allowed)) Response::error('Допустимые форматы: JPG, PNG, WEBP', 422);
        if ($file['size'] > 1024 * 1024) Response::error('Максимальный размер: 1MB', 422);

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $user['id'] . '_' . time() . '.' . $ext;
        $uploadDir = __DIR__ . '/../../uploads/avatars/';

        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            Response::error('Ошибка при сохранении файла', 500);
        }

        $avatarUrl = '/uploads/avatars/' . $filename;

        $stmt = $this->db->prepare("UPDATE users SET avatar = :avatar WHERE id = :id");
        $stmt->execute(['avatar' => $avatarUrl, 'id' => $user['id']]);

        Response::success(['avatar' => $avatarUrl], 'Аватар обновлён');
    }

    public function deleteAvatar(): void {
        $user = AuthMiddleware::handle();

        $stmt = $this->db->prepare("SELECT avatar FROM users WHERE id = :id");
        $stmt->execute(['id' => $user['id']]);
        $row = $stmt->fetch();

        if ($row['avatar']) {
            $path = __DIR__ . '/../../' . ltrim($row['avatar'], '/');
            if (file_exists($path)) unlink($path);
        }

        $stmt = $this->db->prepare("UPDATE users SET avatar = NULL WHERE id = :id");
        $stmt->execute(['id' => $user['id']]);

        Response::success(null, 'Аватар удалён');
    }

    public function unlinkSocial(string $provider): void {
        $user = AuthMiddleware::handle();
        $allowed = ['yandex', 'vk', 'google'];
        if (!in_array($provider, $allowed)) Response::error('Неизвестный провайдер', 422);

        $field = 'oauth_' . $provider . '_id';
        $stmt = $this->db->prepare("UPDATE users SET {$field} = NULL WHERE id = :id");
        $stmt->execute(['id' => $user['id']]);

        Response::success(null, 'Привязка удалена');
    }
}
