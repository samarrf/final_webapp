<?php


require_once __DIR__ . '/../../config/api_bootstrap.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['error' => 'Method not allowed'], 405);
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';
$role = $body['role'] ?? '';

if ($email === '' || $password === '' || !in_array($role, ['landlord', 'tenant'], true)) {
    send_json(['error' => 'email, password, and a valid role are required'], 400);
}

$pdo = get_db_connection();

if ($role === 'landlord') {
    $stmt = $pdo->prepare('SELECT landlord_id AS id, first_name, last_name, email, password_hash FROM landlords WHERE email = :email');
} else {
    $stmt = $pdo->prepare('SELECT tenant_id AS id, first_name, last_name, email, password_hash FROM tenants WHERE email = :email');
}
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    send_json(['error' => 'Invalid email or password'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['role'] = $role;
$_SESSION['name'] = $user['first_name'] . ' ' . $user['last_name'];

send_json([
    'id' => (int) $user['id'],
    'name' => $_SESSION['name'],
    'email' => $user['email'],
    'role' => $role,
]);
