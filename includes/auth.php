<?php
/**
 * includes/auth.php
 * Starts the session and provides two guards:
 *   requireRole()    -> for normal pages (redirects to login.html)
 *   requireApiRole() -> for api/*.php files (returns JSON + 401/403, no redirect)
 *
 * login.php sets on successful login:
 *   $_SESSION['user_id'], $_SESSION['user_name'], $_SESSION['role']
 */

if (session_status() === PHP_SESSION_NONE) {
    $isHttps = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_secure', $isHttps ? '1' : '0');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $isHttps,
        'samesite' => 'Lax',
    ]);
    session_start();
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function requireApiCsrf(): void
{
    $providedToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expectedToken = $_SESSION['csrf_token'] ?? '';

    if (!is_string($providedToken) || !is_string($expectedToken) || $expectedToken === '' || !hash_equals($expectedToken, $providedToken)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'csrf_validation_failed']);
        exit;
    }
}

function appBasePath(): string
{
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');

    foreach (['/admin/', '/judge/', '/api/', '/includes/'] as $directory) {
        $position = strpos($scriptName, $directory);
        if ($position !== false) {
            return rtrim(substr($scriptName, 0, $position), '/');
        }
    }

    $basePath = dirname($scriptName);
    return $basePath === '/' || $basePath === '.' ? '' : rtrim($basePath, '/');
}

/**
 * Use on normal .php pages. Redirects to the login page if not logged in / wrong role.
 */
function requireRole(string $role): void
{
    if (empty($_SESSION['user_id']) || empty($_SESSION['role'])) {
        header('Location: ' . appBasePath() . '/login.html');
        exit;
    }

    if ($_SESSION['role'] !== $role) {
        header('Location: ' . appBasePath() . '/login.html?error=wrong_role');
        exit;
    }
}

/**
 * Use on api/*.php files only. Replies with JSON + HTTP status instead of redirecting.
 */
function requireApiRole(string $role): void
{
    header('Content-Type: application/json');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('X-Frame-Options: DENY');

    if (empty($_SESSION['user_id']) || empty($_SESSION['role'])) {
        http_response_code(401);
        echo json_encode(['error' => 'not_logged_in']);
        exit;
    }

    if ($_SESSION['role'] !== $role) {
        http_response_code(403);
        echo json_encode(['error' => 'wrong_role']);
        exit;
    }
}