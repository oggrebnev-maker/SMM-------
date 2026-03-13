<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/UserIdService.php';

$db = Database::getInstance()->getConnection();
$idService = new UserIdService($db);

echo "Starting display_id migration...\n";

$stmt = $db->query("SELECT id, created_at FROM users WHERE display_id IS NULL ORDER BY created_at ASC, id ASC");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($users as $u) {
    $id = (int)$u['id'];
    $createdAt = $u['created_at'] ?? null;
    $year = (int)date('Y');
    if ($createdAt) {
        $ts = strtotime($createdAt);
        if ($ts !== false) {
            $year = (int)date('Y', $ts);
        }
    }

    try {
        $displayId = $idService->generateForYear($year);
        $upd = $db->prepare("UPDATE users SET display_id = :display_id WHERE id = :id");
        $upd->execute(['display_id' => $displayId, 'id' => $id]);
        echo "User {$id}: display_id={$displayId}\n";
    } catch (Throwable $e) {
        echo "User {$id}: error {$e->getMessage()}\n";
    }
}

echo "Migration complete.\n";

