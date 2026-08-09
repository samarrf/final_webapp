<?php

require_once __DIR__ . '/../../config/api_bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/mongo.php';

$user = require_auth('tenant');
$tenant_id = $user['id'];

$pdo = get_db_connection();

$leaseStmt = $pdo->prepare("
    SELECT
        l.lease_id,
        p.landlord_id,
        CONCAT(p.street_address, ', ', u.unit_label) AS unit,
        CONCAT(t.first_name, ' ', t.last_name) AS tenant_name
    FROM leases l
    JOIN units u ON l.unit_id = u.unit_id
    JOIN properties p ON u.property_id = p.property_id
    JOIN tenants t ON l.tenant_id = t.tenant_id
    WHERE l.tenant_id = :tenant_id AND l.active = TRUE
    LIMIT 1
");
$leaseStmt->execute(['tenant_id' => $tenant_id]);
$lease = $leaseStmt->fetch();

if (!$lease) {
    send_json(['error' => 'No active lease found for this tenant'], 404);
}

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB per file
const ALLOWED_PHOTO_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

function save_maintenance_photos(array $files, int $tenantId): array {
    if (empty($files['name'])) {
        return [];
    }

    $names = (array) $files['name'];
    $count = count($names);

    if ($count > MAX_PHOTOS) {
        throw new InvalidArgumentException('You can attach up to ' . MAX_PHOTOS . ' photos.');
    }

    $uploadDir = __DIR__ . '/../../uploads/maintenance/' . $tenantId;
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        throw new RuntimeException('Could not prepare upload storage.');
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';

    $photos = [];

    for ($i = 0; $i < $count; $i++) {
        $error = $files['error'][$i] ?? UPLOAD_ERR_NO_FILE;
        if ($error === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        if ($error !== UPLOAD_ERR_OK) {
            throw new InvalidArgumentException('One of the photos failed to upload. Please try again.');
        }

        $tmpPath = $files['tmp_name'][$i];
        $size = $files['size'][$i];
        $originalName = $files['name'][$i];

        if ($size > MAX_PHOTO_BYTES) {
            throw new InvalidArgumentException("\"$originalName\" is larger than 5MB.");
        }

        $mimeType = mime_content_type($tmpPath) ?: '';
        if (!isset(ALLOWED_PHOTO_TYPES[$mimeType])) {
            throw new InvalidArgumentException("\"$originalName\" isn't a supported image type (use JPG, PNG, or WEBP).");
        }

        $extension = ALLOWED_PHOTO_TYPES[$mimeType];
        $storedName = bin2hex(random_bytes(16)) . '.' . $extension;
        $destination = $uploadDir . '/' . $storedName;

        if (!move_uploaded_file($tmpPath, $destination)) {
            throw new RuntimeException("Could not save \"$originalName\".");
        }

        $photos[] = [
            'file_name' => $originalName,
            'file_type' => $mimeType,
            'file_size' => (int) $size,
            'storage_url' => "$scheme://$host/uploads/maintenance/$tenantId/$storedName",
            'uploaded_date' => date('c'),
        ];
    }

    return $photos;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $isMultipart = stripos($contentType, 'multipart/form-data') !== false;

        if ($isMultipart) {
            $issue = trim($_POST['issue'] ?? '');
            $priority = $_POST['priority'] ?? 'medium';
        } else {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $issue = trim($body['issue'] ?? '');
            $priority = $body['priority'] ?? 'medium';
        }

        if ($issue === '') {
            send_json(['error' => 'issue is required'], 400);
        }
        if (!in_array($priority, ['low', 'medium', 'high'], true)) {
            $priority = 'medium';
        }

        $photos = [];
        if ($isMultipart && isset($_FILES['photos'])) {
            try {
                $photos = save_maintenance_photos($_FILES['photos'], (int) $tenant_id);
            } catch (InvalidArgumentException $e) {
                send_json(['error' => $e->getMessage()], 400);
            } catch (RuntimeException $e) {
                send_json(['error' => $e->getMessage()], 500);
            }
        }

        $id = mongo_insert_maintenance_request([
            'unit' => $lease['unit'],
            'tenantName' => $lease['tenant_name'],
            'tenantId' => $tenant_id,
            'landlordId' => (int) $lease['landlord_id'],
            'issue' => $issue,
            'priority' => $priority,
            'status' => 'open',
            'photos' => $photos,
        ]);

        send_json(['message' => 'Request submitted', 'id' => $id], 201);
    }

    $requests = mongo_find_maintenance_requests(['tenantId' => $tenant_id]);
    send_json($requests);
} catch (MongoDB\Driver\Exception\Exception $e) {
    send_json(['error' => 'Could not reach the maintenance request database'], 503);
}