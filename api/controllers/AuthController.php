<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/MailService.php';

class AuthController {
    private User $user;
    private $db;

    public function __construct() {
        $this->user = new User();
        $this->db = Database::getInstance()->getConnection();
    }

    private function getSmtp(): array {
        $stmt = $this->db->query("SELECT `key`, `value` FROM system_settings");
        $s = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) $s[$row['key']] = $row['value'];
        return [
            'host'     => $s['smtp_host']      ?? SMTP_HOST,
            'port'     => (int)($s['smtp_port'] ?? SMTP_PORT),
            'user'     => $s['smtp_user']      ?? SMTP_USER,
            'pass'     => $s['smtp_pass']      ?? SMTP_PASS,
            'from'     => $s['smtp_from']      ?? SMTP_FROM,
            'fromName' => $s['smtp_from_name'] ?? SMTP_FROM_NAME,
        ];
    }

    public function login(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $v = new Validator();
        $v->required('email', $data['email'] ?? '')
          ->email('email', $data['email'] ?? '')
          ->required('password', $data['password'] ?? '');
        if ($v->fails()) Response::error('Ошибка валидации', 422, $v->errors());
        $user = $this->user->findByEmail($data['email']);
        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('Неверный email или пароль', 401);
        }
        if (!$user['email_verified']) {
            Response::error('Подтвердите email перед входом. Проверьте почту.', 403);
        }
        $token = AuthMiddleware::generateToken($user['id'], $user['role']);
        unset($user['password']);
        Response::success(['token' => $token, 'user' => $user], 'Успешный вход');
    }

    public function logout(): void {
        Response::success(null, 'Вы вышли из системы');
    }

    public function me(): void {
        $user = AuthMiddleware::handle();
        Response::success($user);
    }

    public function register(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $v = new Validator();
        $v->required('name', $data['name'] ?? '')
          ->maxLength('name', $data['name'] ?? '', 100)
          ->required('email', $data['email'] ?? '')
          ->email('email', $data['email'] ?? '')
          ->maxLength('email', $data['email'] ?? '', 150)
          ->required('password', $data['password'] ?? '')
          ->minLength('password', $data['password'] ?? '', 8);
        if ($v->fails()) Response::error('Ошибка валидации', 422, $v->errors());
        if ($this->user->findByEmail($data['email'])) {
            Response::error('Пользователь с таким email уже существует', 409);
        }
        $user = $this->user->create([
            'name'     => trim($data['name']),
            'email'    => strtolower(trim($data['email'])),
            'password' => $data['password'],
            'role'     => 'author',
        ]);
        if (!$user) Response::error('Ошибка при создании пользователя', 500);
        $m = $this->getSmtp();
        MailService::sendVerification($user['email'], $user['name'], $user['email_token'], $m['host'], $m['port'], $m['user'], $m['pass'], $m['from'], $m['fromName']);
        Response::success(['email' => $user['email']], 'Аккаунт создан. Проверьте почту для подтверждения.', 201);
    }

    public function verifyEmail(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $token = trim($data['token'] ?? '');
        if (!$token) Response::error('Токен не указан', 422);
        $user = $this->user->findByEmailToken($token);
        if (!$user) Response::error('Ссылка недействительна или истекла', 400);
        $this->user->verifyEmail($user['id']);
        $jwtToken = AuthMiddleware::generateToken($user['id'], $user['role']);
        unset($user['password'], $user['email_token'], $user['email_token_expires']);
        Response::success(['token' => $jwtToken, 'user' => $user], 'Email подтверждён. Добро пожаловать!');
    }

    public function resendVerification(): void {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = strtolower(trim($data['email'] ?? ''));
        if (!$email) Response::error('Email не указан', 422);
        $user = $this->user->findByEmail($email);
        if (!$user) Response::success(null, 'Если email зарегистрирован — письмо отправлено');
        if ($user['email_verified']) Response::error('Email уже подтверждён', 400);
        $token = $this->user->refreshEmailToken($user['id']);
        $m = $this->getSmtp();
        MailService::sendVerification($user['email'], $user['name'], $token, $m['host'], $m['port'], $m['user'], $m['pass'], $m['from'], $m['fromName']);
        Response::success(null, 'Письмо отправлено повторно');
    }
}