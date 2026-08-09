<?php

require_once __DIR__ . '/../config/api_bootstrap.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/redis.php';

$user = require_auth('landlord');
$landlord_id = $user['id'];

const REMINDER_TTL_SECONDS = 300;
const REMINDER_WINDOW_DAYS = 3;

$cacheKey = "reminders:{$landlord_id}";
$redis = null;

try {
    $redis = get_redis();
    $cached = $redis->get($cacheKey);
    if ($cached !== false) {
        send_json(['reminders' => json_decode($cached, true), 'fromCache' => true]);
    }
} catch (RedisException $e) {
    $redis = null;
}

$pdo = get_db_connection();
$stmt = $pdo->prepare("
    SELECT
        CONCAT(t.first_name, ' ', t.last_name) AS tenant,
        CONCAT(p.street_address, ', ', u.unit_label) AS unit,
        rp.amount_due,
        rp.due_date,
        rp.status,
        DATEDIFF(rp.due_date, CURDATE()) AS days_until_due
    FROM rent_payments rp
    JOIN leases l ON rp.lease_id = l.lease_id
    JOIN units u ON l.unit_id = u.unit_id
    JOIN properties p ON u.property_id = p.property_id
    JOIN tenants t ON l.tenant_id = t.tenant_id
    WHERE p.landlord_id = :landlord_id
      AND rp.status IN ('due', 'overdue')
      AND (rp.status = 'overdue' OR DATEDIFF(rp.due_date, CURDATE()) <= :window)
    ORDER BY rp.due_date ASC
");
$stmt->execute(['landlord_id' => $landlord_id, 'window' => REMINDER_WINDOW_DAYS]);
$rows = $stmt->fetchAll();

$reminders = array_map(function ($r) {
    $daysUntilDue = (int) $r['days_until_due'];
    $status = $daysUntilDue < 0 ? 'overdue' : $r['status'];

    return [
        'tenant' => $r['tenant'],
        'unit' => $r['unit'],
        'amount' => (float) $r['amount_due'],
        'dueDate' => $r['due_date'],
        'status' => $status,
        'daysUntilDue' => max($daysUntilDue, 0),
    ];
}, $rows);

if ($redis !== null) {
    try {
        $redis->setex($cacheKey, REMINDER_TTL_SECONDS, json_encode($reminders));
    } catch (RedisException $e) {

    }
}

send_json(['reminders' => $reminders, 'fromCache' => false]);