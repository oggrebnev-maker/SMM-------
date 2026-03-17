<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ProjectController {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // GET /projects
    public function getAll(): void {
        $user = AuthMiddleware::handle();
        $uid = $user['id'];

        $sqlWithHashtags = "
            SELECT p.*, (SELECT COUNT(*) FROM project_hashtags ph WHERE ph.project_id = p.id) AS hashtags_count
            FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE (p.user_id = :uid OR pm.user_id IS NOT NULL)
              AND p.is_active = 1
            ORDER BY p.created_at DESC
        ";
        $sqlWithoutHashtags = "
            SELECT p.*
            FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE (p.user_id = :uid OR pm.user_id IS NOT NULL)
              AND p.is_active = 1
            ORDER BY p.created_at DESC
        ";
        $params = [':uid' => $uid, ':uid2' => $uid];

        try {
            $stmt = $this->db->prepare($sqlWithHashtags);
            $stmt->execute($params);
            $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            // Таблица project_hashtags может отсутствовать до выполнения миграции
            if (strpos($e->getMessage(), 'project_hashtags') !== false || strpos($e->getMessage(), 'exist') !== false) {
                $stmt = $this->db->prepare($sqlWithoutHashtags);
                $stmt->execute($params);
                $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($projects as &$row) {
                    $row['hashtags_count'] = 0;
                }
                unset($row);
            } else {
                throw $e;
            }
        }

        foreach ($projects as &$row) {
            $row['watermark_added'] = !empty($row['watermark_image']);
        }
        unset($row);

        Response::success(['projects' => $projects]);
    }

    // POST /projects
    public function create(): void {
        $user = AuthMiddleware::handle();
        $uid = $user['id'];

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $name  = trim($body['name'] ?? '');
        $desc  = trim($body['description'] ?? '');
        $color = trim($body['color'] ?? '#6366f1');

        if (!$name) {
            Response::error('Название проекта обязательно', 422);
            return;
        }

        $stmt = $this->db->prepare("
            INSERT INTO projects (user_id, name, description, color, is_active, created_at, updated_at)
            VALUES (:uid, :name, :desc, :color, 1, NOW(), NOW())
        ");
        $stmt->execute([
            ':uid'   => $uid,
            ':name'  => $name,
            ':desc'  => $desc ?: null,
            ':color' => $color,
        ]);
        $id = $this->db->lastInsertId();

        // Добавляем создателя как owner в project_members
        $stmt2 = $this->db->prepare("
            INSERT INTO project_members (project_id, user_id, role, invited_at)
            VALUES (:pid, :uid, 'owner', NOW())
        ");
        $stmt2->execute([':pid' => $id, ':uid' => $uid]);

        $stmt3 = $this->db->prepare("SELECT * FROM projects WHERE id = :id");
        $stmt3->execute([':id' => $id]);
        $project = $stmt3->fetch(PDO::FETCH_ASSOC);

        Response::success(['project' => $project], 'Проект создан', 201);
    }

    // GET /projects/{id}
    public function getOne(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }
        $project['watermark_added'] = !empty($project['watermark_image']);
        Response::success(['project' => $project]);
    }

    // PUT /projects/{id}
    public function update(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }

        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $name  = trim($body['name'] ?? $project['name']);
        $desc  = trim($body['description'] ?? $project['description'] ?? '');
        $color = trim($body['color'] ?? $project['color']);
        $utm   = isset($body['utm_template']) ? json_encode($body['utm_template'], JSON_UNESCAPED_UNICODE) : $project['utm_template'];

        if (!$name) { Response::error('Название обязательно', 422); return; }

        $stmt = $this->db->prepare("
            UPDATE projects SET name=:name, description=:desc, color=:color, utm_template=:utm, updated_at=NOW()
            WHERE id=:id
        ");
        $stmt->execute([':name'=>$name, ':desc'=>$desc?:null, ':color'=>$color, ':utm'=>$utm?:null, ':id'=>$id]);

        $stmt2 = $this->db->prepare("SELECT * FROM projects WHERE id=:id");
        $stmt2->execute([':id'=>$id]);
        Response::success(['project' => $stmt2->fetch(PDO::FETCH_ASSOC)]);
    }

    // DELETE /projects/{id}
    public function delete(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }
        if ($project['user_id'] != $user['id'] && $user['role'] !== 'admin') {
            Response::error('Недостаточно прав', 403); return;
        }
        $stmt = $this->db->prepare("UPDATE projects SET is_active=0 WHERE id=:id");
        $stmt->execute([':id' => $id]);
        Response::success([], 'Проект удалён');
    }

    // POST /projects/{id}/logo
    public function uploadLogo(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }

        if (empty($_FILES['logo'])) { Response::error('Файл не передан', 422); return; }
        $file = $_FILES['logo'];
        $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg','jpeg','png','webp','gif'])) {
            Response::error('Недопустимый формат', 422); return;
        }
        $uploadDir = dirname(__DIR__, 2) . '/uploads/projects/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        // Удаляем старый логотип
        if ($project['logo']) {
            $old = dirname(__DIR__, 2) . '/' . ltrim($project['logo'], '/');
            if (file_exists($old)) unlink($old);
        }
        $filename = 'proj_' . $id . '_' . time() . '.' . $ext;
        move_uploaded_file($file['tmp_name'], $uploadDir . $filename);
        $path = '/uploads/projects/' . $filename;
        $stmt = $this->db->prepare("UPDATE projects SET logo=:logo, updated_at=NOW() WHERE id=:id");
        $stmt->execute([':logo' => $path, ':id' => $id]);
        Response::success(['logo' => $path]);
    }

    // DELETE /projects/{id}/logo
    public function deleteLogo(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }
        if ($project['logo']) {
            $old = dirname(__DIR__, 2) . '/' . ltrim($project['logo'], '/');
            if (file_exists($old)) unlink($old);
        }
        $stmt = $this->db->prepare("UPDATE projects SET logo=NULL, updated_at=NOW() WHERE id=:id");
        $stmt->execute([':id' => $id]);
        Response::success([]);
    }

    // POST /projects/{id}/watermark — загрузка изображения вотермарка
    public function uploadWatermark(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }

        if (empty($_FILES['watermark'])) { Response::error('Файл не передан', 422); return; }
        $file = $_FILES['watermark'];
        $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg','jpeg','png','webp','gif'])) {
            Response::error('Недопустимый формат. Допустимы: JPG, PNG, WebP, GIF', 422); return;
        }
        $uploadDir = dirname(__DIR__, 2) . '/uploads/projects/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        if (!empty($project['watermark_image'])) {
            $old = dirname(__DIR__, 2) . '/' . ltrim($project['watermark_image'], '/');
            if (file_exists($old)) unlink($old);
        }
        $filename = 'watermark_' . $id . '_' . time() . '.' . $ext;
        move_uploaded_file($file['tmp_name'], $uploadDir . $filename);
        $path = '/uploads/projects/' . $filename;
        $stmt = $this->db->prepare("UPDATE projects SET watermark_image=:img, updated_at=NOW() WHERE id=:id");
        $stmt->execute([':img' => $path, ':id' => $id]);
        $stmt2 = $this->db->prepare("SELECT id, watermark_image FROM projects WHERE id=:id");
        $stmt2->execute([':id' => $id]);
        Response::success(['watermark' => $stmt2->fetch(PDO::FETCH_ASSOC)]);
    }

    // PUT /projects/{id}/watermark — позиция, прозрачность, размер
    public function updateWatermark(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $position = isset($body['position']) ? trim($body['position']) : ($project['watermark_position'] ?? 'bottom_right');
        $opacity = isset($body['opacity']) ? (int) $body['opacity'] : (int) ($project['watermark_opacity'] ?? 80);
        $opacity = max(0, min(100, $opacity));
        $size = isset($body['size']) ? (int) $body['size'] : (int) ($project['watermark_size'] ?? 100);
        $size = max(5, min(200, $size));
        $allowedPositions = ['top_left','top_right','bottom_left','bottom_right','center'];
        if (!in_array($position, $allowedPositions)) $position = 'bottom_right';

        $stmt = $this->db->prepare("UPDATE projects SET watermark_position=:pos, watermark_opacity=:op, watermark_size=:size, updated_at=NOW() WHERE id=:id");
        $stmt->execute([':pos' => $position, ':op' => $opacity, ':size' => $size, ':id' => $id]);
        $stmt2 = $this->db->prepare("SELECT id, watermark_image, watermark_position, watermark_opacity, watermark_size FROM projects WHERE id=:id");
        $stmt2->execute([':id' => $id]);
        Response::success(['watermark' => $stmt2->fetch(PDO::FETCH_ASSOC)]);
    }

    // GET /projects/{id}/watermark/image — отдача файла вотермарка (для превью)
    public function getWatermarkImage(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project || empty($project['watermark_image'])) { Response::notFound('Изображение не найдено'); return; }
        $path = dirname(__DIR__, 2) . '/' . ltrim($project['watermark_image'], '/');
        if (!is_file($path)) { Response::notFound('Файл не найден'); return; }
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mimes = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp'];
        header('Content-Type: ' . ($mimes[$ext] ?? 'application/octet-stream'));
        header('Cache-Control: private, max-age=300');
        readfile($path);
        exit;
    }

    // DELETE /projects/{id}/watermark
    public function deleteWatermark(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }
        if (!empty($project['watermark_image'])) {
            $old = dirname(__DIR__, 2) . '/' . ltrim($project['watermark_image'], '/');
            if (file_exists($old)) unlink($old);
        }
        $stmt = $this->db->prepare("UPDATE projects SET watermark_image=NULL, updated_at=NOW() WHERE id=:id");
        $stmt->execute([':id' => $id]);
        Response::success([]);
    }

    private function getAccessibleProject(int $id, int $uid): ?array {
        $params = [':id'=>$id, ':uid'=>$uid, ':uid2'=>$uid];
        $sqlWith = "SELECT p.*, (SELECT COUNT(*) FROM project_hashtags ph WHERE ph.project_id = p.id) AS hashtags_count
            FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE p.id = :id AND p.is_active = 1 AND (p.user_id = :uid OR pm.user_id IS NOT NULL)";
        $sqlWithout = "SELECT p.* FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE p.id = :id AND p.is_active = 1 AND (p.user_id = :uid OR pm.user_id IS NOT NULL)";
        try {
            $stmt = $this->db->prepare($sqlWith);
            $stmt->execute($params);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            if (strpos($e->getMessage(), 'project_hashtags') !== false || strpos($e->getMessage(), 'exist') !== false) {
                $stmt = $this->db->prepare($sqlWithout);
                $stmt->execute($params);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row) $row['hashtags_count'] = 0;
            } else {
                throw $e;
            }
        }
        return $row ?: null;
    }

    // GET /projects/{id}/signature — возвращает массив подписей
    public function getSignature(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }
        $raw = isset($project['signature_settings']) ? $project['signature_settings'] : null;
        $decoded = is_string($raw) ? (json_decode($raw, true) ?: []) : (is_array($raw) ? $raw : []);
        if (isset($decoded['name']) || isset($decoded['usage']) || isset($decoded['text'])) {
            $decoded = [$decoded];
        }
        if (!is_array($decoded)) {
            $decoded = [];
        }
        $signatures = [];
        foreach ($decoded as $item) {
            if (!is_array($item)) continue;
            $signatures[] = [
                'name'  => trim((string)($item['name'] ?? '')),
                'usage' => in_array($item['usage'] ?? '', ['manual', 'post_end', 'comment_end']) ? $item['usage'] : 'manual',
                'text'  => trim((string)($item['text'] ?? '')),
            ];
        }
        Response::success(['signatures' => $signatures]);
    }

    // PUT /projects/{id}/signature — принимает { signatures: [ { name, usage, text }, ... ] }
    public function putSignature(int $id): void {
        $user = AuthMiddleware::handle();
        $project = $this->getAccessibleProject($id, $user['id']);
        if (!$project) { Response::notFound('Проект не найден'); return; }
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $list = $body['signatures'] ?? null;
        if (!is_array($list)) {
            if (isset($body['name']) || isset($body['usage']) || isset($body['text'])) {
                $list = [['name' => $body['name'] ?? '', 'usage' => $body['usage'] ?? 'manual', 'text' => $body['text'] ?? '']];
            } else {
                $list = [];
            }
        }
        $signatures = [];
        foreach ($list as $item) {
            if (!is_array($item)) continue;
            $signatures[] = [
                'name'  => trim((string)($item['name'] ?? '')),
                'usage' => in_array($item['usage'] ?? '', ['manual', 'post_end', 'comment_end']) ? $item['usage'] : 'manual',
                'text'  => trim((string)($item['text'] ?? '')),
            ];
        }
        $json = json_encode($signatures, JSON_UNESCAPED_UNICODE);
        try {
            $stmt = $this->db->prepare("UPDATE projects SET signature_settings = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$json, $id]);
        } catch (Throwable $ex) {
            if (strpos($ex->getMessage(), 'signature_settings') !== false || strpos($ex->getMessage(), 'Unknown column') !== false) {
                Response::error('Выполните миграции БД: api/migrations/run_all_templates.sql', 503);
                return;
            }
            throw $ex;
        }
        Response::success(['signatures' => $signatures]);
    }
}
