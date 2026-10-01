(function () {
  "use strict";

  var layer = document.querySelector(".ambient-background");
  if (
    !layer ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    return;
  }

  var currentX = window.innerWidth / 2;
  var currentY = window.innerHeight / 2;
  var targetX = currentX;
  var targetY = currentY;
  var currentStrength = 0.26;
  var targetStrength = currentStrength;
  var movingUntil = 0;
  var hovering = false;
  var frame = 0;
  var previousTime = 0;

  function requestFrame() {
    if (!frame) frame = window.requestAnimationFrame(animate);
  }

  function animate(now) {
    var delta = previousTime ? Math.min(now - previousTime, 48) : 16;
    previousTime = now;
    targetStrength = hovering ? 0.68 : now < movingUntil ? 0.54 : 0.26;

    var positionEase = 1 - Math.exp(-delta / 240);
    var lightEase = 1 - Math.exp(-delta / 280);
    currentX += (targetX - currentX) * positionEase;
    currentY += (targetY - currentY) * positionEase;
    currentStrength += (targetStrength - currentStrength) * lightEase;

    layer.style.setProperty("--spotlight-x", currentX.toFixed(2) + "px");
    layer.style.setProperty("--spotlight-y", currentY.toFixed(2) + "px");
    layer.style.setProperty("--spotlight-strength", currentStrength.toFixed(3));

    if (
      Math.abs(targetX - currentX) > 0.15 ||
      Math.abs(targetY - currentY) > 0.15 ||
      Math.abs(targetStrength - currentStrength) > 0.002 ||
      now < movingUntil
    ) {
      frame = window.requestAnimationFrame(animate);
    } else {
      frame = 0;
      previousTime = 0;
    }
  }

  document.addEventListener(
    "pointermove",
    function (event) {
      if (event.pointerType !== "mouse") return;
      targetX = event.clientX;
      targetY = event.clientY;
      hovering = Boolean(
        event.target.closest("a, button, input, select, textarea, [role='button']"),
      );
      movingUntil = performance.now() + 180;
      requestFrame();
    },
    { passive: true },
  );

  document.documentElement.addEventListener("pointerleave", function () {
    hovering = false;
    movingUntil = 0;
    requestFrame();
  });
})();