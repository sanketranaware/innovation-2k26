<?php

require_once __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_json']);
    exit;
}

$username = trim((string) ($data['username'] ?? ''));
$password = (string) ($data['password'] ?? '');
$role = $data['role'] ?? '';
if ($username === '' || $password === '' || !in_array($role, ['admin', 'judge'], true)) {
    http_response_code(422);
    echo json_encode(['error' => 'Enter a valid username, password, and role.']);
    exit;
}

require_once __DIR__ . '/db.php';
$stmt = $pdo->prepare('SELECT id, name, username, password_hash, role FROM users WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || $user['role'] !== $role || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid login credentials.']);
    exit;
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['user_name'] = $user['name'];
$_SESSION['role'] = $user['role'];

echo json_encode([
    'success' => true,
    'role' => $user['role'],
    'redirect' => appBasePath() . ($user['role'] === 'admin' ? '/admin/admin.html' : '/judge/judge.html'),
]);
