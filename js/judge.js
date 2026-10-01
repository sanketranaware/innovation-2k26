(function () {
        "use strict";
        var $ = function (s) {
          return document.querySelector(s);
        };
        var esc = function (s) {
          return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return {
              "&": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
              "&": "&amp;",
            }[c];
          });
        };
        var icBack = '<polyline points="15 18 9 12 15 6"/>';
        var icSearch =
          '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>';
        function svg(path, s) {
          s = s || 20;
          return (
            '<svg width="' +
            s +
            '" height="' +
            s +
            '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            path +
            "</svg>"
          );
        }

        var S = {
          judge: null,
          criteria: [],
          teams: [],
          marks: {},
          markingLocked: false,
        };

        var ui = {
          view: "list",
          marking: null,
          draft: null,
          q: "",
          filter: "all",
        };

        async function api(url, options) {
          var response = await fetch(url, options || {});
          if (response.status === 401 || response.status === 403) {
            window.location.href = "../login.html";
            return null;
          }
          var payload = await response.json();
          if (!response.ok) {
            var error = new Error(payload.error || "Request failed.");
            error.status = response.status;
            throw error;
          }
          return payload;
        }

        async function loadData() {
          var data = await api("../includes/judge-data.php");
          if (!data) return;
          S.judge = { id: String(data.judge.id), name: data.judge.name };
          S.teams = data.teams.map(function (team) {
            return {
              id: String(team.id),
              no: team.no,
              title: team.title,
              category: team.category,
              college: team.college,
              members: team.members,
            };
          });
          S.criteria = data.criteria.map(function (criterion) {
            return {
              id: String(criterion.id),
              name: criterion.name,
              max: Number(criterion.max),
              category: criterion.category,
            };
          });
          S.markingLocked = Boolean(data.markingLocked);
          S.marks = {};
          Object.keys(data.marks || {}).forEach(function (teamId) {
            S.marks[S.judge.id + "|" + teamId] = data.marks[teamId];
          });
        }

        async function logout() {
          try {
            await api("../includes/logout.php", { method: "POST" });
          } finally {
            window.location.href = "../login.html";
          }
        }

        function currentJudge() {
          return S.judge;
        }
        function myTeams() {
          return S.teams;
        }
        function maxTotal(cat) {
          return S.criteria
            .filter(function (c) {
              return c.category === cat;
            })
            .reduce(function (a, c) {
              return a + c.max;
            }, 0);
        }
        function critsFor(cat) {
          return S.criteria.filter(function (c) {
            return c.category === cat;
          });
        }
        function getMark(tid) {
          return S.marks[S.judge.id + "|" + tid];
        }
        function isDone(tid) {
          var m = getMark(tid),
            t = S.teams.find(function (x) {
              return x.id === tid;
            });
          if (!m || !t) return false;
          return critsFor(t.category).every(function (c) {
            return typeof m.scores[c.id] === "number";
          });
        }
        function totalOf(tid) {
          var m = getMark(tid);
          if (!m) return 0;
          return Object.keys(m.scores).reduce(function (a, k) {
            return a + m.scores[k];
          }, 0);
        }

        function toast(msg) {
          var t = $("#toast");
          t.textContent = msg;
          t.classList.add("show");
          clearTimeout(toast.h);
          toast.h = setTimeout(function () {
            t.classList.remove("show");
          }, 2200);
        }

        /* ---------- render ---------- */
        function render(top) {
          $("#app").innerHTML =
            ui.view === "marking" ? markingScreen() : listScreen();
          if (top) window.scrollTo(0, 0);
          if (ui.view === "marking") refreshTotal();
        }

        function listScreen() {
          var j = currentJudge(),
            mine = myTeams();
          var done = mine.filter(function (t) {
            return isDone(t.id);
          }).length;
          var pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
          var q = ui.q.trim().toLowerCase();
          var list = mine.filter(function (t) {
            var d = isDone(t.id);
            if (ui.filter === "pending" && d) return false;
            if (ui.filter === "done" && !d) return false;
            return (
              !q ||
              (t.no + " " + t.title + " " + t.college)
                .toLowerCase()
                .indexOf(q) > -1
            );
          });
          var top =
            '<header class="topbar"><span class="seal"><img src="../assets/college-logo.png" alt="College of Engineering Phaltan crest"></span><div class="tb-text"><b>' +
            esc(j.name) +
            '</b><span>Judge panel</span></div><button class="tb-btn" data-a="logout">Log out</button></header>';
          var cards = list.length
            ? list
                .map(function (t) {
                  var d = isDone(t.id);
                  return (
                    '<button class="tcard' +
                    (d ? " done" : "") +
                    '" data-a="open-marking" data-id="' +
                    t.id +
                    '">' +
                    '<span><span class="pill ' +
                    (t.category === "Engineering" ? "eng" : "pol") +
                    '" style="margin-right:6px">' +
                    t.category +
                    "</span><b>" +
                    esc(t.no) +
                    "</b></span>" +
                    '<span class="tt">' +
                    esc(t.title) +
                    '</span><span class="sub">' +
                    esc(t.college) +
                    "</span>" +
                    '<span class="foot">' +
                    (d
                      ? '<span class="pill ok">Marked, ' +
                        totalOf(t.id) +
                        " / " +
                        maxTotal(t.category) +
                        "</span>"
                      : '<span class="pill">Not marked</span>') +
                    "</span></button>"
                  );
                })
                .join("")
            : '<div class="empty"><b>No teams to show</b>' +
              (mine.length
                ? "Try a different search or filter."
                : "No teams assigned to you yet.") +
              "</div>";

          return (
            top +
            '<main class="wrap">' +
            '<div class="head"><h1>My Teams</h1><p>' +
            mine.length +
            " team" +
            (mine.length === 1 ? "" : "s") +
            " assigned to you." +
            (S.markingLocked ? " Marking is locked." : "") +
            "</p></div>" +
            '<div class="status"><div class="srow"><div><b>' +
            done +
            "</b> of " +
            mine.length +
            " done</div><span>" +
            pct +
            '%</span></div><div class="prog"><i style="width:' +
            pct +
            '%"></i></div></div>' +
            '<div class="tools"><div class="search">' +
            svg(icSearch, 18) +
            '<input id="qInput" value="' +
            esc(ui.q) +
            '" placeholder="Search by number, title or college"></div>' +
            '<div class="chips">' +
            [
              ["all", "All"],
              ["pending", "Not marked"],
              ["done", "Marked"],
            ]
              .map(function (f) {
                return (
                  '<button data-a="filter" data-v="' +
                  f[0] +
                  '" aria-pressed="' +
                  (ui.filter === f[0]) +
                  '">' +
                  f[1] +
                  "</button>"
                );
              })
              .join("") +
            "</div></div>" +
            '<div class="list">' +
            cards +
            "</div></main>"
          );
        }

        function markingScreen() {
          var t = S.teams.find(function (x) {
            return x.id === ui.marking;
          });
          if (!t) {
            ui.view = "list";
            return listScreen();
          }
          var mt = maxTotal(t.category);
          var crits = critsFor(t.category)
            .map(function (c) {
              var v = ui.draft.scores[c.id];
              var buttons = Array.apply(null, { length: c.max + 1 })
                .map(function (_, i) {
                  return (
                    '<button type="button" class="mk' +
                    (v === i ? " on" : "") +
                    '" data-a="set-score" data-c="' +
                    c.id +
                    '" data-v="' +
                    i +
                    '"' +
                    (S.markingLocked ? " disabled" : "") +
                    '>' +
                    i +
                    "</button>"
                  );
                })
                .join("");
              return (
                '<section class="crit" data-crit="' +
                c.id +
                '"><div class="crit-h"><h3>' +
                esc(c.name) +
                '</h3><span class="of"><b class="cv">' +
                (typeof v === "number" ? v : "–") +
                "</b> / " +
                c.max +
                "</span></div>" +
                '<div class="chipgrid" style="--n:' +
                (c.max + 1) +
                '">' +
                buttons +
                "</div></section>"
              );
            })
            .join("");

          return (
            '<header class="topbar"><button class="icon-btn" data-a="close-marking">' +
            svg(icBack, 20) +
            '</button><div class="tb-text"><b>' +
            esc(t.no) +
            "</b><span>Marking sheet</span></div></header>" +
            '<main class="wrap mwrap"><div class="info"><span class="pill ' +
            (t.category === "Engineering" ? "eng" : "pol") +
            '">' +
            t.category +
            "</span><h1>" +
            esc(t.title) +
            '</h1><p class="sub">' +
            esc(t.college) +
            '</p><p class="sub" style="margin-top:6px">Members: ' +
            esc(t.members.join(", ")) +
            "</p></div>" +
            crits +
            '<div class="field"><label for="rem">Remarks (optional)</label><textarea id="rem" placeholder="Anything the admin should know about this team"' +
            (S.markingLocked ? " readonly" : "") +
            ">" +
            esc(ui.draft.remarks) +
            "</textarea></div>" +
            '</main><div class="actionbar"><div class="in"><div class="tot"><span>Total</span><b id="tot">0</b></div><button class="btn primary" id="saveBtn" data-a="save-marks">Save marks</button></div></div>'
          );
        }

        function refreshTotal() {
          var t = S.teams.find(function (x) {
              return x.id === ui.marking;
            }),
            crits = critsFor(t.category);
          var filled = crits.filter(function (c) {
            return typeof ui.draft.scores[c.id] === "number";
          });
          var tot = filled.reduce(function (a, c) {
              return a + ui.draft.scores[c.id];
            }, 0),
            left = crits.length - filled.length;
          var tEl = $("#tot");
          if (tEl) tEl.textContent = tot;
          var b = $("#saveBtn");
          if (b) {
            b.disabled = left > 0 || S.markingLocked;
            b.textContent = S.markingLocked
              ? "Marking locked"
              : left > 0
                ? left + " left to mark"
                : "Save marks";
          }
        }
        function refreshCrit(cid) {
          var v = ui.draft.scores[cid],
            sec = document.querySelector('[data-crit="' + cid + '"]');
          if (!sec) return;
          sec.querySelector(".cv").textContent =
            typeof v === "number" ? v : "–";
          sec.querySelectorAll(".mk").forEach(function (b) {
            b.classList.toggle("on", +b.dataset.v === v);
          });
          refreshTotal();
        }

        function openMarking(tid) {
          var m = getMark(tid);
          ui.marking = tid;
          ui.draft = {
            scores: Object.assign({}, m ? m.scores : {}),
            remarks: m ? m.remarks || "" : "",
          };
          ui.view = "marking";
          render(true);
        }

        document.addEventListener("click", async function (e) {
          var el = e.target.closest("[data-a]");
          if (!el) return;
          var a = el.dataset.a,
            id = el.dataset.id,
            v = el.dataset.v;
          switch (a) {
            case "logout":
              logout();
              break;
            case "filter":
              ui.filter = v;
              render();
              break;
            case "open-marking":
              openMarking(id);
              break;
            case "close-marking":
              ui.view = "list";
              ui.marking = null;
              ui.draft = null;
              render(true);
              break;
            case "set-score":
              ui.draft.scores[el.dataset.c] = +v;
              refreshCrit(el.dataset.c);
              break;
            case "save-marks":
              var t = S.teams.find(function (x) {
                return x.id === ui.marking;
              });
              if (
                !critsFor(t.category).every(function (c) {
                  return typeof ui.draft.scores[c.id] === "number";
                })
              )
                break;
              try {
                var response = await api("../includes/judge-data.php", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    team_id: ui.marking,
                    scores: ui.draft.scores,
                    remarks: (ui.draft.remarks || "").trim(),
                  }),
                });
                if (!response) break;
                await loadData();
                ui.view = "list";
                ui.marking = null;
                ui.draft = null;
                render(true);
                toast("Marks saved for " + t.no);
              } catch (error) {
                if (error.status === 423) {
                  await loadData();
                  render();
                }
                toast(error.message);
              }
              break;
          }
        });
        document.addEventListener("input", function (e) {
          if (e.target.id === "qInput") {
            ui.q = e.target.value;
            render();
          }
          if (e.target.id === "rem" && ui.draft) {
            ui.draft.remarks = e.target.value;
          }
        });
        $("#app").innerHTML = '<main class="wrap"><p>Loading assigned teams...</p></main>';
        loadData()
          .then(render)
          .catch(function (error) {
            toast(error.message);
          });
      })();