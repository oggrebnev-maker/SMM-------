<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';

class ProjectHashtagController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function checkProject(int $projectId, int $userId): bool {
        $stmt = $this->db->prepare("SELECT id FROM projects WHERE id = ? AND is_active = 1");
        $stmt->execute([$projectId]);
        if (!$stmt->fetch()) return false;
        $stmt = $this->db->prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?");
        $stmt->execute([$projectId, $userId]);
        if ($stmt->fetch()) return true;
        $stmt = $this->db->prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?");
        $stmt->execute([$projectId, $userId]);
        return (bool)$stmt->fetch();
    }

    // GET /projects/{id}/hashtags
    public function getAll(int $projectId): void {
        $user = AuthMiddleware::handle();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403);
            return;
        }
        $stmt = $this->db->prepare("SELECT id, tag, sort_order, type FROM project_hashtags WHERE project_id = ? ORDER BY type, sort_order ASC, id ASC");
        $stmt->execute([$projectId]);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::success(['hashtags' => $list]);
    }

    // POST /projects/{id}/hashtags
    public function create(int $projectId): void {
        $user = AuthMiddleware::handle();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403);
            return;
        }
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $tag = isset($body['tag']) ? trim((string)$body['tag']) : '';
        if ($tag === '') {
            Response::error('Укажите хэштег', 422);
            return;
        }
        if (!preg_match('/^#?[\w\u0400-\u04FF]+$/u', $tag)) {
            Response::error('Недопустимые символы в хэштеге', 422);
            return;
        }
        if (mb_strlen($tag) > 255) {
            Response::error('Слишком длинный хэштег', 422);
            return;
        }
        $tag = ltrim($tag, '#');
        $stmt = $this->db->prepare("SELECT MAX(sort_order) FROM project_hashtags WHERE project_id = ? AND type = 'post'");
        $stmt->execute([$projectId]);
        $next = (int)$stmt->fetchColumn() + 1;
        $stmt = $this->db->prepare("INSERT INTO project_hashtags (project_id, type, tag, sort_order) VALUES (?, 'post', ?, ?)");
        $stmt->execute([$projectId, $tag, $next]);
        $id = (int)$this->db->lastInsertId();
        Response::success(['hashtag' => ['id' => $id, 'tag' => $tag, 'sort_order' => $next]], 'Хэштег добавлен', 201);
    }

    // DELETE /projects/{id}/hashtags/{hashtagId}
    public function delete(int $projectId, int $hashtagId): void {
        $user = AuthMiddleware::handle();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403);
            return;
        }
        $stmt = $this->db->prepare("DELETE FROM project_hashtags WHERE id = ? AND project_id = ?");
        $stmt->execute([$hashtagId, $projectId]);
        if (!$stmt->rowCount()) {
            Response::error('Хэштег не найден', 404);
            return;
        }
        Response::success([], 'Хэштег удалён');
    }

    private const DEFAULT_SETTINGS = [
        'max_count'  => 5,
        'placement'  => 'new_line',
        'mode'       => 'strict',
    ];

    // GET /projects/{id}/hashtags/config
    public function getConfig(int $projectId): void {
        $user = AuthMiddleware::handle();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403);
            return;
        }
        $stmt = $this->db->prepare("SELECT * FROM projects WHERE id = ? LIMIT 1");
        $stmt->execute([$projectId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $settingsJson = (isset($row['hashtags_settings'])) ? $row['hashtags_settings'] : null;
        $settings = $settingsJson ? (json_decode($settingsJson, true) ?: []) : [];
        $postSt = $settings['post'] ?? [];
        $commentSt = $settings['comment'] ?? [];
        $post = array_merge(self::DEFAULT_SETTINGS, $postSt);
        $comment = array_merge(self::DEFAULT_SETTINGS, $commentSt);

        $byType = ['post' => [], 'comment' => []];
        try {
            $stmt = $this->db->prepare("SELECT type, tag FROM project_hashtags WHERE project_id = ? ORDER BY type, sort_order ASC, id ASC");
            $stmt->execute([$projectId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                $t = $r['type'] ?? 'post';
                if (!isset($byType[$t])) $byType[$t] = [];
                $byType[$t][] = $r['tag'];
            }
        } catch (Throwable $e) {
            if (strpos($e->getMessage(), 'project_hashtags') === false && strpos($e->getMessage(), "doesn't exist") === false) {
                $stmt = $this->db->prepare("SELECT tag FROM project_hashtags WHERE project_id = ? ORDER BY sort_order ASC, id ASC");
                $stmt->execute([$projectId]);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($rows as $r) {
                    $byType['post'][] = $r['tag'];
                }
            }
        }
        $post['hashtags'] = implode(', ', $byType['post'] ?? []);
        $comment['hashtags'] = implode(', ', $byType['comment'] ?? []);

        Response::success([
            'post'    => $post,
            'comment' => $comment,
        ]);
    }

    // PUT /projects/{id}/hashtags/config
    public function putConfig(int $projectId): void {
        $user = AuthMiddleware::handle();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403);
            return;
        }
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $post = $body['post'] ?? [];
        $comment = $body['comment'] ?? [];
        $settings = [];

        $parseTags = function ($raw) {
            if (!is_string($raw)) return [];
            $raw = preg_replace('/#+/', '', $raw);
            $parts = preg_split('/[\s,]+/u', $raw, -1, PREG_SPLIT_NO_EMPTY);
            $out = [];
            foreach ($parts as $p) {
                $t = trim($p);
                if ($t !== '' && mb_strlen($t) <= 255) $out[] = $t;
            }
            return array_values(array_unique($out));
        };

        try {
            foreach (['post' => $post, 'comment' => $comment] as $type => $cfg) {
                $tags = $parseTags($cfg['hashtags'] ?? '');
                $maxCount = isset($cfg['max_count']) ? (int)$cfg['max_count'] : self::DEFAULT_SETTINGS['max_count'];
                $maxCount = max(0, min(100, $maxCount));
                $placement = in_array($cfg['placement'] ?? '', ['new_line', 'every_other_line', 'same_line'], true)
                    ? $cfg['placement'] : self::DEFAULT_SETTINGS['placement'];
                $mode = in_array($cfg['mode'] ?? '', ['strict', 'random'], true) ? $cfg['mode'] : self::DEFAULT_SETTINGS['mode'];

                $this->db->prepare("DELETE FROM project_hashtags WHERE project_id = ? AND type = ?")->execute([$projectId, $type]);
                $ins = $this->db->prepare("INSERT INTO project_hashtags (project_id, type, tag, sort_order) VALUES (?, ?, ?, ?)");
                foreach ($tags as $i => $tag) {
                    $ins->execute([$projectId, $type, $tag, $i]);
                }
                $settings[$type] = ['max_count' => $maxCount, 'placement' => $placement, 'mode' => $mode];
            }
        } catch (Throwable $ex) {
            if (strpos($ex->getMessage(), 'project_hashtags') !== false || strpos($ex->getMessage(), 'hashtags_settings') !== false || strpos($ex->getMessage(), "doesn't exist") !== false) {
                Response::error('Выполните миграции БД: api/migrations/run_all_templates.sql', 503);
                return;
            }
            throw $ex;
        }

        try {
            $stmt = $this->db->prepare("UPDATE projects SET hashtags_settings = ? WHERE id = ?");
            $stmt->execute([json_encode($settings, JSON_UNESCAPED_UNICODE), $projectId]);
        } catch (Throwable $ex) {
            if (strpos($ex->getMessage(), 'hashtags_settings') !== false || strpos($ex->getMessage(), 'Unknown column') !== false) {
                Response::error('Выполните миграции БД: api/migrations/run_all_templates.sql', 503);
                return;
            }
            throw $ex;
        }
        Response::success([], 'Настройки хэштегов сохранены');
    }
}
