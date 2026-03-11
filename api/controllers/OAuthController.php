<?php
require_once __DIR__ . '/../services/OAuthService.php';

class OAuthController {

    private OAuthService $oauth;
    private $db;

    public function __construct($db) {
        $this->db    = $db;
        $this->oauth = new OAuthService();
    }

    public function redirect(string $provider): void {
        $allowed = ['yandex', 'vk', 'google'];
        if (!in_array($provider, $allowed)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Неизвестный провайдер']);
            return;
        }

        $mode   = isset($_GET['mode']) && $_GET['mode'] === 'register' ? 'register' : 'login';
        $userId = null;

        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token      = null;

        if (preg_match('/Bearer\s+(.+)/i', $authHeader, $m)) {
            $token = $m[1];
        }

        if (!$token && !empty($_GET['token'])) {
            $token = $_GET['token'];
        }

        if ($token) {
            try {
                require_once __DIR__ . '/../middleware/AuthMiddleware.php';
                $payload = AuthMiddleware::verifyToken($token);
                if ($payload && isset($payload['user_id'])) {
                    $mode   = 'link';
                    $userId = $payload['user_id'];
                }
            } catch (Exception $e) {}
        }

        $codeChallenge = '';
        $codeVerifier  = $_GET['cv'] ?? '';
        if ($provider === 'vk' && $codeVerifier) {
            $hash          = hash('sha256', $codeVerifier, true);
            $codeChallenge = rtrim(strtr(base64_encode($hash), '+/', '-_'), '=');
        }

        $state = base64_encode(json_encode([
            'mode'          => $mode,
            'user_id'       => $userId,
            'ts'            => time(),
            'code_verifier' => $codeVerifier,
        ]));

        $url = $this->oauth->getAuthUrl($provider, $state, $codeChallenge);
        header('Location: ' . $url);
        exit;
    }

    public function callback(string $provider): void {
        $code  = $_GET['code']  ?? null;
        $state = $_GET['state'] ?? null;
        $error = $_GET['error'] ?? null;

        if ($error || !$code || !$state) {
            $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider);
            return;
        }

        $stateData = json_decode(base64_decode($state), true);
        if (!$stateData || !isset($stateData['mode'])) {
            $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider);
            return;
        }

        if (time() - ($stateData['ts'] ?? 0) > 600) {
            $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider);
            return;
        }

        $codeVerifier = $stateData['code_verifier'] ?? '';
        if ($provider === 'vk') {
            $_GET['device_id'] = $_GET['device_id'] ?? '';
        }

        try {
            $tokenData = $this->oauth->getAccessToken($provider, $code, $codeVerifier);
            $profile   = $this->oauth->getUserProfile($provider, $tokenData);
        } catch (Exception $e) {
            error_log('[OAuth callback] ' . $provider . ' error: ' . $e->getMessage());
            $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider . '&msg=' . urlencode($e->getMessage()));
            return;
        }

        $oauthField  = 'oauth_' . $provider . '_id';
        $avatarField = 'oauth_' . $provider . '_avatar';
        $oauthId     = $profile['id'];

        if ($stateData['mode'] === 'link') {
            $userId = (int)$stateData['user_id'];

            $stmt = $this->db->prepare("SELECT id FROM users WHERE {$oauthField} = ? AND id != ?");
            $stmt->execute([$oauthId, $userId]);
            if ($stmt->fetch()) {
                $this->redirectToFrontend('/#/profile?oauth=already_used&provider=' . $provider);
                return;
            }

            $nameField = 'oauth_' . $provider . '_name';
            $stmt = $this->db->prepare("UPDATE users SET {$oauthField} = ?, {$avatarField} = ?, {$nameField} = ? WHERE id = ?");
            $stmt->execute([$oauthId, $profile['avatar'] ?? null, $profile['name'] ?? null, $userId]);

            $this->redirectToFrontend('/#/profile?oauth=success&provider=' . $provider);

        } else {
            // Ищем по oauth id
            $stmt = $this->db->prepare("SELECT * FROM users WHERE {$oauthField} = ? AND is_active = 1 LIMIT 1");
            $stmt->execute([$oauthId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            // Если не найден по oauth id — ищем по email (для режима register)
            if (!$user && !empty($profile['email']) && $stateData['mode'] === 'register') {
                $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
                $stmt->execute([$profile['email']]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                // Привязываем соцсеть к найденному аккаунту
                if ($user) {
                    $nameField = 'oauth_' . $provider . '_name';
                    $stmt = $this->db->prepare("UPDATE users SET {$oauthField} = ?, {$avatarField} = ?, {$nameField} = ? WHERE id = ?");
                    $stmt->execute([$oauthId, $profile['avatar'] ?? null, $profile['name'] ?? null, $user['id']]);
                }
            }

            if (!$user) {
                if ($stateData['mode'] === 'register') {
                    // Создаём нового пользователя
                    $name     = $profile['name'] ?? $profile['email'] ?? 'Пользователь';
                    $email    = $profile['email'] ?? ($provider . '_' . $oauthId . '@oauth.local');
                    $phone    = $profile['phone'] ?? null;
                    $avatar   = $profile['avatar'] ?? null;
                    $password = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);

                    $nameField = 'oauth_' . $provider . '_name';
                    $stmt = $this->db->prepare("INSERT INTO users (name, email, phone, password, role, avatar, is_active, email_verified, {$oauthField}, {$avatarField}, {$nameField}) VALUES (?, ?, ?, ?, 'author', ?, 1, 1, ?, ?, ?)");
                    $stmt->execute([$name, $email, $phone, $password, $avatar, $oauthId, $avatar, $profile['name'] ?? null]);
                    $newId = $this->db->lastInsertId();

                    $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
                    $stmt->execute([$newId]);
                    $user = $stmt->fetch(PDO::FETCH_ASSOC);
                } else {
                    $this->redirectToFrontend('/#/login?oauth=unlinked&provider=' . $provider);
                    return;
                }
            }

            require_once __DIR__ . '/../middleware/AuthMiddleware.php';
            $token = AuthMiddleware::generateToken($user['id'], $user['role']);

            $this->redirectToFrontend('/#/dashboard?token=' . urlencode($token));
        }
    }

    private function redirectToFrontend(string $url): void {
        header('Location: ' . APP_URL . $url);
        exit;
    }
}
