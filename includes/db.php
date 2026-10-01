<?php

$databaseDsn = getenv('DATABASE_DSN') ?: 'mysql:host=localhost;dbname=innovation2k26;charset=utf8mb4';
$databaseUser = getenv('DATABASE_USER') ?: 'root';
$databasePassword = getenv('DATABASE_PASSWORD') ?: '';

try {
    $pdo = new PDO($databaseDsn, $databaseUser, $databasePassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $exception) {
    error_log('Database connection failed: ' . $exception->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'database_unavailable']);
    exit;
}
