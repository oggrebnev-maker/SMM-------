<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ProjectChannelController {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // GET /projects/{pid}/channels
    public function getAll(int $pid): void {
        $user = AuthMiddleware::handle();
        $this->checkAccess($pid, $user['id']);

        $stmt = $this->db->prepare("
            SELECT sc.*, sa.platform, sa.name, sa.meta, sa.is_active as account_active,
                   sp.color as platform_color, sp.icon_url as platform_icon, sp.name as platform_name
            FROM social_channels sc
            JOIN social_accounts sa ON sa.id = sc.social_account_id
            LEFT JOIN social_platforms sp ON sp.code = sa.platform
            WHERE sc.project_id = :pid
            ORDER BY sc.created_at ASC
        ");
        $stmt->execute([':pid' => $pid]);
        $channels = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($channels as &$ch) {
            if (isset($ch['meta']) && is_string($ch['meta'])) {
                $ch['meta'] = json_decode($ch['meta'], true) ?? [];
            }
        }

        Response::success(['channels' => $channels]);
    }

    // POST /projects/{pid}/channels
    public function create(int $pid): void {
        $user = AuthMiddleware::handle();
        $this->checkAccess($pid, $user['id']);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $accountId = (int)($body['social_account_id'] ?? 0);
        $alias = trim($body['alias'] ?? '');

        if (!$accountId) { Response::error('social_account_id обязателен', 422); return; }

        // Проверяем что аккаунт принадлежит пользователю
        $stmt = $this->db->prepare("SELECT id FROM social_accounts WHERE id=:id AND user_id=:uid");
        $stmt->execute([':id' => $accountId, ':uid' => $user['id']]);
        if (!$stmt->fetch()) { Response::error('Аккаунт не найден', 404); return; }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO social_channels (project_id, social_account_id, alias, is_active, created_at)
                VALUES (:pid, :aid, :alias, 1, NOW())
            ");
            $stmt->execute([':pid' => $pid, ':aid' => $accountId, ':alias' => $alias ?: null]);
        } catch (Exception $e) {
            Response::error('Аккаунт уже подключён к этому проекту', 422); return;
        }

        Response::success([], 'Аккаунт подключён к проекту', 201);
    }

    // PATCH /projects/{pid}/channels/{id}
    public function update(int $pid, int $id): void {
        $user = AuthMiddleware::handle();
        $this->checkAccess($pid, $user['id']);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $isActive = isset($body['is_active']) ? (int)(bool)$body['is_active'] : null;
        if ($isActive === null) {
            Response::error('is_active обязателен', 422);
            return;
        }

        $stmt = $this->db->prepare("UPDATE social_channels SET is_active = :active WHERE id = :id AND project_id = :pid");
        $stmt->execute([':active' => $isActive, ':id' => $id, ':pid' => $pid]);
        if ($stmt->rowCount() === 0) {
            Response::notFound('Канал не найден');
            return;
        }
        Response::success([], 'Обновлено');
    }

    // DELETE /projects/{pid}/channels/{id}
    public function delete(int $pid, int $id): void {
        $user = AuthMiddleware::handle();
        $this->checkAccess($pid, $user['id']);

        $stmt = $this->db->prepare("DELETE FROM social_channels WHERE id=:id AND project_id=:pid");
        $stmt->execute([':id' => $id, ':pid' => $pid]);
        Response::success([], 'Канал отвязан');
    }

    private function checkAccess(int $pid, int $uid): void {
        $stmt = $this->db->prepare("
            SELECT p.id FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE p.id = :pid AND p.is_active = 1 AND (p.user_id = :uid OR pm.user_id IS NOT NULL)
        ");
        $stmt->execute([':pid' => $pid, ':uid' => $uid, ':uid2' => $uid]);
        if (!$stmt->fetch()) { Response::notFound('Проект не найден'); exit; }
    }
}
