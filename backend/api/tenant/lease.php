<?php

require_once __DIR__ . '/../../config/api_bootstrap.php';
require_once __DIR__ . '/../../config/database.php';

$user = require_auth('tenant');
$tenant_id = $user['id'];

$pdo = get_db_connection();

$sql = "
    SELECT
        l.lease_id,
        l.end_date AS lease_end,
        l.monthly_rent,
        CONCAT(p.street_address, ', ', u.unit_label) AS unit,
        CONCAT(t.first_name, ' ', t.last_name) AS tenant_name
    FROM leases l
    JOIN units u ON l.unit_id = u.unit_id
    JOIN properties p ON u.property_id = p.property_id
    JOIN tenants t ON l.tenant_id = t.tenant_id
    WHERE l.tenant_id = :tenant_id AND l.active = TRUE
    LIMIT 1
";
$stmt = $pdo->prepare($sql);
$stmt->execute(['tenant_id' => $tenant_id]);
$lease = $stmt->fetch();

if (!$lease) {
    send_json(['error' => 'No active lease found for this tenant'], 404);
}

$paymentStmt = $pdo->prepare("
    SELECT amount_due, due_date, status
    FROM rent_payments
    WHERE lease_id = :lease_id
    ORDER BY
        CASE WHEN status IN ('due', 'overdue') THEN 0 ELSE 1 END,
        CASE WHEN status IN ('due', 'overdue') THEN due_date END ASC,
        due_date DESC
    LIMIT 1
");
$paymentStmt->execute(['lease_id' => $lease['lease_id']]);
$payment = $paymentStmt->fetch();

send_json([
    'tenantName' => $lease['tenant_name'],
    'unit' => $lease['unit'],
    'leaseEnd' => $lease['lease_end'],
    'rent' => (float) $lease['monthly_rent'],
    'currentPayment' => $payment ? [
        'amount' => (float) $payment['amount_due'],
        'dueDate' => $payment['due_date'],
        'status' => $payment['status'],
    ] : null,
]);
