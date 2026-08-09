<?php

require_once __DIR__ . '/../../config/api_bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['error' => 'Method not allowed'], 405);
}

$user = require_auth('tenant');
$tenantId = (int) $user['id'];

try {
    $pdo = get_db_connection();

    $leaseStmt = $pdo->prepare("
        SELECT l.lease_id, t.first_name, t.last_name, t.email
        FROM leases l
        JOIN tenants t ON l.tenant_id = t.tenant_id
        WHERE l.tenant_id = :tenant_id
          AND l.active = TRUE
        LIMIT 1
    ");

    $leaseStmt->execute([
        'tenant_id' => $tenantId,
    ]);

    $lease = $leaseStmt->fetch();

    if (!$lease) {
        send_json([
            'error' => 'No active lease found for this tenant',
        ], 404);
    }

    $paymentStmt = $pdo->prepare("
        SELECT payment_id, amount_due, due_date, status
        FROM rent_payments
        WHERE lease_id = :lease_id
          AND status IN ('due', 'overdue')
        ORDER BY due_date ASC
        LIMIT 1
    ");

    $paymentStmt->execute([
        'lease_id' => $lease['lease_id'],
    ]);

    $payment = $paymentStmt->fetch();

    if (!$payment) {
        send_json([
            'success' => false,
            'message' => 'No outstanding rent payment was found',
        ]);
    }

    $updateStmt = $pdo->prepare("
        UPDATE rent_payments
        SET status = 'paid',
            paid_date = CURDATE()
        WHERE payment_id = :payment_id
    ");

    $updateStmt->execute([
        'payment_id' => $payment['payment_id'],
    ]);

    $tenantName = trim($lease['first_name'] . ' ' . $lease['last_name']);
    $emailSent = send_email(
        $lease['email'],
        $tenantName,
        'HomeEase: Rent Payment Receipt',
        "<p>Hi {$tenantName},</p>" .
        "<p>This confirms your rent payment of <strong>$" . number_format($payment['amount_due'], 2) . "</strong> " .
        "(originally due {$payment['due_date']}) has been received.</p>" .
        "<p>Thank you,<br>HomeEase</p>"
    );

    if (!$emailSent) {
        error_log("pay_rent.php: receipt email failed to send for payment_id={$payment['payment_id']}, tenant_id={$tenantId}");
    }

    send_json([
        'success' => true,
        'message' => 'Payment recorded successfully',
        'emailSent' => $emailSent,
        'payment' => [
            'paymentId' => (int) $payment['payment_id'],
            'amount' => (float) $payment['amount_due'],
            'dueDate' => $payment['due_date'],
            'status' => 'paid',
            'paidDate' => date('Y-m-d'),
        ],
    ]);
} catch (PDOException $e) {
    error_log('Rent payment error: ' . $e->getMessage());

    send_json([
        'error' => 'Could not record the payment',
    ], 500);
}