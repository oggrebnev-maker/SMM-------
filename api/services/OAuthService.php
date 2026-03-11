<?php
class OAuthService {

    private array $config = [
        'yandex' => [
            'auth_url'      => 'https://oauth.yandex.ru/authorize',
            'token_url'     => 'https://oauth.yandex.ru/token',
            'user_url'      => 'https://login.yandex.ru/info?format=json&fields=id,login,display_name,real_name,first_name,last_name,sex,default_email,default_avatar_id,default_phone',
            'client_id'     => OAUTH_YANDEX_CLIENT_ID,
            'client_secret' => OAUTH_YANDEX_CLIENT_SECRET,
            'scope'         => 'login:email login:info login:avatar',
        ],
        'vk' => [
            'auth_url'      => 'https://id.vk.com/authorize',
            'token_url'     => 'https://id.vk.com/oauth2/auth',
            'user_url'      => 'https://id.vk.com/oauth2/user_info',
            'client_id'     => OAUTH_VK_CLIENT_ID,
            'client_secret' => OAUTH_VK_CLIENT_SECRET,
            'scope'         => 'vkid.personal_info email',
        ],
        'google' => [
            'auth_url'      => 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url'     => 'https://oauth2.googleapis.com/token',
            'user_url'      => 'https://www.googleapis.com/oauth2/v3/userinfo',
            'client_id'     => OAUTH_GOOGLE_CLIENT_ID,
            'client_secret' => OAUTH_GOOGLE_CLIENT_SECRET,
            'scope'         => 'openid email profile',
        ],
    ];

    public function getAuthUrl(string $provider, string $state, string $codeChallenge = ''): string {
        $cfg = $this->getConfig($provider);
        $params = [
            'client_id'     => $cfg['client_id'],
            'redirect_uri'  => APP_URL . '/api/auth/callback/' . $provider,
            'response_type' => 'code',
            'scope'         => $cfg['scope'],
            'state'         => $state,
        ];
        if ($provider === 'google') {
            $params['access_type'] = 'online';
            $params['prompt'] = 'select_account';
        }
        if ($provider === 'yandex') {
            $params['force_confirm'] = 'yes';
        }
        if ($provider === 'vk' && $codeChallenge) {
            $params['code_challenge']        = $codeChallenge;
            $params['code_challenge_method'] = 'S256';
        }
        return $cfg['auth_url'] . '?' . http_build_query($params);
    }

    public function getAccessToken(string $provider, string $code, string $codeVerifier = ''): array {
        $cfg = $this->getConfig($provider);
        $params = [
            'client_id'     => $cfg['client_id'],
            'client_secret' => $cfg['client_secret'],
            'redirect_uri'  => APP_URL . '/api/auth/callback/' . $provider,
            'code'          => $code,
            'grant_type'    => 'authorization_code',
        ];
        if ($provider === 'vk' && $codeVerifier) {
            $params['code_verifier'] = $codeVerifier;
            $params['device_id']     = $_GET['device_id'] ?? '';
        }
        $response = $this->httpPost($cfg['token_url'], $params);
        if ($provider === 'vk') {
            if (!isset($response['access_token'])) {
                throw new Exception('Не удалось получить access_token от VK: ' . json_encode($response));
            }
        } else {
            if (!isset($response['access_token'])) {
                throw new Exception('Не удалось получить access_token от ' . $provider);
            }
        }
        return $response;
    }

    public function getUserProfile(string $provider, array $tokenData): array {
        $token = $tokenData['access_token'];
        $cfg   = $this->getConfig($provider);

        if ($provider === 'yandex') {
            $data = $this->httpGet($cfg['user_url'], [], $token);
            return [
                'id'     => (string)($data['id'] ?? ''),
                'name'   => $data['login'] ?? trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')),
                'email'  => $data['default_email'] ?? null,
                'avatar' => isset($data['default_avatar_id'])
                    ? 'https://avatars.yandex.net/get-yapic/' . $data['default_avatar_id'] . '/islands-200'
                    : null,
                'phone'  => $data['default_phone']['number'] ?? null,
            ];
        }

        if ($provider === 'vk') {
            $data = $this->httpPost($cfg['user_url'], [
                'client_id' => OAUTH_VK_CLIENT_ID,
                'access_token' => $token,
            ]);
            $user = $data['user'] ?? [];
            return [
                'id'     => (string)($user['user_id'] ?? ''),
                'name'   => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
                'email'  => $user['email'] ?? $tokenData['email'] ?? null,
                'avatar' => $user['avatar'] ?? null,
                'phone'  => $user['phone'] ?? null,
            ];
        }

        if ($provider === 'google') {
            $data = $this->httpGet($cfg['user_url'], [], $token);
            return [
                'id'     => (string)($data['sub'] ?? ''),
                'name'   => $data['name'] ?? null,
                'email'  => $data['email'] ?? null,
                'avatar' => $data['picture'] ?? null,
                'phone'  => null,
            ];
        }

        throw new Exception('Неизвестный провайдер: ' . $provider);
    }

    private function getConfig(string $provider): array {
        if (!isset($this->config[$provider])) {
            throw new Exception('Неизвестный провайдер: ' . $provider);
        }
        return $this->config[$provider];
    }

    private function httpPost(string $url, array $params): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($params),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT        => 15,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        return json_decode($body, true) ?? [];
    }

    private function httpGet(string $url, array $params = [], ?string $token = null): array {
        if ($params) {
            $url .= '?' . http_build_query($params);
        }
        $headers = ['Accept: application/json'];
        if ($token) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $body = curl_exec($ch);
        curl_close($ch);
        return json_decode($body, true) ?? [];
    }
}
