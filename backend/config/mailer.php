<?php

require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

function send_email(string $toEmail, string $toName, string $subject, string $bodyHtml): bool {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = getenv('MAIL_HOST') ?: 'mailpit';
        $mail->Port = (int) (getenv('MAIL_PORT') ?: 1025);
        $mail->SMTPAuth = false;
        $mail->SMTPAutoTLS = false;

        $mail->setFrom('no-reply@homeease.dev', 'HomeEase');
        $mail->addAddress($toEmail, $toName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $bodyHtml;
        $mail->AltBody = strip_tags($bodyHtml);

        $mail->send();
        return true;
    } catch (PHPMailerException $e) {
        error_log('Email send failed: ' . $mail->ErrorInfo);
        return false;
    }
}