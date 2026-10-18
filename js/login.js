(function () {
  "use strict";
  var form = document.getElementById("loginForm");
  var errEl = document.getElementById("errMsg");
  var pwInput = document.getElementById("password");
  var pwToggle = document.getElementById("pwToggle");
  var card = document.querySelector(".card");
  var submitBtn = document.getElementById("submitBtn");
  var roleHeading = document.getElementById("roleHeading");
  var btnLabel = document.getElementById("btnLabel");
  var roleInputs = form.querySelectorAll('input[name="role"]');

  function syncRole() {
    var role = form.querySelector('input[name="role"]:checked').value;
    var label = role === "admin" ? "Admin" : "Judge";
    roleHeading.textContent = label + " Login";
    btnLabel.textContent = "Log in as " + label;
  }
  roleInputs.forEach(function (r) {
    r.addEventListener("change", syncRole);
  });

  pwToggle.addEventListener("click", function () {
    var showing = pwInput.type === "text";
    pwInput.type = showing ? "password" : "text";
    pwToggle.setAttribute("aria-pressed", String(!showing));
    pwToggle.setAttribute(
      "aria-label",
      showing ? "Show password" : "Hide password",
    );
  });

  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.add("show");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var username = document.getElementById("username").value.trim();
    var password = pwInput.value;

    if (!username || !password) {
      showError("Enter your login ID and password.");
      return;
    }

    errEl.classList.remove("show");
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");

    var role = form.querySelector('input[name="role"]:checked').value;
    try {
      var response;
      try {
        response = await fetch("includes/login.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username, password: password, role: role }),
        });
      } catch (error) {
        throw new Error("Unable to connect to the server. Check your connection and try again.");
      }
      var result;
      try {
        result = await response.json();
      } catch (error) {
        throw new Error("The server returned an invalid response. Please try again.");
      }
      if (!response.ok) throw new Error(result.error || "Unable to log in.");
      if (!result.redirect) throw new Error("The server did not provide a login destination.");
      window.location.href = result.redirect;
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
      showError(error.message || "Unable to connect to the server.");
    }
  });
})();
