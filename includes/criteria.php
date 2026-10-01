<?php
/**
 * JSON API for the criteria table. Admin only.
 * GET lists criteria; POST creates or updates; DELETE removes a criterion.
 */

require_once __DIR__ . '/auth.php';
requireApiRole('admin');

header('Content-Type: application/json; charset=utf-8');
$method = $_SERVER['REQUEST_METHOD'] ?? '';

function criteriaRespond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE');
    criteriaRespond(['error' => 'method_not_allowed'], 405);
}

require_once __DIR__ . '/db.php';

try {
    if ($method === 'GET') {
        $stmt = $pdo->query('SELECT id, name, max_marks AS `max`, category FROM criteria ORDER BY category, id');
        criteriaRespond($stmt->fetchAll());
    }

    $rawBody = file_get_contents('php://input');
    if ($method === 'POST' || stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
        $data = json_decode($rawBody, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            criteriaRespond(['error' => 'invalid_json'], 400);
        }
    } else {
        parse_str($rawBody, $data);
    }

    if ($method === 'POST') {
        $name = is_string($data['name'] ?? null) ? trim($data['name']) : '';
        $category = $data['category'] ?? '';
        $max = filter_var($data['max'] ?? null, FILTER_VALIDATE_INT);

        if ($name === '') {
            criteriaRespond(['error' => 'Enter a name.'], 422);
        }
        if ($max === false || $max < 1 || $max > 100) {
            criteriaRespond(['error' => 'Maximum marks must be between 1 and 100.'], 422);
        }
        if (!in_array($category, ['Engineering', 'Polytechnic'], true)) {
            criteriaRespond(['error' => 'Category must be Engineering or Polytechnic.'], 422);
        }

        $id = $data['id'] ?? null;
        if ($id !== null && $id !== '') {
            $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($id === false) {
                criteriaRespond(['error' => 'Invalid id.'], 422);
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare('UPDATE criteria SET name = ?, max_marks = ?, category = ? WHERE id = ?');
            $stmt->execute([$name, $max, $category, $id]);

            $stmt = $pdo->prepare('SELECT id FROM criteria WHERE id = ?');
            $stmt->execute([$id]);
            if (!$stmt->fetchColumn()) {
                $pdo->rollBack();
                criteriaRespond(['error' => 'Criterion not found.'], 404);
            }

            $stmt = $pdo->prepare('UPDATE marks SET score = ? WHERE criterion_id = ? AND score > ?');
            $stmt->execute([$max, $id, $max]);
            $pdo->commit();
        } else {
            $stmt = $pdo->prepare('INSERT INTO criteria (name, max_marks, category) VALUES (?, ?, ?)');
            $stmt->execute([$name, $max, $category]);
            $id = (int) $pdo->lastInsertId();
        }

        criteriaRespond(['success' => true, 'id' => $id]);
    }

    if (!isset($data['id']) || $data['id'] === '') {
        criteriaRespond(['error' => 'Missing id.'], 422);
    }
    $id = filter_var($data['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        criteriaRespond(['error' => 'Invalid id.'], 422);
    }

    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT id FROM criteria WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) {
        $pdo->rollBack();
        criteriaRespond(['error' => 'Criterion not found.'], 404);
    }

    $stmt = $pdo->prepare('DELETE FROM marks WHERE criterion_id = ?');
    $stmt->execute([$id]);
    $stmt = $pdo->prepare('DELETE FROM criteria WHERE id = ?');
    $stmt->execute([$id]);
    $pdo->commit();

    criteriaRespond(['success' => true]);
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Criteria API failed: ' . $exception->getMessage());
    criteriaRespond(['error' => 'server_error'], 500);
}