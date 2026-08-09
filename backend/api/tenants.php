<?php

require_once __DIR__ . '/../config/api_bootstrap.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/dashboard_cache.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['error' => 'Method not allowed'], 405);
}

$user = require_auth('landlord');
$landlordId = (int) $user['id'];

$body = json_decode(file_get_contents('php://input'), true) ?? [];

$unitId = (int) ($body['unitId'] ?? 0);
$firstName = trim($body['firstName'] ?? '');
$lastName = trim($body['lastName'] ?? '');
$email = trim($body['email'] ?? '');
$phone = trim($body['phone'] ?? '');
$password = $body['password'] ?? '';
$startDate = $body['startDate'] ?? '';
$endDate = $body['endDate'] ?? '';
$monthlyRent = (float) ($body['monthlyRent'] ?? 0);

if (
    $unitId <= 0 ||
    $firstName === '' ||
    $lastName === '' ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($password) < 8 ||
    $startDate === '' ||
    $endDate === '' ||
    $monthlyRent <= 0
) {
    send_json(['error' => 'Complete all required tenant and lease fields'], 400);
}

if ($endDate <= $startDate) {
    send_json(['error' => 'Lease end date must be after the start date'], 400);
}

$pdo = get_db_connection();

try {
    $pdo->beginTransaction();

    $unitStmt = $pdo->prepare("
        SELECT u.unit_id, u.status
        FROM units u
        JOIN properties p ON u.property_id = p.property_id
        WHERE u.unit_id = :unit_id
          AND p.landlord_id = :landlord_id
        FOR UPDATE
    ");

    $unitStmt->execute([
        'unit_id' => $unitId,
        'landlord_id' => $landlordId,
    ]);

    $unit = $unitStmt->fetch();

    if (!$unit) {
        $pdo->rollBack();
        send_json(['error' => 'Unit not found'], 404);
    }

    if ($unit['status'] !== 'vacant') {
        $pdo->rollBack();
        send_json(['error' => 'This unit is already occupied'], 409);
    }

    $emailStmt = $pdo->prepare("
        SELECT tenant_id
        FROM tenants
        WHERE email = :email
        LIMIT 1
    ");

    $emailStmt->execute(['email' => $email]);

    if ($emailStmt->fetch()) {
        $pdo->rollBack();
        send_json(['error' => 'A tenant with this email already exists'], 409);
    }

    $tenantStmt = $pdo->prepare("
        INSERT INTO tenants (
            first_name,
            last_name,
            email,
            password_hash,
            phone
        )
        VALUES (
            :first_name,
            :last_name,
            :email,
            :password_hash,
            :phone
        )
    ");

    $tenantStmt->execute([
        'first_name' => $firstName,
        'last_name' => $lastName,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'phone' => $phone !== '' ? $phone : null,
    ]);

    $tenantId = (int) $pdo->lastInsertId();

    $leaseStmt = $pdo->prepare("
        INSERT INTO leases (
            unit_id,
            tenant_id,
            start_date,
            end_date,
            monthly_rent,
            active
        )
        VALUES (
            :unit_id,
            :tenant_id,
            :start_date,
            :end_date,
            :monthly_rent,
            TRUE
        )
    ");

    $leaseStmt->execute([
        'unit_id' => $unitId,
        'tenant_id' => $tenantId,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'monthly_rent' => $monthlyRent,
    ]);

    $leaseId = (int) $pdo->lastInsertId();

    $unitUpdate = $pdo->prepare("
        UPDATE units
        SET status = 'occupied',
            monthly_rent = :monthly_rent
        WHERE unit_id = :unit_id
    ");

    $unitUpdate->execute([
        'monthly_rent' => $monthlyRent,
        'unit_id' => $unitId,
    ]);

    $paymentStmt = $pdo->prepare("
        INSERT INTO rent_payments (
            lease_id,
            amount_due,
            due_date,
            status
        )
        VALUES (
            :lease_id,
            :amount_due,
            :due_date,
            'due'
        )
    ");

    $paymentStmt->execute([
        'lease_id' => $leaseId,
        'amount_due' => $monthlyRent,
        'due_date' => $startDate,
    ]);

    $pdo->commit();

    invalidate_dashboard_cache($landlordId);

    send_json([
        'message' => 'Tenant and lease created successfully',
        'tenantId' => $tenantId,
        'leaseId' => $leaseId,
    ], 201);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Create tenant error: ' . $e->getMessage());

    send_json([
        'error' => 'Could not create the tenant',
    ], 500);
}