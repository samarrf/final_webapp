<?php

$allowed_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'samesite' => 'Lax',
]);
session_start();

function send_json($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function require_auth(?string $role = null): array {
    if (empty($_SESSION['user_id']) || empty($_SESSION['role'])) {
        send_json(['error' => 'Not authenticated'], 401);
    }
    if ($role !== null && $_SESSION['role'] !== $role) {
        send_json(['error' => 'Forbidden for this role'], 403);
    }
    return ['id' => $_SESSION['user_id'], 'role' => $_SESSION['role']];
}
