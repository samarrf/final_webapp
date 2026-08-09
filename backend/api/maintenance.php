<?php

require_once __DIR__ . '/../config/api_bootstrap.php';
require_once __DIR__ . '/../config/mongo.php';

$user = require_auth('landlord');
$landlordId = (int) $user['id'];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $requests = mongo_find_maintenance_requests([
            'landlordId' => $landlordId,
        ]);

        send_json($requests);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
        $body = json_decode(
            file_get_contents('php://input'),
            true
        ) ?? [];

        $requestId = trim($body['requestId'] ?? '');
        $status = $body['status'] ?? null;
        $priority = $body['priority'] ?? null;

        if ($requestId === '') {
            send_json([
                'error' => 'requestId is required',
            ], 400);
        }

        $allowedStatuses = [
            'open',
            'in progress',
            'resolved',
        ];

        $allowedPriorities = [
            'low',
            'medium',
            'high',
        ];

        $changes = [];

        if ($status !== null) {
            if (!in_array($status, $allowedStatuses, true)) {
                send_json([
                    'error' => 'Invalid maintenance status',
                ], 400);
            }

            $changes['status'] = $status;
        }

        if ($priority !== null) {
            if (!in_array($priority, $allowedPriorities, true)) {
                send_json([
                    'error' => 'Invalid maintenance priority',
                ], 400);
            }

            $changes['priority'] = $priority;
        }

        if ($changes === []) {
            send_json([
                'error' => 'Provide status or priority to update',
            ], 400);
        }

        $changes['updatedAt'] =
            new MongoDB\BSON\UTCDateTime();

        try {
            $updated = mongo_update_maintenance_request(
                $requestId,
                $landlordId,
                $changes
            );
        } catch (MongoDB\Driver\Exception\InvalidArgumentException $e) {
            send_json([
                'error' => 'Invalid maintenance request ID',
            ], 400);
        }

        if (!$updated) {
            send_json([
                'error' => 'Maintenance request not found',
            ], 404);
        }

        send_json([
            'message' => 'Maintenance request updated',
        ]);
    }

    send_json([
        'error' => 'Method not allowed',
    ], 405);
} catch (MongoDB\Driver\Exception\Exception $e) {
    error_log(
        'Maintenance database error: ' . $e->getMessage()
    );

    send_json([
        'error' =>
            'Could not reach the maintenance request database',
    ], 503);
}