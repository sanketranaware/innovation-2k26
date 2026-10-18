(function () {
        "use strict";
        var $ = function (s) {
          return document.querySelector(s);
        };
        var esc = function (s) {
          return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return {
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            }[c];
          });
        };
        var CATS = ["Engineering", "Polytechnic"];

        var ic = {
          criteria:
            '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
          judges:
            '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
          eye:
            '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
          "eye-off":
            '<path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 13.42 13.42"/><path d="M9.88 5.08A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a17.49 17.49 0 0 1-4.29 5.54"/><path d="M6.61 6.61A17.52 17.52 0 0 0 2 12s3.5 7 10 7a10.57 10.57 0 0 0 5.39-1.61"/>',
          teams:
            '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
          assign:
            '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
          results:
            '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
          edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
          trash:
            '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
          plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
          down: '<polyline points="6 9 12 15 18 9"/>',
          check: '<polyline points="20 6 9 17 4 12"/>',
        };
        function svg(n, s) {
          s = s || 20;
          return (
            '<svg width="' +
            s +
            '" height="' +
            s +
            '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            ic[n] +
            "</svg>"
          );
        }

        var S = {
          criteria: [],
          judges: [],
          teams: [],
          assign: {},
          marks: {},
          markingLocked: false,
        };
        var csrfToken = "";

        var ui = {
          tab: "criteria",
          critCat: "Engineering",
          asJudge: null,
          asCat: "all",
          resCat: "Engineering",
          loadState: "loading",
          loadError: "",
        };

        async function api(url, options) {
          var response;
          var requestOptions = Object.assign({}, options || {});
          if (requestOptions.method && requestOptions.method.toUpperCase() !== "GET" && csrfToken) {
            requestOptions.headers = Object.assign({}, requestOptions.headers || {}, {
              "X-CSRF-Token": csrfToken,
            });
          }
          try {
            response = await fetch(url, requestOptions);
          } catch (error) {
            throw new Error("Unable to connect to the server. Check your connection and try again.");
          }
          if (response.status === 401 || response.status === 403) {
            window.location.href = "../login.html";
            return null;
          }
          var payload;
          try {
            payload = await response.json();
          } catch (error) {
            throw new Error("The server returned an invalid response. Please try again.");
          }
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw new Error("The server returned an invalid response. Please try again.");
          }
          if (!response.ok) throw new Error(payload.error || "Request failed.");
          return payload;
        }

        async function loadData() {
          var data = await api("../includes/admin-data.php");
          if (!data) return;
          csrfToken = data.csrfToken;
          S.criteria = data.criteria.map(function (c) {
            return { id: String(c.id), name: c.name, max: Number(c.max), category: c.category };
          });
          S.judges = data.judges.map(function (j) {
            return { id: String(j.id), name: j.name, username: j.username };
          });
          S.teams = data.teams.map(function (t) {
            return {
              id: String(t.id),
              no: t.no,
              title: t.title,
              category: t.category,
              college: t.college,
              members: t.members,
            };
          });
          S.assign = data.assignments || {};
          S.marks = data.marks || {};
          S.markingLocked = Boolean(data.markingLocked);
          if (!S.judges.some(function (j) { return j.id === ui.asJudge; })) {
            ui.asJudge = S.judges[0] ? S.judges[0].id : null;
          }
        }

        function jsonOptions(method, body) {
          return {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          };
        }

        async function logout() {
          try {
            await api("../includes/logout.php", { method: "POST" });
          } finally {
            window.location.href = "../login.html";
          }
        }

        /* ---------- shared helpers ---------- */
        function toast(msg, isError) {
          var t = $("#toast");
          t.textContent = msg;
          t.classList.toggle("toast--error", Boolean(isError));
          t.setAttribute("role", isError ? "alert" : "status");
          t.classList.add("show");
          clearTimeout(toast.h);
          toast.h = setTimeout(function () {
            t.classList.remove("show");
            t.setAttribute("role", "status");
          }, 3500);
        }
        function pageState(title, message, retry) {
          return (
            '<section class="page-state' +
            (retry ? " page-state--error" : "") +
            '" role="' +
            (retry ? "alert" : "status") +
            '"><h2>' +
            esc(title) +
            "</h2><p>" +
            esc(message) +
            "</p>" +
            (retry
              ? '<button class="btn primary" data-a="retry-load">Try again</button>'
              : "") +
            "</section>"
          );
        }
        function openSheet(html, focus) {
          var r = $("#sheetRoot");
          r.innerHTML =
            '<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">' +
            html +
            "</div></div>";
          if (focus) {
            var f = r.querySelector("input,textarea");
            if (f) f.focus();
          }
        }
        function closeSheet() {
          $("#sheetRoot").innerHTML = "";
        }
        function confirmSheet(title, text, kind, id, label) {
          openSheet(
            "<h2>" +
              esc(title) +
              '</h2><p class="sub">' +
              esc(text) +
              '</p><div class="btns"><button class="btn ghost" data-a="close-sheet">Cancel</button><button class="btn danger" data-a="do-delete" data-k="' +
              kind +
              '" data-id="' +
              esc(id || "") +
              '">' +
              esc(label) +
              "</button></div>",
          );
        }
        var catPill = function (c) {
          return (
            '<span class="pill ' +
            (c === "Engineering" ? "eng" : "pol") +
            '">' +
            esc(c) +
            "</span>"
          );
        };

        /* ---------- shell ---------- */
        var TABS = [
          ["criteria", "Criteria", "criteria"],
          ["judges", "Judges", "judges"],
          ["teams", "Teams", "teams"],
          ["assign", "Assign", "assign"],
          ["results", "Results", "results"],
        ];
        function render() {
          var pages = {
            criteria: pageCriteria,
            judges: pageJudges,
            teams: pageTeams,
            assign: pageAssign,
            results: pageResults,
          };
          var nav =
            '<nav class="nav">' +
            TABS.map(function (t) {
              return (
                '<button data-a="tab" data-t="' +
                t[0] +
                '"' +
                (ui.tab === t[0] ? ' aria-current="page"' : "") +
                '><span class="ico">' +
                svg(t[2]) +
                "</span>" +
                t[1] +
                "</button>"
              );
            }).join("") +
            "</nav>";
          var top =
            '<header class="topbar"><span class="seal"><img src="../assets/college-logo.png" alt="College of Engineering Phaltan crest"></span><div class="tb-text"><b>Innovation 2K26</b><span>Admin panel</span></div><button class="tb-btn" data-a="logout">Log out</button></header>';
          $("#app").innerHTML =
            top +
            nav +
            '<div class="shell"><main class="wrap">' +
            (ui.loadState === "loading"
              ? pageState("Loading admin data", "Please wait while the latest data is loaded.")
              : ui.loadState === "error"
                ? pageState("Could not load admin data", ui.loadError, true)
                : pages[ui.tab]()) +
            "</main></div>";
        }

        /* ================= CRITERIA ================= */
        function pageCriteria() {
          var list = S.criteria.filter(function (c) {
            return c.category === ui.critCat;
          });
          var rows = list
            .map(function (c) {
              return (
                '<div class="card row"><div style="flex:1"><b>' +
                esc(c.name) +
                '</b><div class="pill" style="margin-top:6px">Max ' +
                c.max +
                " marks</div></div>" +
                '<div class="acts"><button class="icon-btn" data-a="edit-crit" data-id="' +
                c.id +
                '">' +
                svg("edit") +
                "</button>" +
                '<button class="icon-btn danger" data-a="del-crit" data-id="' +
                c.id +
                '">' +
                svg("trash") +
                "</button></div></div>"
              );
            })
            .join("");
          return (
            '<div class="head"><div><h1>Criteria</h1><p>Separate marking fields for each category. Full marks per judge: ' +
            list.reduce(function (a, c) {
              return a + c.max;
            }, 0) +
            ".</p></div>" +
            '<div class="act"><button class="btn primary" data-a="add-crit">' +
            svg("plus", 17) +
            "Add</button></div></div>" +
            '<div class="seg">' +
            CATS.map(function (c) {
              return (
                '<button data-a="crit-cat" data-v="' +
                c +
                '" aria-pressed="' +
                (ui.critCat === c) +
                '">' +
                c +
                "</button>"
              );
            }).join("") +
            "</div>" +
            '<div class="list">' +
            (rows ||
              '<div class="empty"><b>No criteria yet for ' +
                ui.critCat +
                "</b>Add the fields judges will score this category on.</div>") +
            "</div>"
          );
        }
        function critForm(id) {
          var c = id
            ? S.criteria.find(function (x) {
                return x.id === id;
              })
            : null;
          openSheet(
            "<h2>" +
              (c ? "Edit criterion" : "Add criterion") +
              '</h2><p class="sub">For ' +
              esc(c ? c.category : ui.critCat) +
              ".</p>" +
              '<form data-form="crit" data-id="' +
              (c ? c.id : "") +
              '" data-cat="' +
              (c ? c.category : ui.critCat) +
              '">' +
              '<div class="field"><label for="cn">Name</label><input id="cn" name="name" value="' +
              esc(c ? c.name : "") +
              '" placeholder="e.g. Innovation"></div>' +
              '<div class="field"><label for="cm">Maximum marks</label><input id="cm" name="max" type="number" min="1" max="100" value="' +
              (c ? c.max : 10) +
              '"></div>' +
              '<p class="err" role="alert" aria-live="polite"></p><div class="btns"><button type="button" class="btn ghost" data-a="close-sheet">Cancel</button><button class="btn primary">' +
              (c ? "Save" : "Add") +
              "</button></div></form>",
            true,
          );
        }

        /* ================= JUDGES ================= */
        function pageJudges() {
          var rows = S.judges
            .map(function (j) {
              var n = (S.assign[j.id] || []).length;
              return (
                '<div class="card row"><div style="flex:1"><b>' +
                esc(j.name) +
                '</b><div class="pill" style="margin-top:6px">ID: ' +
                esc(j.username) +
                '</div> <span class="pill">' +
                n +
                " teams</span></div>" +
                '<div class="acts"><button class="icon-btn" data-a="edit-judge" data-id="' +
                j.id +
                '">' +
                svg("edit") +
                "</button>" +
                '<button class="icon-btn danger" data-a="del-judge" data-id="' +
                j.id +
                '">' +
                svg("trash") +
                "</button></div></div>"
              );
            })
            .join("");
          return (
            '<div class="head"><div><h1>Judges</h1><p>Create a login for each judge and share the ID and password with them.</p></div>' +
            '<div class="act"><button class="btn primary" data-a="add-judge">' +
            svg("plus", 17) +
            "Add</button></div></div>" +
            '<div class="list">' +
            (rows ||
              '<div class="empty"><b>No judges yet</b>Add a judge to give them a login.</div>') +
            "</div>"
          );
        }
        function judgeForm(id) {
          var j = id
            ? S.judges.find(function (x) {
                return x.id === id;
              })
            : null;
          openSheet(
            "<h2>" +
              (j ? "Edit judge" : "Add judge") +
              '</h2><p class="sub">The judge logs in with this ID and password.</p>' +
              '<form data-form="judge" data-id="' +
              (j ? j.id : "") +
              '">' +
              '<div class="field"><label for="jn">Full name</label><input id="jn" name="name" value="' +
              esc(j ? j.name : "") +
              '" placeholder="e.g. Sarah Johnson"></div>' +
              '<div class="field"><label for="ju">Login ID</label><input id="ju" name="username" value="' +
              esc(j ? j.username : "") +
              '" placeholder="e.g. judgesarah"></div>' +
              '<div class="field"><label for="jp">Password' +
              (j ? ' <span class="sub">Leave blank to keep the current password.</span>' : "") +
              '</label><div class="pw-row"><input id="jp" name="password" type="password" autocomplete="new-password" ' +
              (j ? 'placeholder="Leave blank to keep current password" minlength="12"' : 'placeholder="At least 12 characters" minlength="12" required') +
              '><button type="button" class="pw-toggle" data-a="toggle-judge-password" data-for="jp" aria-label="Show password" aria-pressed="false">' +
              svg("eye", 18) +
              '</button></div></div>' +
              '<p class="err" role="alert" aria-live="polite"></p><div class="btns"><button type="button" class="btn ghost" data-a="close-sheet">Cancel</button><button class="btn primary">' +
              (j ? "Save" : "Add") +
              "</button></div></form>",
            true,
          );
        }

        /* ================= TEAMS ================= */
        function pageTeams() {
          var rows = S.teams
            .map(function (t) {
              return (
                '<div class="card row"><div style="flex:1"><div class="pill ' +
                (t.category === "Engineering" ? "eng" : "pol") +
                '" style="margin-bottom:6px">' +
                esc(t.category) +
                "</div><b>" +
                esc(t.no) +
                " — " +
                esc(t.title) +
                '</b><div style="color:var(--muted);font-size:13px;margin-top:3px">' +
                esc(t.college) +
                "</div></div>" +
                '<div class="acts"><button class="icon-btn" data-a="edit-team" data-id="' +
                t.id +
                '">' +
                svg("edit") +
                "</button>" +
                '<button class="icon-btn danger" data-a="del-team" data-id="' +
                t.id +
                '">' +
                svg("trash") +
                "</button></div></div>"
              );
            })
            .join("");
          return (
            '<div class="head"><div><h1>Teams</h1><p>' +
            S.teams.length +
            " registered teams.</p></div>" +
            '<div class="act"><button class="btn primary" data-a="add-team">' +
            svg("plus", 17) +
            "Add</button></div></div>" +
            '<div class="list">' +
            (rows ||
              '<div class="empty"><b>No teams yet</b>Add the first team to get started.</div>') +
            "</div>"
          );
        }
        function teamForm(id) {
          var t = id
              ? S.teams.find(function (x) {
                  return x.id === id;
                })
              : null,
            cat = t ? t.category : "Engineering";
          openSheet(
            "<h2>" +
              (t ? "Edit team" : "Add team") +
              '</h2><p class="sub">1 to 4 members.</p>' +
              '<form data-form="team" data-id="' +
              (t ? t.id : "") +
              '">' +
              '<div class="field"><label for="tn">Team number</label><input id="tn" name="no" value="' +
              esc(t ? t.no : "") +
              '" placeholder="E017"></div>' +
              '<div class="field"><label for="tt">Project title</label><input id="tt" name="title" value="' +
              esc(t ? t.title : "") +
              '"></div>' +
              '<div class="field"><span>Category</span><div class="seg" style="margin-top:6px">' +
              CATS.map(function (c) {
                return (
                  '<label style="position:relative"><input type="radio" name="category" value="' +
                  c +
                  '" style="position:absolute;opacity:0;inset:0" ' +
                  (cat === c ? "checked" : "") +
                  '><span style="display:block;text-align:center;min-height:40px;line-height:40px;border-radius:9px;' +
                  (cat === c
                    ? "background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.14)"
                    : "") +
                  '">' +
                  c +
                  "</span></label>"
                );
              }).join("") +
              "</div></div>" +
              '<div class="field"><label for="tc">College</label><input id="tc" name="college" value="' +
              esc(t ? t.college : "") +
              '"></div>' +
              '<div class="field"><label for="tm">Members (one per line)</label><textarea id="tm" name="members">' +
              esc(t ? t.members.join("\n") : "") +
              "</textarea></div>" +
              '<p class="err" role="alert" aria-live="polite"></p><div class="btns"><button type="button" class="btn ghost" data-a="close-sheet">Cancel</button><button class="btn primary">' +
              (t ? "Save" : "Add") +
              "</button></div></form>",
            true,
          );
        }

        /* ================= ASSIGN ================= */
        function judgesByTeam() {
          var m = {};
          S.judges.forEach(function (j) {
            (S.assign[j.id] || []).forEach(function (t) {
              (m[t] || (m[t] = [])).push(j.id);
            });
          });
          return m;
        }
        function pageAssign() {
          if (!S.judges.length)
            return '<div class="head"><h1>Assign teams</h1></div><div class="empty"><b>Add judges first</b>You need at least one judge before assigning teams.</div>';
          var by = judgesByTeam();
          var chips = S.judges
            .map(function (j) {
              return (
                '<button class="chip" data-a="as-judge" data-v="' +
                j.id +
                '" aria-pressed="' +
                (ui.asJudge === j.id) +
                '">' +
                esc(j.name) +
                " (" +
                (S.assign[j.id] || []).length +
                ")</button>"
              );
            })
            .join("");
          var teams = S.teams.filter(function (t) {
            return ui.asCat === "all" || t.category === ui.asCat;
          });
          var rows = teams
            .map(function (t) {
              var js = by[t.id] || [],
                on = js.indexOf(ui.asJudge) > -1;
              return (
                '<button class="pick" role="checkbox" aria-checked="' +
                on +
                '" data-a="toggle-assign" data-id="' +
                t.id +
                '"><span class="box">' +
                svg("check", 16) +
                '</span><span style="flex:1;text-align:left"><span class="pill ' +
                (t.category === "Engineering" ? "eng" : "pol") +
                '" style="margin-right:6px">' +
                t.category +
                '</span><b style="font-size:14.5px">' +
                esc(t.no) +
                '</b><div style="font-size:13px;color:var(--muted)">' +
                esc(t.title) +
                "</div></span></button>"
              );
            })
            .join("");
          return (
            '<div class="head"><div><h1>Assign teams</h1><p>Pick a judge, then tick the teams they will mark.</p></div></div>' +
            '<div class="chips">' +
            chips +
            "</div>" +
            '<div class="seg" style="margin-top:10px">' +
            [
              ["all", "All"],
              ["Engineering", "Engineering"],
              ["Polytechnic", "Polytechnic"],
            ]
              .map(function (c) {
                return (
                  '<button data-a="as-cat" data-v="' +
                  c[0] +
                  '" aria-pressed="' +
                  (ui.asCat === c[0]) +
                  '">' +
                  c[1] +
                  "</button>"
                );
              })
              .join("") +
            "</div>" +
            '<div class="list">' +
            (rows ||
              '<div class="empty"><b>No teams</b>Add teams first.</div>') +
            "</div>"
          );
        }

        /* ================= RESULTS ================= */
        function maxTotal(cat) {
          return S.criteria
            .filter(function (c) {
              return c.category === cat;
            })
            .reduce(function (a, c) {
              return a + c.max;
            }, 0);
        }
        function results(cat) {
          var by = judgesByTeam(),
            rows = [];
          S.teams
            .filter(function (t) {
              return t.category === cat;
            })
            .forEach(function (t) {
              var js = by[t.id] || [],
                subs = [];
              js.forEach(function (jid) {
                var m = S.marks[jid + "|" + t.id];
                if (m)
                  subs.push(
                    Object.keys(m.scores).reduce(function (a, k) {
                      return a + m.scores[k];
                    }, 0),
                  );
              });
              if (subs.length)
                rows.push({
                  team: t,
                  score:
                    subs.reduce(function (a, b) {
                      return a + b;
                    }, 0) / subs.length,
                  n: subs.length,
                  of: js.length,
                });
            });
          rows.sort(function (a, b) {
            return b.score - a.score;
          });
          rows.forEach(function (r, i) {
            r.rank = i + 1;
          });
          return rows;
        }
        function pageResults() {
          var rows = results(ui.resCat),
            mt = maxTotal(ui.resCat);
          var seg =
            '<div class="seg">' +
            CATS.map(function (c) {
              return (
                '<button data-a="res-cat" data-v="' +
                c +
                '" aria-pressed="' +
                (ui.resCat === c) +
                '">' +
                c +
                "</button>"
              );
            }).join("") +
            "</div>";
          var body;
          if (!rows.length) {
            body =
              '<div class="empty"><b>No marks yet in ' +
              ui.resCat +
              "</b>Results appear as judges submit marks.</div>";
          } else {
            var win =
              '<div class="win">' +
              svg("results", 26) +
              '<div style="flex:1"><small>Winner, ' +
              ui.resCat +
              "</small><h3>" +
              esc(rows[0].team.title) +
              '</h3><span style="color:var(--pol);font-size:13px">' +
              esc(rows[0].team.no) +
              '</span></div><div class="sc"><b>' +
              rows[0].score.toFixed(1) +
              "</b><span>of " +
              mt +
              "</span></div></div>";
            var list = rows
              .map(function (r) {
                return (
                  '<details class="card rrow"><summary><span class="rk ' +
                  (r.rank === 1 ? "r1" : "") +
                  '">' +
                  r.rank +
                  '</span><span class="rmid"><b>' +
                  esc(r.team.title) +
                  "</b><small>" +
                  esc(r.team.no) +
                  ", " +
                  esc(r.team.college) +
                  '</small></span><span class="rsc"><b>' +
                  r.score.toFixed(1) +
                  "</b><small>of " +
                  mt +
                  '</small></span></summary><div class="rdetail">Judged by ' +
                  r.n +
                  " of " +
                  r.of +
                  " assigned judges. Marks are averaged across judges who submitted.</div></details>"
                );
              })
              .join("");
            body = win + list;
          }
          return (
            '<div class="head"><div><h1>Results</h1><p>Ranks update as marks are submitted. Multiple judges are averaged.</p></div>' +
            '<div class="act"><button class="btn ghost" data-a="toggle-lock" aria-pressed="' +
            S.markingLocked +
            '">' +
            (S.markingLocked ? "Unlock marking" : "Lock marking") +
            '</button><button class="btn ghost" data-a="refresh-results">Refresh</button><button class="btn ghost" data-a="export">Export CSV</button><button class="btn primary" data-a="print">Print</button></div></div>' +
            seg +
            '<div class="list">' +
            body +
            "</div>"
          );
        }

        function exportResults() {
          var rows = results(ui.resCat);
          var values = [[
            "Rank",
            "Team number",
            "Title",
            "Category",
            "College",
            "Average score",
            "Maximum score",
            "Judges submitted",
            "Judges assigned",
          ]];
          rows.forEach(function (row) {
            values.push([
              row.rank,
              row.team.no,
              row.team.title,
              row.team.category,
              row.team.college,
              row.score.toFixed(2),
              maxTotal(ui.resCat),
              row.n,
              row.of,
            ]);
          });
          var csv = values.map(function (row) {
            return row.map(function (value) {
              return '"' + String(value).replace(/"/g, '""') + '"';
            }).join(",");
          }).join("\r\n");
          var file = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
          var link = document.createElement("a");
          link.href = URL.createObjectURL(file);
          link.download = "results-" + ui.resCat.toLowerCase() + ".csv";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(function () {
            URL.revokeObjectURL(link.href);
          }, 1000);
        }

        /* ================= actions ================= */
        document.addEventListener("click", async function (e) {
          if (e.target.classList && e.target.classList.contains("overlay")) {
            closeSheet();
            return;
          }
          var el = e.target.closest("[data-a]");
          if (!el) return;
          var a = el.dataset.a,
            id = el.dataset.id,
            v = el.dataset.v;
          switch (a) {
            case "retry-load":
              ui.loadState = "loading";
              ui.loadError = "";
              render();
              try {
                await loadData();
                ui.loadState = "ready";
                render();
              } catch (error) {
                ui.loadState = "error";
                ui.loadError = error.message;
                render();
              }
              break;
            case "tab":
              ui.tab = el.dataset.t;
              closeSheet();
              if (ui.tab === "results") {
                try {
                  await loadData();
                } catch (error) {
                  toast(error.message, true);
                }
              }
              render();
              break;
            case "logout":
              logout();
              break;
            case "close-sheet":
              closeSheet();
              break;
            case "toggle-judge-password":
              var pwInput = document.getElementById(el.dataset.for || "jp");
              if (!pwInput) break;
              var showing = pwInput.type === "text";
              pwInput.type = showing ? "password" : "text";
              el.setAttribute("aria-pressed", String(!showing));
              el.setAttribute("aria-label", showing ? "Show password" : "Hide password");
              el.innerHTML = pwInput.type === "text" ? svg("eye-off", 18) : svg("eye", 18);
              pwInput.focus();
              break;
            case "crit-cat":
              ui.critCat = v;
              render();
              break;
            case "add-crit":
              critForm();
              break;
            case "edit-crit":
              critForm(id);
              break;
            case "del-crit":
              confirmSheet(
                "Delete this criterion?",
                "Marks already given for it will be removed.",
                "crit",
                id,
                "Delete",
              );
              break;
            case "add-judge":
              judgeForm();
              break;
            case "edit-judge":
              judgeForm(id);
              break;
            case "del-judge":
              confirmSheet(
                "Delete this judge?",
                "Their assignments and marks are removed too.",
                "judge",
                id,
                "Delete",
              );
              break;
            case "add-team":
              teamForm();
              break;
            case "edit-team":
              teamForm(id);
              break;
            case "del-team":
              confirmSheet(
                "Delete this team?",
                "Removed from every judge, marks deleted.",
                "team",
                id,
                "Delete",
              );
              break;
            case "as-judge":
              ui.asJudge = v;
              render();
              break;
            case "as-cat":
              ui.asCat = v;
              render();
              break;
            case "toggle-assign":
              try {
                var assigned = (S.assign[ui.asJudge] || []).indexOf(id) === -1;
                await api("../includes/admin-data.php", jsonOptions("POST", {
                  action: "set-assignment",
                  judge_id: ui.asJudge,
                  team_id: id,
                  assigned: assigned,
                }));
                await loadData();
                render();
              } catch (error) {
                toast(error.message, true);
              }
              break;
            case "res-cat":
              ui.resCat = v;
              render();
              break;
            case "print":
              try {
                await loadData();
                render();
                window.print();
              } catch (error) {
                toast(error.message, true);
              }
              break;
            case "refresh-results":
              try {
                await loadData();
                render();
              } catch (error) {
                toast(error.message, true);
              }
              break;
            case "export":
              try {
                await loadData();
                render();
                exportResults();
              } catch (error) {
                toast(error.message, true);
              }
              break;
            case "toggle-lock":
              try {
                await api("../includes/admin-data.php", jsonOptions("POST", {
                  action: "set-marking-lock",
                  locked: !S.markingLocked,
                }));
                await loadData();
                render();
                toast(S.markingLocked ? "Marking locked" : "Marking unlocked");
              } catch (error) {
                toast(error.message, true);
              }
              break;
            case "do-delete":
              doDelete(el.dataset.k, id);
              break;
          }
        });
        async function doDelete(kind, id) {
          try {
            var url = kind === "crit"
              ? "../includes/criteria.php"
              : "../includes/admin-data.php?resource=" + (kind === "judge" ? "judge" : "team") + "&id=" + encodeURIComponent(id);
            await api(url, kind === "crit" ? jsonOptions("DELETE", { id: id }) : { method: "DELETE" });
            await loadData();
            closeSheet();
            render();
            toast("Deleted");
          } catch (error) {
            toast(error.message, true);
          }
        }
        document.addEventListener("submit", async function (e) {
          var f = e.target.closest("[data-form]");
          if (!f) return;
          e.preventDefault();
          var fd = {};
          new FormData(f).forEach(function (val, k) {
            fd[k] = val;
          });
          var kind = f.dataset.form,
            id = f.dataset.id,
            errEl = f.querySelector(".err");
          var err = function (m) {
            errEl.textContent = m;
          };
          if (kind === "crit") {
            var name = (fd.name || "").trim(),
              max = Math.round(+fd.max),
              cat = f.dataset.cat;
            if (!name) return err("Enter a name.");
            if (!(max >= 1 && max <= 100))
              return err("Max marks must be 1 to 100.");
            try {
              await api("../includes/criteria.php", jsonOptions("POST", {
                id: id || undefined,
                name: name,
                max: max,
                category: cat,
              }));
            } catch (error) {
              return err(error.message);
            }
          }
          if (kind === "judge") {
            var name2 = (fd.name || "").trim(),
              un = (fd.username || "").trim(),
              pw = (fd.password || "").trim();
            if (!name2 || !un || (!id && !pw)) return err("Fill in all required fields.");
            if (pw && pw.length < 12) return err("Passwords must be at least 12 characters.");
            try {
              await api("../includes/admin-data.php", jsonOptions("POST", {
                action: "save-judge",
                id: id || undefined,
                name: name2,
                username: un,
                password: pw,
              }));
            } catch (error) {
              return err(error.message);
            }
          }
          if (kind === "team") {
            var no = (fd.no || "").trim().toUpperCase(),
              title = (fd.title || "").trim(),
              college = (fd.college || "").trim();
            var mem = (fd.members || "")
              .split("\n")
              .map(function (x) {
                return x.trim();
              })
              .filter(Boolean);
            if (!no || !title || !college)
              return err("Fill in team number, title and college.");
            if (mem.length < 1 || mem.length > 4)
              return err("Enter 1 to 4 members.");
            try {
              await api("../includes/admin-data.php", jsonOptions("POST", {
                action: "save-team",
                id: id || undefined,
                no: no,
                title: title,
                category: fd.category,
                college: college,
                members: mem,
              }));
            } catch (error) {
              return err(error.message);
            }
          }
          try {
            await loadData();
          } catch (error) {
            return err(error.message);
          }
          closeSheet();
          render();
          toast("Saved");
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape") closeSheet();
        });
        render();
        loadData()
          .then(function () {
            ui.loadState = "ready";
            render();
          })
          .catch(function (error) {
            ui.loadState = "error";
            ui.loadError = error.message;
            render();
          });
      })();