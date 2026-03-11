<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../helpers/Response.php';

class PublishScheduleController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function auth() {
        return AuthMiddleware::handle();
    }

    private function checkProject(int $projectId, int $userId): bool {
        $stmt = $this->db->prepare("SELECT id FROM projects WHERE id = ? AND user_id = ? AND is_active = 1");
        $stmt->execute([$projectId, $userId]);
        if ($stmt->fetch()) return true;
        $stmt = $this->db->prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?");
        $stmt->execute([$projectId, $userId]);
        return (bool)$stmt->fetch();
    }

    public function getAll(int $projectId) {
        $user = $this->auth();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403); return;
        }
        $stmt = $this->db->prepare("SELECT id, day_of_week, time_of_day, is_active FROM publish_schedules WHERE project_id = ? ORDER BY day_of_week, time_of_day");
        $stmt->execute([$projectId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::success(['schedules' => $rows]);
    }

    public function create(int $projectId) {
        $user = $this->auth();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403); return;
        }
        $body = json_decode(file_get_contents('php://input'), true);
        $days = $body['days'] ?? [];
        $time = $body['time'] ?? '';
        if (empty($days) || empty($time)) {
            Response::error('Укажите дни и время', 400); return;
        }
        if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
            Response::error('Неверный формат времени', 400); return;
        }
        $created = [];
        $stmt = $this->db->prepare("INSERT IGNORE INTO publish_schedules (project_id, user_id, day_of_week, time_of_day) VALUES (?, ?, ?, ?)");
        foreach ($days as $day) {
            $day = (int)$day;
            if ($day < 0 || $day > 6) continue;
            $stmt->execute([$projectId, $user['id'], $day, $time . ':00']);
            if ($stmt->rowCount()) {
                $created[] = ['id' => $this->db->lastInsertId(), 'day_of_week' => $day, 'time_of_day' => $time . ':00', 'is_active' => 1];
            }
        }
        Response::success(['created' => $created], 'Расписание добавлено');
    }

    public function delete(int $projectId, int $id) {
        $user = $this->auth();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403); return;
        }
        $stmt = $this->db->prepare("DELETE FROM publish_schedules WHERE id = ? AND project_id = ?");
        $stmt->execute([$id, $projectId]);
        if (!$stmt->rowCount()) { Response::error('Запись не найдена', 404); return; }
        Response::success([], 'Удалено');
    }

    public function clear(int $projectId) {
        $user = $this->auth();
        if (!$this->checkProject($projectId, $user['id'])) {
            Response::error('Нет доступа к проекту', 403); return;
        }
        $stmt = $this->db->prepare("DELETE FROM publish_schedules WHERE project_id = ?");
        $stmt->execute([$projectId]);
        Response::success([], 'Расписание очищено');
    }
}
