<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

$db = Database::getInstance()->getConnection();

$stmt = $db->prepare("
    DELETE FROM users 
    WHERE email_verified = false 
    AND email_token_expires < NOW()
    RETURNING id, email, name
");
$stmt->execute();
$deleted = $stmt->fetchAll();

foreach ($deleted as $user) {
    echo "[" . date('Y-m-d H:i:s') . "] Удалён: {$user['email']} (ID: {$user['id']})\n";
}

echo "[" . date('Y-m-d H:i:s') . "] Готово. Удалено: " . count($deleted) . "\n";
