<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    public static function handle(): array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            Response::unauthorized('Токен не передан');
        }

        $token = substr($authHeader, 7);
        $payload = self::verifyToken($token);

        if (!$payload) {
            Response::unauthorized('Токен недействителен или истёк');
        }

        $user = (new User())->findById($payload['user_id']);

        if (!$user) {
            Response::unauthorized('Пользователь не найден');
        }

        return $user;
    }

    public static function generateToken(int $userId, string $role): string {
        $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = base64_encode(json_encode([
            'user_id' => $userId,
            'role'    => $role,
            'iat'     => time(),
            'exp'     => time() + JWT_EXPIRE,
        ]));
        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
        return "$header.$payload.$signature";
    }

    public static function verifyToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $payload, $signature] = $parts;
        $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

        if (!hash_equals($expectedSig, $signature)) return null;

        $data = json_decode(base64_decode($payload), true);

        if (!$data || $data['exp'] < time()) return null;

        return $data;
    }

    public static function requireRole(string $role): void {
        $user = self::handle();
        if ($user['role'] !== $role) {
            Response::error('Недостаточно прав', 403);
        }
    }
}