<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class PostController {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /** POST /projects/{id}/posts — создание поста (JSON или multipart с изображением) */
    public function create(int $projectId): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($projectId, $user['id']);
        if (!$project) {
            Response::notFound('Проект не найден');
            return;
        }

        $content = '';
        $scheduledAt = '';
        $channelIds = [];
        $mediaUrls = [];

        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'multipart/form-data') !== false) {
            $content = trim((string) ($_POST['content'] ?? ''));
            $scheduledAt = trim((string) ($_POST['scheduled_at'] ?? ''));
            $channelIds = isset($_POST['channel_ids']) && is_array($_POST['channel_ids'])
                ? $_POST['channel_ids']
                : (isset($_POST['channel_ids']) ? [$_POST['channel_ids']] : []);
            if (!empty($_FILES['image']['tmp_name'])) {
                $names = $_FILES['image']['name'];
                $tmpNames = $_FILES['image']['tmp_name'];
                $isMulti = is_array($names);
                if ($isMulti) {
                    foreach ($names as $i => $name) {
                        if (empty($tmpNames[$i]) || !is_uploaded_file($tmpNames[$i])) continue;
                        $file = ['name' => $names[$i], 'type' => $_FILES['image']['type'][$i] ?? '', 'size' => $_FILES['image']['size'][$i] ?? 0, 'tmp_name' => $tmpNames[$i], 'error' => $_FILES['image']['error'][$i] ?? 0];
                        $url = $this->savePostImage($file, $projectId);
                        if ($url !== null) $mediaUrls[] = $url;
                    }
                } else {
                    if (is_uploaded_file($_FILES['image']['tmp_name'])) {
                        $url = $this->savePostImage($_FILES['image'], $projectId);
                        if ($url !== null) $mediaUrls[] = $url;
                    }
                }
            }
        } else {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $content = trim($body['content'] ?? '');
            $scheduledAt = trim($body['scheduled_at'] ?? '');
            $channelIds = $body['channel_ids'] ?? [];
        }

        if ($content === '') {
            Response::error('Текст поста обязателен', 422);
            return;
        }
        if (!$scheduledAt) {
            Response::error('Укажите дату и время публикации', 422);
            return;
        }

        $post = [
            'id' => 0,
            'project_id' => $projectId,
            'content' => $content,
            'scheduled_at' => $scheduledAt,
            'channel_ids' => is_array($channelIds) ? $channelIds : [],
            'status' => 'scheduled',
        ];
        if (!empty($mediaUrls)) {
            $post['media_urls'] = $mediaUrls;
            $post['media_url'] = $mediaUrls[0];
        }

        Response::success(['post' => $post], 'Пост создан и запланирован', 201);
    }

    /** Сохраняет загруженное изображение поста, возвращает URL или null при ошибке */
    private function savePostImage(array $file, int $projectId): ?string {
        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file['type'] ?? '', $allowed)) {
            return null;
        }
        if (($file['size'] ?? 0) > 10 * 1024 * 1024) {
            return null;
        }
        $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION)) ?: 'jpg';
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
            return null;
        }
        $uploadDir = dirname(__DIR__, 2) . '/uploads/posts/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $filename = 'post_' . $projectId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            return null;
        }
        return '/uploads/posts/' . $filename;
    }

    private function getAccessibleProject(int $id, int $uid): ?array {
        $stmt = $this->db->prepare("
            SELECT p.* FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE p.id = :id AND p.is_active = 1
              AND (p.user_id = :uid OR pm.user_id IS NOT NULL)
        ");
        $stmt->execute([':id' => $id, ':uid' => $uid, ':uid2' => $uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
