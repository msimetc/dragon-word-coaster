"use strict";

(() => {
  const host = document.querySelector("#rideScene");
  const canvas = document.querySelector("#motionCanvas");
  if (!host || !canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  let width = 1, height = 1, phase = 0, smoothSpeed = 32, last = performance.now();

  function resize() {
    const rect = host.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.6);
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function modeValue() {
    if (host.classList.contains("uphill")) return 1;
    if (host.classList.contains("downhill")) return -1;
    return 0;
  }

  function point(depth, side, mode) {
    const p = Math.pow(depth, 1.72);
    const horizon = mode > 0 ? height * .18 : mode < 0 ? height * .43 : height * .34;
    const bend = Math.sin(phase * .42 + depth * 3.2) * width * .035 + Math.sin(phase * .17) * width * .025;
    const center = width * .5 + bend * (1 - p) + Math.sin(phase * .08) * width * .012;
    const half = width * (.01 + p * .18);
    const pitch = mode > 0 ? -Math.sin(depth * Math.PI) * height * .09 : mode < 0 ? Math.sin(depth * Math.PI) * height * .075 : 0;
    return { x: center + half * side, y: horizon + p * (height - horizon) + pitch, p };
  }

  function strokeRail(side, mode) {
    const gradient = ctx.createLinearGradient(0, height * .25, 0, height);
    gradient.addColorStop(0, "rgba(124,238,246,.22)"); gradient.addColorStop(.58, "rgba(184,255,250,.78)"); gradient.addColorStop(1, "rgba(255,239,167,.96)");
    ctx.beginPath();
    for (let i = 0; i <= 70; i++) {
      const q = point(i / 70, side, mode);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    ctx.lineWidth = Math.max(1.2, width * .0034); ctx.strokeStyle = "rgba(0,12,27,.42)"; ctx.stroke();
    ctx.lineWidth = Math.max(.8, width * .00145); ctx.globalAlpha = .56; ctx.strokeStyle = gradient; ctx.stroke(); ctx.globalAlpha = 1;
  }

  function drawSleepers(mode) {
    const spacing = .062;
    for (let i = 0; i < 22; i++) {
      const d = (i * spacing + phase % spacing) % 1;
      if (d < .02) continue;
      const left = point(d, -1.18, mode), right = point(d, 1.18, mode);
      ctx.beginPath(); ctx.moveTo(left.x, left.y); ctx.lineTo(right.x, right.y);
      ctx.lineWidth = 1 + left.p * 5; ctx.strokeStyle = `rgba(151,222,226,${.12 + left.p * .46})`; ctx.stroke();
    }
  }

  function drawPassingLights(mode) {
    for (let i = 0; i < 9; i++) {
      const d = (i / 9 + phase * .38) % 1;
      if (d < .08) continue;
      for (const side of [-1, 1]) {
        const base = point(d, side * 1.72, mode);
        const post = 8 + base.p * 74;
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(base.x, base.y - post);
        ctx.lineWidth = 1 + base.p * 2.5; ctx.strokeStyle = `rgba(152,228,225,${.1 + base.p * .5})`; ctx.stroke();
        ctx.beginPath(); ctx.arc(base.x, base.y - post, 1.5 + base.p * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,187,70,${.22 + base.p * .75})`; ctx.shadowBlur = 7 + base.p * 15; ctx.shadowColor = "#ffab3c"; ctx.fill(); ctx.shadowBlur = 0;
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const requested = Number(document.querySelector("#speedGaugeValue")?.textContent || 32);
    smoothSpeed += (requested - smoothSpeed) * Math.min(1, dt * 3.8);
    phase += dt * (.13 + smoothSpeed / 82);
    const mode = modeValue();
    ctx.clearRect(0, 0, width, height);
    ctx.save(); ctx.globalCompositeOperation = "screen";
    drawPassingLights(mode); drawSleepers(mode); strokeRail(-1, mode); strokeRail(1, mode);
    ctx.restore();
  }

  new ResizeObserver(resize).observe(host); resize(); requestAnimationFrame(frame);
})();
