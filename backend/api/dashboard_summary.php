<?php


require_once __DIR__ . '/../config/api_bootstrap.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/redis.php';

$user = require_auth('landlord');
$landlord_id = $user['id'];

const SUMMARY_TTL_SECONDS = 60;

$cacheKey = "dashboard:summary:{$landlord_id}";

try {
    $redis = get_redis();
    $cached = $redis->get($cacheKey);
    if ($cached !== false) {
        $data = json_decode($cached, true);
        $data['fromCache'] = true;
        send_json($data);
    }
} catch (RedisException $e) {
    $redis = null;
}

$pdo = get_db_connection();
$stmt = $pdo->prepare("
    SELECT
        COUNT(*) AS total_units,
        SUM(status = 'occupied') AS occupied_units,
        SUM(monthly_rent) AS monthly_total
    FROM units u
    JOIN properties p ON u.property_id = p.property_id
    WHERE p.landlord_id = :landlord_id
");
$stmt->execute(['landlord_id' => $landlord_id]);
$row = $stmt->fetch();

$summary = [
    'totalUnits' => (int) $row['total_units'],
    'occupiedUnits' => (int) $row['occupied_units'],
    'monthlyTotal' => (float) $row['monthly_total'],
    'computedAt' => date('c'),
];

if ($redis !== null) {
    try {
        $redis->setex($cacheKey, SUMMARY_TTL_SECONDS, json_encode($summary));
    } catch (RedisException $e) {
    }
}

$summary['fromCache'] = false;
send_json($summary);
