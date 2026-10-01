<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../includes/db.php';

$adminCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
if ($adminCount > 0) {
    fwrite(STDERR, "An administrator already exists.\n");
    exit(1);
}

fwrite(STDOUT, 'Administrator name: ');
$name = trim((string) fgets(STDIN));
fwrite(STDOUT, 'Login ID: ');
$username = trim((string) fgets(STDIN));
fwrite(STDOUT, 'Password (at least 12 characters): ');
$password = rtrim((string) fgets(STDIN), "\r\n");

if ($name === '' || $username === '' || strlen($password) < 12) {
    fwrite(STDERR, "Name and login ID are required; password must be at least 12 characters.\n");
    exit(1);
}

try {
    $stmt = $pdo->prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'admin')");
    $stmt->execute([$name, $username, password_hash($password, PASSWORD_DEFAULT)]);
    fwrite(STDOUT, "Administrator account created.\n");
} catch (PDOException $exception) {
    error_log('Administrator bootstrap failed: ' . $exception->getMessage());
    fwrite(STDERR, "Could not create the administrator. Check that the login ID is unused.\n");
    exit(1);
}
