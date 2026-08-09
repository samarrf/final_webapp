<?php

require_once __DIR__ . '/../../config/api_bootstrap.php';

if (empty($_SESSION['user_id'])) {
    send_json(['error' => 'Not authenticated'], 401);
}

send_json([
    'id' => $_SESSION['user_id'],
    'name' => $_SESSION['name'] ?? null,
    'role' => $_SESSION['role'],
]);
