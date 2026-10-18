<?php

header('Content-Type: text/html; charset=utf-8');

$requestedCode = filter_input(INPUT_GET, 'code', FILTER_VALIDATE_INT);
$code = in_array($requestedCode, [403, 404, 500], true) ? $requestedCode : 404;
http_response_code($code);

$messages = [
    403 => ['Access denied', 'You do not have permission to view this page. Sign in with an account that has access.'],
    404 => ['Page not found', 'The page may have moved, or the address may be incorrect.'],
    500 => ['Something went wrong', 'The server could not complete your request. Please try again later.'],
];
[$title, $message] = $messages[$code];

$documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: '';
$projectRoot = realpath(__DIR__) ?: __DIR__;
$relativeRoot = $documentRoot !== '' ? substr($projectRoot, strlen($documentRoot)) : '';
$basePath = '/' . trim(str_replace('\\', '/', $relativeRoot), '/');
if ($basePath === '/') {
    $basePath = '';
}
$safeBasePath = htmlspecialchars($basePath, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#080a12" />
    <title><?= htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?> — Innovation 2K26</title>
    <link rel="icon" type="image/png" href="<?= $safeBasePath ?>/assets/college-logo.png" />
    <link rel="stylesheet" href="<?= $safeBasePath ?>/css/error.css" />
  </head>
  <body>
    <main class="error-card">
      <a class="brand" href="<?= $safeBasePath ?>/login.html" aria-label="Innovation 2K26 sign in">
        <img src="<?= $safeBasePath ?>/assets/college-logo.png" alt="" />
        <span>Innovation 2K26</span>
      </a>
      <p class="code"><?= $code ?></p>
      <h1><?= htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></h1>
      <p class="message"><?= htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p>
      <div class="actions">
        <a class="button button-primary" href="<?= $safeBasePath ?>/login.html">Go to sign in</a>
        <a class="button button-secondary" href="">Try again</a>
      </div>
    </main>
  </body>
</html>
