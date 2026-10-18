<?php

require_once __DIR__ . '/auth.php';
requireApiRole('admin');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

function adminDataRespond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function adminDataBody(): array
{
    $data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        adminDataRespond(['error' => 'invalid_json'], 400);
    }
    return $data;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (in_array($method, ['POST', 'DELETE'], true)) {
    requireApiCsrf();
}

try {
    if ($method === 'GET') {
        $criteria = $pdo->query('SELECT id, name, max_marks AS `max`, category FROM criteria ORDER BY category, id')->fetchAll();
        $judges = $pdo->query("SELECT id, name, username FROM users WHERE role = 'judge' ORDER BY name, id")->fetchAll();
        $teams = $pdo->query('SELECT id, team_no AS `no`, title, category, college, members FROM teams ORDER BY category, team_no')->fetchAll();
        foreach ($teams as &$team) {
            $team['members'] = json_decode($team['members'], true) ?: [];
        }
        unset($team);

        $assignments = [];
        foreach ($pdo->query('SELECT judge_id, team_id FROM assignments') as $row) {
            $judgeId = (string) $row['judge_id'];
            $assignments[$judgeId][] = (string) $row['team_id'];
        }

        $marks = [];
        $stmt = $pdo->query('SELECT judge_id, team_id, criterion_id, score, remarks FROM marks JOIN mark_sheets USING (judge_id, team_id) ORDER BY judge_id, team_id, criterion_id');
        foreach ($stmt as $row) {
            $key = $row['judge_id'] . '|' . $row['team_id'];
            if (!isset($marks[$key])) {
                $marks[$key] = ['scores' => [], 'remarks' => $row['remarks']];
            }
            $marks[$key]['scores'][(string) $row['criterion_id']] = (int) $row['score'];
        }

        adminDataRespond([
            'criteria' => $criteria,
            'judges' => $judges,
            'teams' => $teams,
            'assignments' => $assignments,
            'marks' => $marks,
            'markingLocked' => (bool) $pdo->query('SELECT marking_locked FROM settings WHERE id = 1')->fetchColumn(),
            'csrfToken' => $_SESSION['csrf_token'],
        ]);
    }

    if ($method === 'POST') {
        $data = adminDataBody();
        $action = $data['action'] ?? '';

        if ($action === 'set-marking-lock') {
            if (!is_bool($data['locked'] ?? null)) {
                adminDataRespond(['error' => 'Invalid lock state.'], 422);
            }
            $stmt = $pdo->prepare('UPDATE settings SET marking_locked = ? WHERE id = 1');
            $stmt->execute([$data['locked']]);
            adminDataRespond(['success' => true, 'markingLocked' => $data['locked']]);
        }

        if ($action === 'save-judge') {
            $id = $data['id'] ?? null;
            $name = trim((string) ($data['name'] ?? ''));
            $username = trim((string) ($data['username'] ?? ''));
            $password = (string) ($data['password'] ?? '');
            if ($name === '' || $username === '' || ($id === null && $password === '')) {
                adminDataRespond(['error' => 'Name, username, and a password for new judges are required.'], 422);
            }
            if ($id === null) {
                $stmt = $pdo->prepare("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, 'judge')");
                $stmt->execute([$name, $username, password_hash($password, PASSWORD_DEFAULT)]);
                adminDataRespond(['success' => true, 'id' => (string) $pdo->lastInsertId()]);
            }
            $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($id === false) {
                adminDataRespond(['error' => 'Invalid judge id.'], 422);
            }
            if ($password !== '') {
                $stmt = $pdo->prepare("UPDATE users SET name = ?, username = ?, password_hash = ? WHERE id = ? AND role = 'judge'");
                $stmt->execute([$name, $username, password_hash($password, PASSWORD_DEFAULT), $id]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET name = ?, username = ? WHERE id = ? AND role = 'judge'");
                $stmt->execute([$name, $username, $id]);
            }
            if ($stmt->rowCount() === 0) {
                $check = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'judge'");
                $check->execute([$id]);
                if (!$check->fetchColumn()) {
                    adminDataRespond(['error' => 'Judge not found.'], 404);
                }
            }
            adminDataRespond(['success' => true, 'id' => (string) $id]);
        }

        if ($action === 'save-team') {
            $id = $data['id'] ?? null;
            $teamNo = strtoupper(trim((string) ($data['no'] ?? '')));
            $title = trim((string) ($data['title'] ?? ''));
            $category = $data['category'] ?? '';
            $college = trim((string) ($data['college'] ?? ''));
            $members = $data['members'] ?? null;
            if ($teamNo === '' || $title === '' || $college === '' || !in_array($category, ['Engineering', 'Polytechnic'], true) || !is_array($members) || count($members) < 1 || count($members) > 4) {
                adminDataRespond(['error' => 'Enter valid team details and between 1 and 4 members.'], 422);
            }
            foreach ($members as $member) {
                if (!is_string($member) || trim($member) === '') {
                    adminDataRespond(['error' => 'Member names cannot be empty.'], 422);
                }
            }
            $membersJson = json_encode(array_values(array_map('trim', $members)));
            if ($id === null) {
                $stmt = $pdo->prepare('INSERT INTO teams (team_no, title, category, college, members) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$teamNo, $title, $category, $college, $membersJson]);
                adminDataRespond(['success' => true, 'id' => (string) $pdo->lastInsertId()]);
            }
            $id = filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($id === false) {
                adminDataRespond(['error' => 'Invalid team id.'], 422);
            }
            $stmt = $pdo->prepare('UPDATE teams SET team_no = ?, title = ?, category = ?, college = ?, members = ? WHERE id = ?');
            $stmt->execute([$teamNo, $title, $category, $college, $membersJson, $id]);
            $check = $pdo->prepare('SELECT id FROM teams WHERE id = ?');
            $check->execute([$id]);
            if (!$check->fetchColumn()) {
                adminDataRespond(['error' => 'Team not found.'], 404);
            }
            adminDataRespond(['success' => true, 'id' => (string) $id]);
        }

        if ($action === 'set-assignment') {
            $judgeId = filter_var($data['judge_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            $teamId = filter_var($data['team_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            $assigned = $data['assigned'] ?? null;
            if ($judgeId === false || $teamId === false || !is_bool($assigned)) {
                adminDataRespond(['error' => 'Invalid assignment.'], 422);
            }
            if ($assigned) {
                $stmt = $pdo->prepare("INSERT INTO assignments (judge_id, team_id) SELECT u.id, t.id FROM users u CROSS JOIN teams t WHERE u.id = ? AND u.role = 'judge' AND t.id = ? ON DUPLICATE KEY UPDATE team_id = VALUES(team_id)");
                $stmt->execute([$judgeId, $teamId]);
                if ($stmt->rowCount() === 0) {
                    adminDataRespond(['error' => 'Judge or team not found.'], 404);
                }
            } else {
                $stmt = $pdo->prepare('DELETE FROM assignments WHERE judge_id = ? AND team_id = ?');
                $stmt->execute([$judgeId, $teamId]);
            }
            adminDataRespond(['success' => true]);
        }

        adminDataRespond(['error' => 'Unknown action.'], 422);
    }

    if ($method === 'DELETE') {
        $resource = $_GET['resource'] ?? '';
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!in_array($resource, ['judge', 'team'], true) || $id === false) {
            adminDataRespond(['error' => 'Invalid delete request.'], 422);
        }
        if ($resource === 'judge') {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ? AND role = 'judge'");
        } else {
            $stmt = $pdo->prepare('DELETE FROM teams WHERE id = ?');
        }
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            adminDataRespond(['error' => ucfirst($resource) . ' not found.'], 404);
        }
        adminDataRespond(['success' => true]);
    }

    header('Allow: GET, POST, DELETE');
    adminDataRespond(['error' => 'method_not_allowed'], 405);
} catch (PDOException $exception) {
    error_log('Admin data API failed: ' . $exception->getMessage());
    $status = $exception->getCode() === '23000' ? 409 : 500;
    adminDataRespond(['error' => $status === 409 ? 'A username or team number is already in use.' : 'server_error'], $status);
} catch (Throwable $exception) {
    error_log('Admin data API failed: ' . $exception->getMessage());
    adminDataRespond(['error' => 'server_error'], 500);
}
