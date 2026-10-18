<?php

require_once __DIR__ . '/../includes/auth.php';
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

requireApiCsrf();

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?? 'Lax',
    ]);
}
session_destroy();
echo json_encode(['success' => true]);