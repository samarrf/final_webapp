<?php

require_once __DIR__ . '/../config/api_bootstrap.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/dashboard_cache.php';

$user = require_auth('landlord');
$landlordId = (int) $user['id'];

$pdo = get_db_connection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "
        SELECT
            u.unit_id,
            CONCAT(p.street_address, ', ', u.unit_label) AS address,
            CONCAT(p.city, ', ', p.state) AS city,
            u.bedrooms,
            u.bathrooms,
            u.monthly_rent AS rent,
            u.status,
            CONCAT(t.first_name, ' ', t.last_name) AS tenant
        FROM units u
        JOIN properties p
            ON u.property_id = p.property_id
        LEFT JOIN leases l
            ON l.unit_id = u.unit_id
            AND l.active = TRUE
        LEFT JOIN tenants t
            ON t.tenant_id = l.tenant_id
        WHERE p.landlord_id = :landlord_id
        ORDER BY p.street_address, u.unit_label
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'landlord_id' => $landlordId,
    ]);

    $units = $stmt->fetchAll();

    foreach ($units as &$unit) {
        $unit['unit_id'] = (int) $unit['unit_id'];
        $unit['bedrooms'] = (int) $unit['bedrooms'];
        $unit['bathrooms'] = (float) $unit['bathrooms'];
        $unit['rent'] = (float) $unit['rent'];
    }

    send_json($units);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(
        file_get_contents('php://input'),
        true
    ) ?? [];

    $streetAddress = trim($body['streetAddress'] ?? '');
    $city = trim($body['city'] ?? '');
    $state = strtoupper(trim($body['state'] ?? ''));
    $zipCode = trim($body['zipCode'] ?? '');
    $unitLabel = trim($body['unitLabel'] ?? '');
    $bedrooms = (int) ($body['bedrooms'] ?? 0);
    $bathrooms = (float) ($body['bathrooms'] ?? 0);
    $monthlyRent = (float) ($body['monthlyRent'] ?? 0);

    if (
        $streetAddress === '' ||
        $city === '' ||
        strlen($state) !== 2 ||
        $zipCode === '' ||
        $unitLabel === '' ||
        $bedrooms < 0 ||
        $bathrooms <= 0 ||
        $monthlyRent <= 0
    ) {
        send_json([
            'error' => 'Complete all required property fields',
        ], 400);
    }

    try {
        $pdo->beginTransaction();

        $propertyStmt = $pdo->prepare("
            INSERT INTO properties (
                landlord_id,
                street_address,
                city,
                state,
                zip_code
            )
            VALUES (
                :landlord_id,
                :street_address,
                :city,
                :state,
                :zip_code
            )
        ");

        $propertyStmt->execute([
            'landlord_id' => $landlordId,
            'street_address' => $streetAddress,
            'city' => $city,
            'state' => $state,
            'zip_code' => $zipCode,
        ]);

        $propertyId = (int) $pdo->lastInsertId();

        $unitStmt = $pdo->prepare("
            INSERT INTO units (
                property_id,
                unit_label,
                bedrooms,
                bathrooms,
                monthly_rent,
                status
            )
            VALUES (
                :property_id,
                :unit_label,
                :bedrooms,
                :bathrooms,
                :monthly_rent,
                'vacant'
            )
        ");

        $unitStmt->execute([
            'property_id' => $propertyId,
            'unit_label' => $unitLabel,
            'bedrooms' => $bedrooms,
            'bathrooms' => $bathrooms,
            'monthly_rent' => $monthlyRent,
        ]);

        $unitId = (int) $pdo->lastInsertId();

        $pdo->commit();

        invalidate_dashboard_cache($landlordId);

        send_json([
            'message' => 'Property created successfully',
            'propertyId' => $propertyId,
            'unitId' => $unitId,
        ], 201);
    } catch (PDOException $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        error_log(
            'Create property error: ' . $error->getMessage()
        );

        send_json([
            'error' => 'Could not create the property',
        ], 500);
    }
}

send_json([
    'error' => 'Method not allowed',
], 405);