CREATE TABLE users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    username VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'judge') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY users_username_unique (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE criteria (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    max_marks TINYINT UNSIGNED NOT NULL,
    category ENUM('Engineering', 'Polytechnic') NOT NULL,
    PRIMARY KEY (id),
    KEY criteria_category_index (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
    id TINYINT UNSIGNED NOT NULL,
    marking_locked BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (id, marking_locked) VALUES (1, FALSE);

CREATE TABLE teams (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    team_no VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    category ENUM('Engineering', 'Polytechnic') NOT NULL,
    college VARCHAR(200) NOT NULL,
    members JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY teams_team_no_unique (team_no),
    KEY teams_category_index (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assignments (
    judge_id INT UNSIGNED NOT NULL,
    team_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (judge_id, team_id),
    CONSTRAINT assignments_judge_fk FOREIGN KEY (judge_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT assignments_team_fk FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mark_sheets (
    judge_id INT UNSIGNED NOT NULL,
    team_id INT UNSIGNED NOT NULL,
    remarks TEXT NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (judge_id, team_id),
    CONSTRAINT mark_sheets_assignment_fk FOREIGN KEY (judge_id, team_id) REFERENCES assignments (judge_id, team_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE marks (
    judge_id INT UNSIGNED NOT NULL,
    team_id INT UNSIGNED NOT NULL,
    criterion_id INT UNSIGNED NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (judge_id, team_id, criterion_id),
    CONSTRAINT marks_sheet_fk FOREIGN KEY (judge_id, team_id) REFERENCES mark_sheets (judge_id, team_id) ON DELETE CASCADE,
    CONSTRAINT marks_criterion_fk FOREIGN KEY (criterion_id) REFERENCES criteria (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
