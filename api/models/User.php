<?php
require_once __DIR__ . '/../config/database.php';
class User {
    private PDO $db;
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    public function findByEmail(string $email): ?array {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email AND is_active = 1");
        $stmt->execute(['email' => $email]);
        return $stmt->fetch() ?: null;
    }
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT id, name, email, role, avatar, plan, plan_until, created_at FROM users WHERE id = :id AND is_active = 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }
    public function findByEmailToken(string $token): ?array {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email_token = :token AND email_token_expires > NOW()");
        $stmt->execute(['token' => $token]);
        return $stmt->fetch() ?: null;
    }
    public function create(array $data): ?array {
        $token = bin2hex(random_bytes(32));
        $stmt = $this->db->prepare("
            INSERT INTO users (name, email, password, role, email_token, email_token_expires)
            VALUES (:name, :email, :password, :role, :token, DATE_ADD(NOW(), INTERVAL 24 HOUR))
        ");
        $stmt->execute([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_BCRYPT),
            'role'     => $data['role'] ?? 'author',
            'token'    => $token,
        ]);
        $id = $this->db->lastInsertId();
        $stmt2 = $this->db->prepare("SELECT id, name, email, role, avatar, plan, created_at, email_verified FROM users WHERE id = :id");
        $stmt2->execute(['id' => $id]);
        $user = $stmt2->fetch() ?: null;
        if ($user) $user['email_token'] = $token;
        return $user;
    }
    public function verifyEmail(int $id): bool {
        $stmt = $this->db->prepare("UPDATE users SET email_verified = 1, email_token = NULL, email_token_expires = NULL WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
    public function refreshEmailToken(int $id): string {
        $token = bin2hex(random_bytes(32));
        $stmt = $this->db->prepare("UPDATE users SET email_token = :token, email_token_expires = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = :id");
        $stmt->execute(['token' => $token, 'id' => $id]);
        return $token;
    }
    public function updatePassword(int $id, string $password): bool {
        $stmt = $this->db->prepare("UPDATE users SET password = :password WHERE id = :id");
        return $stmt->execute([
            'password' => password_hash($password, PASSWORD_BCRYPT),
            'id'       => $id,
        ]);
    }
}
