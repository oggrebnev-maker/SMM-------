<?php
class SocialAccountController {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // GET /api/social-accounts
    public function getAll() {
        $user = AuthMiddleware::handle();
        $stmt = $this->db->prepare(
            "SELECT sa.*, p.name AS platform_name, p.color AS platform_color, p.icon_url AS platform_icon
             FROM social_accounts sa
             LEFT JOIN social_platforms p ON p.code = sa.platform
             WHERE sa.user_id = ?
             ORDER BY sa.created_at DESC"
        );
        $stmt->execute([$user['id']]);
        Response::success(['accounts' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // GET /api/social-accounts/platforms — список доступных платформ (для формы подключения)
    public function getPlatforms() {
        AuthMiddleware::handle();
        $stmt = $this->db->query(
            "SELECT id, code, name, color, icon_url FROM social_platforms WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
        );
        Response::success(['platforms' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // POST /api/social-accounts
    public function create() {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['platform']) || empty($data['name'])) {
            Response::error('platform и name обязательны', 400);
            return;
        }

        // Проверяем что платформа существует
        $stmt = $this->db->prepare("SELECT id FROM social_platforms WHERE code = ? AND is_active = 1");
        $stmt->execute([$data['platform']]);
        if (!$stmt->fetch()) {
            Response::error('Платформа не найдена', 404);
            return;
        }

        $credentials_raw = isset($data['credentials']) ? $data['credentials'] : [];
        $meta = [];

        // Проверка Telegram
        if ($data['platform'] === 'telegram') {
            $bot_token       = trim($credentials_raw['bot_token'] ?? '');
            $channel_username = trim($credentials_raw['channel_username'] ?? '');
            if (empty($bot_token) || empty($channel_username)) {
                Response::error('Введите токен бота и ссылку на канал', 400);
                return;
            }
            // Проверяем токен через getMe
            $meUrl = "https://api.telegram.org/bot{$bot_token}/getMe";
            $meRes = @file_get_contents($meUrl);
            if (!$meRes) {
                Response::error('Не удалось подключиться к Telegram API. Проверьте токен.', 400);
                return;
            }
            $me = json_decode($meRes, true);
            if (empty($me['ok'])) {
                Response::error('Неверный токен бота. Проверьте правильность.', 400);
                return;
            }
            // Проверяем канал через getChat
            $chatId = $channel_username;
            if (strpos($chatId, '@') !== 0) $chatId = '@' . $chatId;
            $chatUrl = "https://api.telegram.org/bot{$bot_token}/getChat?chat_id=" . urlencode($chatId);
            $chatRes = @file_get_contents($chatUrl);
            $chat = $chatRes ? json_decode($chatRes, true) : null;
            if (empty($chat['ok'])) {
                Response::error('Канал не найден или бот не добавлен в канал как администратор.', 400);
                return;
            }
            $chatData = $chat['result'];
            // Берём реальное название канала
            $data['name'] = $chatData['title'] ?? $channel_username;
            // Скачиваем аватар канала
            $avatarUrl = '';
            if (!empty($chatData['photo']['big_file_id'])) {
                $fileId  = $chatData['photo']['big_file_id'];
                $fileRes = @file_get_contents("https://api.telegram.org/bot{$bot_token}/getFile?file_id={$fileId}");
                $fileData = $fileRes ? json_decode($fileRes, true) : null;
                if (!empty($fileData['ok'])) {
                    $filePath = $fileData['result']['file_path'];
                    $fileContent = @file_get_contents("https://api.telegram.org/file/bot{$bot_token}/{$filePath}");
                    if ($fileContent) {
                        $avatarDir = __DIR__ . '/../../uploads/avatars/';
                        if (!is_dir($avatarDir)) mkdir($avatarDir, 0755, true);
                        $avatarFile = 'tg_' . md5($chatData['id']) . '.jpg';
                        file_put_contents($avatarDir . $avatarFile, $fileContent);
                        $avatarUrl = '/uploads/avatars/' . $avatarFile;
                    }
                }
            }
            // Сохраняем мета-данные канала
            $meta = [
                'chat_id'    => $chatData['id'],
                'title'      => $chatData['title'] ?? '',
                'username'   => $chatData['username'] ?? '',
                'type'       => $chatData['type'] ?? '',
                'bot_name'   => $me['result']['username'] ?? '',
                'avatar_url' => $avatarUrl,
            ];
        }

        $credentials = json_encode($credentials_raw);
        $meta        = json_encode($meta);

        $stmt = $this->db->prepare(
            "INSERT INTO social_accounts (user_id, platform, name, credentials, meta, is_active)
             VALUES (?, ?, ?, ?, ?, 1)"
        );
        $stmt->execute([
            $user['id'],
            $data['platform'],
            trim($data['name']),
            $credentials,
            $meta
        ]);
        $id = $this->db->lastInsertId();
        $row = $this->db->query(
            "SELECT sa.*, p.name AS platform_name, p.color AS platform_color, p.icon_url AS platform_icon
             FROM social_accounts sa
             LEFT JOIN social_platforms p ON p.code = sa.platform
             WHERE sa.id = $id"
        )->fetch(PDO::FETCH_ASSOC);

        Response::success(['account' => $row]);
    }

    // GET /api/social-accounts/{id}
    public function getOne($id) {
        $user = AuthMiddleware::handle();
        $stmt = $this->db->prepare(
            "SELECT sa.*, p.name AS platform_name, p.color AS platform_color, p.icon_url AS platform_icon
             FROM social_accounts sa
             LEFT JOIN social_platforms p ON p.code = sa.platform
             WHERE sa.id = ? AND sa.user_id = ?"
        );
        $stmt->execute([$id, $user['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) { Response::error('Не найдено', 404); return; }
        Response::success(['account' => $row]);
    }

    // PUT /api/social-accounts/{id}
    public function update($id) {
        $user = AuthMiddleware::handle();
        $data = json_decode(file_get_contents('php://input'), true);

        // Проверяем владельца
        $stmt = $this->db->prepare("SELECT id FROM social_accounts WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user['id']]);
        if (!$stmt->fetch()) { Response::error('Не найдено', 404); return; }

        $fields = []; $params = [];
        if (isset($data['name'])) { $fields[] = 'name = ?'; $params[] = trim($data['name']); }
        if (isset($data['credentials'])) { $fields[] = 'credentials = ?'; $params[] = json_encode($data['credentials']); }
        if (isset($data['meta'])) { $fields[] = 'meta = ?'; $params[] = json_encode($data['meta']); }
        if (isset($data['is_active'])) { $fields[] = 'is_active = ?'; $params[] = (int)$data['is_active']; }

        if (empty($fields)) { Response::error('Нет данных', 400); return; }

        $params[] = $id;
        $this->db->prepare("UPDATE social_accounts SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);

        $row = $this->db->query(
            "SELECT sa.*, p.name AS platform_name, p.color AS platform_color, p.icon_url AS platform_icon
             FROM social_accounts sa
             LEFT JOIN social_platforms p ON p.code = sa.platform
             WHERE sa.id = $id"
        )->fetch(PDO::FETCH_ASSOC);
        Response::success(['account' => $row]);
    }

    // DELETE /api/social-accounts/{id}
    public function delete($id) {
        $user = AuthMiddleware::handle();
        $stmt = $this->db->prepare("SELECT id FROM social_accounts WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user['id']]);
        if (!$stmt->fetch()) { Response::error('Не найдено', 404); return; }
        $this->db->prepare("DELETE FROM social_accounts WHERE id = ?")->execute([$id]);
        Response::success(['message' => 'Удалено']);
    }
}
