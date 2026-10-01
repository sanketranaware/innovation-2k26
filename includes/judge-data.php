<?php

require_once __DIR__ . '/auth.php';
requireApiRole('judge');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

function judgeDataRespond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    $judgeId = (int) $_SESSION['user_id'];

    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT id, name FROM users WHERE id = ? AND role = \'judge\'');
        $stmt->execute([$judgeId]);
        $judge = $stmt->fetch();
        if (!$judge) {
            judgeDataRespond(['error' => 'judge_not_found'], 404);
        }

        $stmt = $pdo->prepare('SELECT t.id, t.team_no AS `no`, t.title, t.category, t.college, t.members FROM assignments a JOIN teams t ON t.id = a.team_id WHERE a.judge_id = ? ORDER BY t.category, t.team_no');
        $stmt->execute([$judgeId]);
        $teams = $stmt->fetchAll();
        foreach ($teams as &$team) {
            $team['members'] = json_decode($team['members'], true) ?: [];
        }
        unset($team);

        $criteria = $pdo->query('SELECT id, name, max_marks AS `max`, category FROM criteria ORDER BY category, id')->fetchAll();
        $stmt = $pdo->prepare('SELECT m.team_id, m.criterion_id, m.score, s.remarks FROM marks m JOIN mark_sheets s USING (judge_id, team_id) WHERE m.judge_id = ? ORDER BY m.team_id, m.criterion_id');
        $stmt->execute([$judgeId]);
        $marks = [];
        foreach ($stmt as $row) {
            $teamId = (string) $row['team_id'];
            if (!isset($marks[$teamId])) {
                $marks[$teamId] = ['scores' => [], 'remarks' => $row['remarks']];
            }
            $marks[$teamId]['scores'][(string) $row['criterion_id']] = (int) $row['score'];
        }

        $markingLocked = (bool) $pdo->query('SELECT marking_locked FROM settings WHERE id = 1')->fetchColumn();
        judgeDataRespond([
            'judge' => $judge,
            'teams' => $teams,
            'criteria' => $criteria,
            'marks' => $marks,
            'markingLocked' => $markingLocked,
        ]);
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            judgeDataRespond(['error' => 'invalid_json'], 400);
        }
        $teamId = filter_var($data['team_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $scores = $data['scores'] ?? null;
        $remarks = trim((string) ($data['remarks'] ?? ''));
        if ($teamId === false || !is_array($scores)) {
            judgeDataRespond(['error' => 'Invalid marking data.'], 422);
        }

        $stmt = $pdo->prepare('SELECT t.category FROM assignments a JOIN teams t ON t.id = a.team_id WHERE a.judge_id = ? AND t.id = ?');
        $stmt->execute([$judgeId, $teamId]);
        $category = $stmt->fetchColumn();
        if (!$category) {
            judgeDataRespond(['error' => 'This team is not assigned to you.'], 403);
        }

        $stmt = $pdo->prepare('SELECT id, max_marks FROM criteria WHERE category = ? ORDER BY id');
        $stmt->execute([$category]);
        $criteria = $stmt->fetchAll();
        if (!$criteria || count($scores) !== count($criteria)) {
            judgeDataRespond(['error' => 'Complete every criterion before saving.'], 422);
        }
        foreach ($criteria as $criterion) {
            $key = (string) $criterion['id'];
            $score = filter_var($scores[$key] ?? null, FILTER_VALIDATE_INT);
            if ($score === false || $score < 0 || $score > (int) $criterion['max_marks']) {
                judgeDataRespond(['error' => 'A score is missing or outside its allowed range.'], 422);
            }
        }

        $pdo->beginTransaction();
        $locked = (bool) $pdo->query('SELECT marking_locked FROM settings WHERE id = 1 FOR UPDATE')->fetchColumn();
        if ($locked) {
            $pdo->rollBack();
            judgeDataRespond(['error' => 'Marking is locked by the administrator.'], 423);
        }
        $stmt = $pdo->prepare('INSERT INTO mark_sheets (judge_id, team_id, remarks) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE remarks = VALUES(remarks)');
        $stmt->execute([$judgeId, $teamId, $remarks]);
        $stmt = $pdo->prepare('DELETE FROM marks WHERE judge_id = ? AND team_id = ?');
        $stmt->execute([$judgeId, $teamId]);
        $stmt = $pdo->prepare('INSERT INTO marks (judge_id, team_id, criterion_id, score) VALUES (?, ?, ?, ?)');
        foreach ($criteria as $criterion) {
            $key = (string) $criterion['id'];
            $stmt->execute([$judgeId, $teamId, $criterion['id'], (int) $scores[$key]]);
        }
        $pdo->commit();
        judgeDataRespond(['success' => true]);
    }

    header('Allow: GET, POST');
    judgeDataRespond(['error' => 'method_not_allowed'], 405);
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Judge data API failed: ' . $exception->getMessage());
    judgeDataRespond(['error' => 'server_error'], 500);
}
