# Innovation 2K26 — Judging & Result Management System

A web-based judging and result management system built for **Innovation 2K26**, an innovation project competition hosted by the College of Engineering, Phaltan. It replaces manual, paper-based judging with a digital workflow for criteria setup, judge assignment, mark entry, and automatic rank-wise result generation — built to handle ~1000 participating teams across Engineering and Polytechnic categories.

🔗 Event page: [coephaltan.edu.in/innovation2k26.html](https://www.coephaltan.edu.in/innovation2k26.html)

## Problem

Manually scoring and ranking ~1000 teams across two categories, with multiple judges, is slow and error-prone. Paper-based totals are hard to verify, results are delayed, and there's no easy way to filter which teams a specific judge is responsible for.

## Solution

A two-role system — **Admin** and **Judge** — with no separate portal for participants. Admin sets up criteria and teams and assigns judges; judges mark only their assigned teams; totals and rankings are calculated automatically, per category.

## Features

**Admin panel**
- Secure login
- Criteria management, separate sets for Engineering and Polytechnic (add / edit / delete, max marks per criterion)
- Judge management (create / edit / delete judge login credentials)
- Team management (add / edit / delete team details — number, title, category, college, members)
- Assign specific teams to specific judges
- Auto-calculated, rank-wise, category-wise results with print and CSV export
- Lock marking to freeze scores once judging ends

**Judge panel**
- Secure login
- View of only the teams assigned to that judge
- Digital marking form with live running total
- Progress indicator of teams marked vs assigned

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (mobile/tablet-first) |
| Backend | PHP |
| Database | MySQL |
| Local dev environment | XAMPP (Apache + MySQL + PHP) |

## Project Status

The login, criteria, judge, team, assignment, and marking workflows use PHP APIs backed by MySQL.

## Getting Started

### Prerequisites
- [XAMPP](https://www.apachefriends.org/) (or any Apache + PHP + MySQL stack)
- A modern browser

### Setup
```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/innovation2k26-judging.git

# 2. Move the project into XAMPP's htdocs folder
#    e.g. C:\xampp\htdocs\innovation2k26-judging

# 3. Start Apache and MySQL from the XAMPP control panel

# 4. Create the database and import /database/schema.sql
#    Create a database named `innovation2k26` in phpMyAdmin, then import the schema.
#    Create a dedicated MySQL account for the app; do not use MySQL root.

# 5. Configure DATABASE_DSN, DATABASE_USER, and DATABASE_PASSWORD in Apache's
#    environment (for XAMPP, configure SetEnv in Apache config and restart it).
#    Example DSN: mysql:host=localhost;dbname=innovation2k26;charset=utf8mb4

# 6. Create the first administrator from a terminal in the project folder.
#    Set the same three DATABASE_* variables in this terminal first.
C:\xampp\php\php.exe database\create-admin.php

# 7. Open in browser
http://localhost/innovation2k26-judging
```

The bootstrap script asks for the administrator name, login ID, and password. No demo accounts or sample judging records are created. Add judges, teams, and criteria from the admin panel after signing in.

Apache's included `.htaccess` routes unknown project URLs to a branded 404 page. The admin and judge panels also show a retry option if their initial API request fails; make sure Apache's `mod_rewrite` module and `.htaccess` overrides are enabled.

For deployment, serve the site only over HTTPS, use a dedicated least-privilege database account, keep database credentials outside the web root, keep PHP/Apache/MySQL updated, and restrict access to the server and database. The application refuses to connect if database credentials are not explicitly configured. Never publish credentials or expose phpMyAdmin to the public internet.

## Project Structure
```
innovation2k26-judging/
├── index.php             # Redirects to login
├── admin/                # Admin panel
├── judge/                # Judge panel
├── includes/             # Database connection, session guards, and JSON APIs
├── database/
│   ├── create-admin.php  # One-time CLI administrator bootstrap
│   └── schema.sql
├── login.html
└── README.md
```

## Database Overview

| Table | Purpose |
|---|---|
| `users` | Admin and judge login credentials |
| `criteria` | Marking fields with max marks, tagged by category |
| `teams` | Team details (number, title, category, college, members) |
| `assignments` | Which judge is assigned to which team |
| `marks` | Marks a judge gave a team, per criterion |
| `mark_sheets` | Submitted marks and remarks for each assigned team |
| `settings` | Marking lock/unlock state |

## Roadmap

- [x] Frontend UI (admin + judge panels)
- [x] PHP + MySQL backend integration
- [x] Login/session system
- [x] Auto-calculated, category-wise results
- [x] Print and CSV result export
- [x] Marking lock
- [ ] CSV import for bulk team upload
- [ ] Certificate generation

## License

This project is built for academic use at College of Engineering, Phaltan. License to be decided.

## Author

Built as a college project for Innovation 2K26.
