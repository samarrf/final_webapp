<?php

require_once __DIR__ . '/../config/api_bootstrap.php';
require_once __DIR__ . '/../config/database.php';

$user = require_auth('landlord');
$landlord_id = $user['id'];

$pdo = get_db_connection();

$sql = "
    SELECT
        rp.payment_id,
        CONCAT(t.first_name, ' ', t.last_name) AS tenant,
        CONCAT(p.street_address, ', ', u.unit_label) AS unit,
        rp.amount_due AS amount,
        rp.due_date,
        rp.status
    FROM rent_payments rp
    JOIN leases l ON rp.lease_id = l.lease_id
    JOIN units u ON l.unit_id = u.unit_id
    JOIN properties p ON u.property_id = p.property_id
    JOIN tenants t ON l.tenant_id = t.tenant_id
    WHERE p.landlord_id = :landlord_id
    ORDER BY rp.due_date DESC, rp.status
";

$stmt = $pdo->prepare($sql);
$stmt->execute(['landlord_id' => $landlord_id]);
$ledger = $stmt->fetchAll();

foreach ($ledger as &$row) {
    $row['payment_id'] = (int) $row['payment_id'];
    $row['amount'] = (float) $row['amount'];
}

send_json($ledger);
