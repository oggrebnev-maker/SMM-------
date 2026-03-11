<?php
class Validator {
    private array $errors = [];

    public function required(string $field, $value): self {
        if (empty($value) && $value !== '0') {
            $this->errors[$field] = 'Поле обязательно для заполнения';
        }
        return $this;
    }

    public function email(string $field, $value): self {
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = 'Некорректный email';
        }
        return $this;
    }

    public function minLength(string $field, $value, int $min): self {
        if (!empty($value) && mb_strlen($value) < $min) {
            $this->errors[$field] = "Минимальная длина: $min символов";
        }
        return $this;
    }

    public function maxLength(string $field, $value, int $max): self {
        if (!empty($value) && mb_strlen($value) > $max) {
            $this->errors[$field] = "Максимальная длина: $max символов";
        }
        return $this;
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }
}
