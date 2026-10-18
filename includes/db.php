<?php

$databaseDsn = getenv('DATABASE_DSN');
$databaseUser = getenv('DATABASE_USER');
$databasePassword = getenv('DATABASE_PASSWORD');

if ($databaseDsn === false || $databaseDsn === '' || $databaseUser === false || $databaseUser === '' || $databasePassword === false || $databasePassword === '') {
    error_log('Database connection is not configured. Set DATABASE_DSN, DATABASE_USER, and DATABASE_PASSWORD.');
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'database_not_configured']);
    exit;
}

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
