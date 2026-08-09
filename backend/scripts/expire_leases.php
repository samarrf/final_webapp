<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/dashboard_cache.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('This script is CLI-only.');
}

$pdo = get_db_connection();

$selectStmt = $pdo->prepare("
    SELECT
        l.lease_id,
        l.unit_id,
        p.landlord_id
    FROM leases l
    JOIN units u ON l.unit_id = u.unit_id
    JOIN properties p ON u.property_id = p.property_id
    WHERE l.active = TRUE
      AND l.end_date < CURDATE()
    FOR UPDATE
");

$deactivateLeaseStmt = $pdo->prepare("
    UPDATE leases
    SET active = FALSE
    WHERE lease_id = :lease_id
");

$vacateUnitStmt = $pdo->prepare("
    UPDATE units
    SET status = 'vacant'
    WHERE unit_id = :unit_id
");

$expiredCount = 0;
$affectedLandlordIds = [];

try {
    $pdo->beginTransaction();

    $selectStmt->execute();
    $expiredLeases = $selectStmt->fetchAll();

    foreach ($expiredLeases as $lease) {
        $deactivateLeaseStmt->execute(['lease_id' => $lease['lease_id']]);
        $vacateUnitStmt->execute(['unit_id' => $lease['unit_id']]);

        $affectedLandlordIds[(int) $lease['landlord_id']] = true;
        $expiredCount++;
    }

    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('expire_leases error: ' . $e->getMessage());
    fwrite(STDERR, 'expire_leases failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

foreach (array_keys($affectedLandlordIds) as $landlordId) {
    invalidate_dashboard_cache($landlordId);
}

echo "Expired {$expiredCount} lease(s) across " . count($affectedLandlordIds) . " landlord(s).\n";