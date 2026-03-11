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

        $stmt = $this->db->prepare("
            SELECT p.* FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE (p.user_id = :uid OR pm.user_id IS NOT NULL)
              AND p.is_active = 1
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([':uid' => $uid, ':uid2' => $uid]);
        $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    private function getAccessibleProject(int $id, int $uid): ?array {
        $stmt = $this->db->prepare("
            SELECT p.* FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :uid2
            WHERE p.id = :id AND p.is_active = 1
              AND (p.user_id = :uid OR pm.user_id IS NOT NULL)
        ");
        $stmt->execute([':id'=>$id, ':uid'=>$uid, ':uid2'=>$uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
