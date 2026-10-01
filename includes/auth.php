<?php
/**
 * includes/auth.php
 * Starts the session and provides two guards:
 *   requireRole()    -> for normal pages (redirects to login.html)
 *   requireApiRole() -> for api/*.php files (returns JSON + 401/403, no redirect)
 *
 * Expects login.php to have already set, on successful login:
 *   $_SESSION['user_id']   -> the logged-in user's id from the `users` table
 *   $_SESSION['user_name'] -> their display name
 *   $_SESSION['role']      -> 'admin' or 'judge'
 */

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', '1');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off',
        'samesite' => 'Lax',
    ]);
    session_start();
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
 * Use on normal .php pages (e.g. judge/my-team.php).
 * Sends the browser to the login page if not logged in / wrong role.
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
 * Use on api/*.php files only. A fetch() request can't "follow" a redirect
 * the way a browser navigation can, so instead of header('Location: ...'),
 * this just replies with a JSON error and an HTTP status code. Your JS
 * fetch() calls should check for this and send the user to login.html
 * themselves when it happens (see js/admin.js / js/judge.js changes).
 */
function requireApiRole(string $role): void
{
    header('Content-Type: application/json');

    if (empty($_SESSION['user_id']) || empty($_SESSION['role'])) {
        http_response_code(401); // not logged in at all
        echo json_encode(['error' => 'not_logged_in']);
        exit;
    }

    if ($_SESSION['role'] !== $role) {
        http_response_code(403); // logged in, but as the wrong role
        echo json_encode(['error' => 'wrong_role']);
        exit;
    }
}