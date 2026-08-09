<?php

declare(strict_types=1);

function get_db_connection(): PDO
{
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $dbname = getenv('DB_NAME') ?: 'homeease';
    $user = getenv('DB_USER') ?: 'homeease_app';
    $pass = getenv('DB_PASS') ?: 'devpassword';

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $host,
        $port,
        $dbname
    );

    try {
        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        error_log('Database connection failed: ' . $e->getMessage());

        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'error' => 'Database connection failed',
        ]);

        exit;
    }
}