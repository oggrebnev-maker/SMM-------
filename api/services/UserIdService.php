<?php

require_once __DIR__ . '/../config/database.php';

class UserIdService {
    private PDO $db;

    public function __construct(?PDO $db = null) {
        $this->db = $db ?: Database::getInstance()->getConnection();
    }

    /**
     * Генерирует новый display_id для указанного года регистрации.
     * Формат: YYSSSS, где YY — две последние цифры года, SSSS — счётчик с ведущими нулями.
     */
    public function generateForYear(int $year): string {
        if ($year < 1970 || $year > 9999) {
            $year = (int)date('Y');
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare('SELECT last_serial FROM user_id_counters WHERE year = :year FOR UPDATE');
            $stmt->execute(['year' => $year]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                $serial = (int)$row['last_serial'] + 1;
                $upd = $this->db->prepare('UPDATE user_id_counters SET last_serial = :serial WHERE year = :year');
                $upd->execute(['serial' => $serial, 'year' => $year]);
            } else {
                $serial = 1;
                $ins = $this->db->prepare('INSERT INTO user_id_counters (year, last_serial) VALUES (:year, :serial)');
                $ins->execute(['year' => $year, 'serial' => $serial]);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        $yy = $year % 100;
        return sprintf('%02d%04d', $yy, $serial);
    }
}

