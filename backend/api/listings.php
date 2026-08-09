<?php

require_once __DIR__ . '/../config/api_bootstrap.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_json(['error' => 'Method not allowed'], 405);
}

$pdo = get_db_connection();

$sql = "
    SELECT
        u.unit_id,
        CONCAT(p.street_address, ', ', u.unit_label) AS address,
        CONCAT(p.city, ', ', p.state) AS city,
        u.bedrooms,
        u.bathrooms,
        u.monthly_rent AS rent,
        u.status
    FROM units u
    JOIN properties p
        ON u.property_id = p.property_id
    WHERE u.status = 'vacant'
    ORDER BY p.city, p.street_address, u.unit_label
";

$stmt = $pdo->query($sql);
$listings = $stmt->fetchAll();

foreach ($listings as &$listing) {
    $listing['unit_id'] = (int) $listing['unit_id'];
    $listing['bedrooms'] = (int) $listing['bedrooms'];
    $listing['bathrooms'] = (float) $listing['bathrooms'];
    $listing['rent'] = (float) $listing['rent'];
}

send_json($listings);