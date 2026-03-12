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
                    $userId = (int) $payload['user_id'];
                    $stmt   = $this->db->prepare("SELECT id FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
                    $stmt->execute([$userId]);
                    if ($stmt->fetch()) {
                        $mode = 'link';
                    } else {
                        $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider . '&msg=' . urlencode('Сессия недействительна. Выйдите и войдите снова, затем нажмите «Привязать».'));
                        return;
                    }
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

        $state = str_replace(' ', '+', $state);
        $stateDecoded = base64_decode($state, true);
        $stateData = $stateDecoded !== false ? json_decode($stateDecoded, true) : null;
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
            $tokenData = $this->oauth->getAccessToken($provider, $code, $codeVerifier, $state);
            $profile   = $this->oauth->getUserProfile($provider, $tokenData);
        } catch (Throwable $e) {
            error_log('[OAuth callback] ' . $provider . ' error: ' . $e->getMessage());
            $msg = $e->getMessage();
            $this->redirectToFrontend('/#/login?oauth=error&provider=' . $provider . '&msg=' . urlencode($msg));
            return;
        }

        $oauthField  = 'oauth_' . $provider . '_id';
        $avatarField = 'oauth_' . $provider . '_avatar';
        $oauthId     = $profile['id'];

        if ($stateData['mode'] === 'link') {
            $userId = isset($stateData['user_id']) ? (int)$stateData['user_id'] : 0;
            if ($userId <= 0) {
                error_log('[OAuth callback] link mode but user_id missing or invalid in state');
                $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider . '&msg=' . urlencode('Сессия истекла. Войдите снова и нажмите «Привязать».'));
                return;
            }

            try {
                $stmt = $this->db->prepare("SELECT id FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
                $stmt->execute([$userId]);
                if (!$stmt->fetch()) {
                    error_log('[OAuth callback] link: user not found or inactive, user_id=' . $userId);
                    $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider . '&msg=' . urlencode('Пользователь не найден. Войдите снова и попробуйте привязать.'));
                    return;
                }

                $stmt = $this->db->prepare("SELECT id FROM users WHERE {$oauthField} = ? AND id != ?");
                $stmt->execute([$oauthId, $userId]);
                if ($stmt->fetch()) {
                    $this->redirectToFrontend('/#/profile?oauth=already_used&provider=' . $provider);
                    return;
                }

                $nameField = 'oauth_' . $provider . '_name';
                $stmt = $this->db->prepare("UPDATE users SET {$oauthField} = ?, {$avatarField} = ?, {$nameField} = ? WHERE id = ?");
                $stmt->execute([$oauthId, $profile['avatar'] ?? null, $profile['name'] ?? null, $userId]);
                if ($stmt->rowCount() === 0) {
                    $stmt = $this->db->prepare("SELECT id FROM users WHERE id = ? AND {$oauthField} = ? LIMIT 1");
                    $stmt->execute([$userId, $oauthId]);
                    if (!$stmt->fetch()) {
                        error_log('[OAuth callback] link: UPDATE affected 0 rows for user_id=' . $userId . ', oauth_id=' . $oauthId);
                        $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider . '&msg=' . urlencode('Не удалось сохранить привязку. Попробуйте снова.'));
                        return;
                    }
                }

                if (!empty($profile['phone'])) {
                    $stmt = $this->db->prepare("UPDATE users SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = '')");
                    $stmt->execute([$profile['phone'], $userId]);
                }

                $profileName = trim($profile['name'] ?? '');
                if ($profileName !== '' && $profileName !== 'Пользователь VK') {
                    $stmt = $this->db->prepare("SELECT name FROM users WHERE id = ? LIMIT 1");
                    $stmt->execute([$userId]);
                    $currentName = trim($stmt->fetchColumn() ?: '');
                    $currentLooksLikeLogin = $currentName === '' || strpos($currentName, ' ') === false;
                    $profileLooksLikeName = strpos($profileName, ' ') !== false || preg_match('/[а-яА-ЯёЁ]/u', $profileName);
                    if ($profileLooksLikeName && $currentLooksLikeLogin) {
                        $stmt = $this->db->prepare("UPDATE users SET name = ? WHERE id = ?");
                        $stmt->execute([$profileName, $userId]);
                    }
                }
            } catch (Throwable $e) {
                error_log('[OAuth callback] link DB error: ' . $e->getMessage());
                $this->redirectToFrontend('/#/profile?oauth=error&provider=' . $provider . '&msg=' . urlencode('Ошибка сохранения. Проверьте структуру БД (колонки oauth_*).'));
                return;
            }

            $this->redirectToFrontend('/#/profile?oauth=success&provider=' . $provider);

        } else {
            // Ищем по oauth id
            $stmt = $this->db->prepare("SELECT * FROM users WHERE {$oauthField} = ? AND is_active = 1 LIMIT 1");
            $stmt->execute([$oauthId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            // Если не найден по oauth id — ищем по email и привязываем соцсеть (и при входе, и при регистрации)
            if (!$user && !empty($profile['email'])) {
                $email = is_string($profile['email']) ? strtolower(trim($profile['email'])) : '';
                if ($email !== '') {
                    $stmt = $this->db->prepare("SELECT * FROM users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1");
                    $stmt->execute([$email]);
                    $user = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($user) {
                        $nameField = 'oauth_' . $provider . '_name';
                        $stmt = $this->db->prepare("UPDATE users SET {$oauthField} = ?, {$avatarField} = ?, {$nameField} = ? WHERE id = ?");
                        $stmt->execute([$oauthId, $profile['avatar'] ?? null, $profile['name'] ?? null, $user['id']]);
                    }
                }
            }

            if (!$user) {
                // Первый вход через соцсеть: создаём пользователя (и при «вход», и при «регистрации»)
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
            }

            // Если из соцсети пришёл телефон, а в профиле он пустой — подставляем
            if (!empty($profile['phone']) && empty($user['phone'])) {
                $stmt = $this->db->prepare("UPDATE users SET phone = ? WHERE id = ?");
                $stmt->execute([$profile['phone'], $user['id']]);
                $user['phone'] = $profile['phone'];
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
