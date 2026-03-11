<?php
class MailService {

    private static function read($socket): string {
        $result = '';
        while ($line = fgets($socket, 1024)) {
            $result .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        return $result;
    }

    private static function cmd($socket, string $cmd): string {
        fwrite($socket, $cmd . "\r\n");
        return self::read($socket);
    }

    public static function send(string $to, string $subject, string $body, string $host = '', int $port = 0, string $user = '', string $pass = '', string $from = '', string $fromName = ''): bool {
        if (!$host)     $host     = SMTP_HOST;
        if (!$port)     $port     = SMTP_PORT;
        if (!$user)     $user     = SMTP_USER;
        if (!$pass)     $pass     = SMTP_PASS;
        if (!$from)     $from     = SMTP_FROM;
        if (!$fromName) $fromName = SMTP_FROM_NAME;

        // Порт 465 — SSL, порт 587 — STARTTLS, остальное — plain
        if ($port == 465) {
            $socket = @fsockopen('ssl://' . $host, $port, $errno, $errstr, 10);
        } else {
            $socket = @fsockopen($host, $port, $errno, $errstr, 10);
        }
        if (!$socket) return false;

        stream_set_timeout($socket, 10);
        self::read($socket);
        self::cmd($socket, "EHLO " . gethostname());

        // STARTTLS для порта 587
        if ($port == 587) {
            $resp = self::cmd($socket, "STARTTLS");
            if (strpos($resp, '220') === false) {
                fclose($socket);
                return false;
            }
            usleep(100000);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                fclose($socket);
                return false;
            }
            self::cmd($socket, "EHLO " . gethostname());
        }

        self::cmd($socket, "AUTH LOGIN");
        self::cmd($socket, base64_encode($user));
        $authResp = self::cmd($socket, base64_encode($pass));

        if (strpos($authResp, '235') === false) {
            fclose($socket);
            return false;
        }

        self::cmd($socket, "MAIL FROM:<{$from}>");
        self::cmd($socket, "RCPT TO:<{$to}>");
        self::cmd($socket, "DATA");

        $headers  = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>\r\n";
        $headers .= "To: {$to}\r\n";
        $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "Content-Transfer-Encoding: base64\r\n";
        $headers .= "\r\n";
        $headers .= chunk_split(base64_encode($body));
        $headers .= "\r\n";

        self::cmd($socket, $headers . ".");
        self::cmd($socket, "QUIT");
        fclose($socket);

        return true;
    }

    public static function sendVerification(string $to, string $name, string $token, string $host = '', int $port = 0, string $user = '', string $pass = '', string $from = '', string $fromName = ''): bool {
        $url = APP_URL . '/#/verify-email?token=' . $token;
        $subject = 'Подтвердите ваш email — Я СММ-щик';
        $year = date('Y');
        $body = '<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение email</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(51,63,100,0.10);">

          <!-- Шапка с логотипом -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#333f64,#4a5580);padding:32px 40px 28px;">
              <img src="https://app.ya-smm.ru/images/logo-white-red.webp" alt="Я СММ-щик" width="48" height="48" style="display:block;margin:0 auto 12px;border-radius:10px;">
              <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Я СММ-щик</span>
            </td>
          </tr>

          <!-- Основной контент -->
          <tr>
            <td align="center" style="padding:50px 48px 36px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#333f64;text-align:center;">Подтвердите ваш email</h1>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#475569;text-align:center;">
                Привет, <strong style="color:#333f64;">' . htmlspecialchars($name) . '</strong>!
              </p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#64748b;text-align:center;">
                Вы успешно зарегистрировались в сервисе <strong>Я СММ-щик</strong> —<br>
                платформе для управления публикациями в социальных сетях.<br>
                Осталось один шаг: подтвердите ваш адрес электронной почты.
              </p>

              <!-- Кнопка -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px;">
                <tr>
                  <td align="center" style="border-radius:5px;background:linear-gradient(135deg,#333f64,#4a5580);">
                    <a href="' . $url . '" target="_blank"
                       style="display:inline-block;padding:16px 48px;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:1.5px;border-radius:5px;">
                      Подтвердить email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;">
                Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:
              </p>
              <p style="margin:0;font-size:12px;color:#6366f1;text-align:center;word-break:break-all;">
                <a href="' . $url . '" style="color:#6366f1;">' . $url . '</a>
              </p>
            </td>
          </tr>

          <!-- Разделитель -->
          <tr>
            <td style="padding:0 48px;"><hr style="border:none;border-top:1px solid #e7eaf3;margin:0;"></td>
          </tr>

          <!-- Футер -->
          <tr>
            <td align="center" style="padding:24px 48px 32px;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">
                Ссылка действительна в течение <strong>24 часов</strong>.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">
                Если вы не регистрировались — просто проигнорируйте это письмо.
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#cbd5e1;text-align:center;">
                © ' . $year . ' Я СММ-щик · <a href="https://ya-smm.ru" style="color:#cbd5e1;text-decoration:none;">ya-smm.ru</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
        return self::send($to, $subject, $body, $host, $port, $user, $pass, $from, $fromName);
    }
}