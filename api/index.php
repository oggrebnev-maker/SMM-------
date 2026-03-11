<?php
require_once __DIR__ . "/config/cors.php";
require_once __DIR__ . "/config/config.php";
require_once __DIR__ . "/config/database.php";
require_once __DIR__ . "/helpers/Response.php";
require_once __DIR__ . "/controllers/AuthController.php";
require_once __DIR__ . "/controllers/ProfileController.php";
require_once __DIR__ . "/controllers/OAuthController.php";
require_once __DIR__ . "/controllers/SystemSettingsController.php";
require_once __DIR__ . "/controllers/SocialAccountController.php";
require_once __DIR__ . "/controllers/ProjectController.php";
require_once __DIR__ . "/controllers/ProjectChannelController.php";
require_once __DIR__ . "/controllers/PublishScheduleController.php";

$method = $_SERVER["REQUEST_METHOD"];
$uri = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$uri = rtrim($uri, "/");
$uri = preg_replace("#^/api#", "", $uri);

$uriParts = explode('/', trim($uri, '/'));

try {
    $db = Database::getInstance()->getConnection();

    match(true) {
        // Auth
        $method === "POST" && $uri === "/auth/login"               => (new AuthController())->login(),
        $method === "POST" && $uri === "/auth/logout"              => (new AuthController())->logout(),
        $method === "GET"  && $uri === "/auth/me"                  => (new AuthController())->me(),
        $method === "POST" && $uri === "/auth/register"            => (new AuthController())->register(),
        $method === "POST" && $uri === "/auth/verify-email"        => (new AuthController())->verifyEmail(),
        $method === "POST" && $uri === "/auth/resend-verification" => (new AuthController())->resendVerification(),

        // OAuth redirect
        $method === "GET" && preg_match('#^/auth/oauth/(yandex|vk|google)$#', $uri, $m)
            => (new OAuthController($db))->redirect($m[1]),

        // OAuth callback
        $method === "GET" && preg_match('#^/auth/callback/(yandex|vk|google)$#', $uri, $m)
            => (new OAuthController($db))->callback($m[1]),

        // Profile
        $method === "GET"    && $uri === "/profile"                => (new ProfileController())->get(),
        $method === "PUT"    && $uri === "/profile"                => (new ProfileController())->update(),
        $method === "PUT"    && $uri === "/profile/password"       => (new ProfileController())->changePassword(),
        $method === "POST"   && $uri === "/profile/avatar"         => (new ProfileController())->uploadAvatar(),
        $method === "DELETE" && $uri === "/profile/avatar"         => (new ProfileController())->deleteAvatar(),
        $method === "DELETE" && preg_match('#^/profile/social/(yandex|vk|google)$#', $uri, $m)
            => (new ProfileController())->unlinkSocial($m[1]),

        // System settings
        $method === "GET"  && $uri === "/system-settings/public"   => (new SystemSettingsController())->getPublicSettings(),
        $method === "GET"  && $uri === "/system-settings"          => (new SystemSettingsController())->getSettings(),
        $method === "PUT"  && $uri === "/system-settings"          => (new SystemSettingsController())->updateSettings(),
        $method === "POST" && $uri === "/system-settings/test-email" => (new SystemSettingsController())->sendTestEmail(),
        $method === "POST" && $uri === "/system-settings/favicon"  => (new SystemSettingsController())->uploadFavicon(),
        $method === "GET"  && $uri === "/system-settings/users"    => (new SystemSettingsController())->getUsers(),
        $method === "PUT"  && preg_match('#^/system-settings/users/(\d+)$#', $uri, $m)
            => (new SystemSettingsController())->updateUser($m[1]),


        // Social platforms (admin)
        $method === "GET"    && $uri === "/system-settings/platforms"         => (new SystemSettingsController())->getPlatforms(),
        $method === "POST"   && $uri === "/system-settings/platforms"         => (new SystemSettingsController())->createPlatform(),
        $method === "PUT"    && preg_match('#^/system-settings/platforms/(\\d+)$#', $uri, $m)
            => (new SystemSettingsController())->updatePlatform($m[1]),
        $method === "DELETE" && preg_match('#^/system-settings/platforms/(\\d+)$#', $uri, $m)
            => (new SystemSettingsController())->deletePlatform($m[1]),
        $method === "POST"   && preg_match('#^/system-settings/platforms/(\\d+)/icon$#', $uri, $m)
            => (new SystemSettingsController())->uploadPlatformIcon($m[1]),


        // Social accounts
        $method === "GET"    && $uri === "/social-accounts"                    => (new SocialAccountController())->getAll(),
        $method === "GET"    && $uri === "/social-accounts/platforms"          => (new SocialAccountController())->getPlatforms(),
        $method === "POST"   && $uri === "/social-accounts"                    => (new SocialAccountController())->create(),
        $method === "GET"    && preg_match('#^/social-accounts/(\\d+)$#', $uri, $m) => (new SocialAccountController())->getOne($m[1]),
        $method === "PUT"    && preg_match('#^/social-accounts/(\\d+)$#', $uri, $m) => (new SocialAccountController())->update($m[1]),
        $method === "DELETE" && preg_match('#^/social-accounts/(\\d+)$#', $uri, $m) => (new SocialAccountController())->delete($m[1]),

        // Projects
        $method === "GET"    && $uri === "/projects"                              => (new ProjectController())->getAll(),
        $method === "POST"   && $uri === "/projects"                              => (new ProjectController())->create(),
        $method === "GET"    && preg_match('#^/projects/(\d+)$#', $uri, $m)     => (new ProjectController())->getOne((int)$m[1]),
        $method === "PUT"    && preg_match('#^/projects/(\d+)$#', $uri, $m)     => (new ProjectController())->update((int)$m[1]),
        $method === "DELETE" && preg_match('#^/projects/(\d+)$#', $uri, $m)     => (new ProjectController())->delete((int)$m[1]),
        $method === "POST"   && preg_match('#^/projects/(\d+)/logo$#', $uri, $m)  => (new ProjectController())->uploadLogo((int)$m[1]),
        $method === "DELETE" && preg_match('#^/projects/(\d+)/logo$#', $uri, $m)  => (new ProjectController())->deleteLogo((int)$m[1]),
        $method === "GET"    && preg_match('#^/projects/(\d+)/channels$#', $uri, $m)          => (new ProjectChannelController())->getAll((int)$m[1]),
        $method === "POST"   && preg_match('#^/projects/(\d+)/channels$#', $uri, $m)          => (new ProjectChannelController())->create((int)$m[1]),
        $method === "DELETE" && preg_match('#^/projects/(\d+)/channels/(\d+)$#', $uri, $m)   => (new ProjectChannelController())->delete((int)$m[1], (int)$m[2]),

        // Publish schedules
        $method === "GET"    && preg_match('#^/projects/(\d+)/publish-schedules$#', $uri, $m)        => (new PublishScheduleController())->getAll((int)$m[1]),
        $method === "POST"   && preg_match('#^/projects/(\d+)/publish-schedules$#', $uri, $m)        => (new PublishScheduleController())->create((int)$m[1]),
        $method === "DELETE" && preg_match('#^/projects/(\d+)/publish-schedules/(\d+)$#', $uri, $m) => (new PublishScheduleController())->delete((int)$m[1], (int)$m[2]),
        $method === "DELETE" && preg_match('#^/projects/(\d+)/publish-schedules$#', $uri, $m)        => (new PublishScheduleController())->clear((int)$m[1]),

        default => Response::notFound("Маршрут не найден: $method $uri")
    };
} catch (Throwable $e) {
    $message = defined("APP_ENV") && APP_ENV === "development"
        ? $e->getMessage()
        : "Внутренняя ошибка сервера";
    Response::error($message, 500);
}
