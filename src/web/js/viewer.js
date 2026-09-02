const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex) => {
  const normalized = String(hex || "#8ba7b3").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((item) => item + item).join("")
    : normalized.padEnd(6, "0");
  return {
    r: Number.parseInt(value.slice(0, 2), 16) || 0,
    g: Number.parseInt(value.slice(2, 4), 16) || 0,
    b: Number.parseInt(value.slice(4, 6), 16) || 0
  };
};

const colour = (hex, multiplier = 1, alpha = 1) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r * multiplier)}, ${Math.round(g * multiplier)}, ${Math.round(b * multiplier)}, ${alpha})`;
};

const rotateY = ([x, y, z], angle) => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [x * cosine + z * sine, y, -x * sine + z * cosine];
};

const rotateX = ([x, y, z], angle) => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [x, y * cosine - z * sine, y * sine + z * cosine];
};

const faceNormalZ = (points) => {
  const [a, b, c] = points;
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return ab[0] * ac[1] - ab[1] * ac[0];
};

/**
 * A dependency-free, procedural 3D product renderer.
 * It renders actual geometry in canvas (not a CSS rotation of a flat image),
 * so drag/keyboard navigation works from every side even without a vendor GLB.
 */
export class DroneViewer {
  constructor(canvas, { onAngleChange = () => {} } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.onAngleChange = onAngleChange;
    this.yaw = -0.22;
    this.pitch = -0.28;
    this.model = null;
    this.color = null;
    this.mode = "shell";
    this.scene = "day";
    this.weather = "sun";
    this.light = { x: .34, y: .24 };
    this.pointer = null;
    this.frame = 0;
    this.resizeObserver = new ResizeObserver(() => this.queueRender());
    this.resizeObserver.observe(canvas);
    this.bindControls();
    this.queueRender();
  }

  setProduct(model, color) {
    this.model = model;
    this.color = color || model?.colors?.[0] || null;
    this.queueRender();
  }

  setPresentation({ mode, scene, weather } = {}) {
    if (mode) this.mode = mode;
    if (scene) this.scene = scene;
    if (weather) this.weather = weather;
    this.queueRender();
  }

  rotate(delta) {
    this.yaw += delta;
    this.emitAngle();
    this.queueRender();
  }

  reset() {
    this.yaw = -0.22;
    this.pitch = -0.28;
    this.emitAngle();
    this.queueRender();
  }

  destroy() {
    this.resizeObserver.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pointer = null;
  }

  bindControls() {
    const canvas = this.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", "Интерактивная трёхмерная модель дрона. Перетаскивайте для поворота.");
    canvas.addEventListener("pointerdown", (event) => {
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: this.yaw, pitch: this.pitch };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
    });
    canvas.addEventListener("pointermove", (event) => {
      const pointer = this.pointer;
      const rect = canvas.getBoundingClientRect();
      this.light = {
        x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1),
        y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
      };
      if (!pointer || pointer.id !== event.pointerId) {
        this.queueRender();
        return;
      }
      this.yaw = pointer.yaw + (event.clientX - pointer.x) / Math.max(1, rect.width) * Math.PI * 1.65;
      this.pitch = clamp(pointer.pitch + (event.clientY - pointer.y) / Math.max(1, rect.height) * .9, -.72, .28);
      this.emitAngle();
      this.queueRender();
    });
    const release = (event) => {
      if (this.pointer?.id === event.pointerId) this.pointer = null;
      canvas.classList.remove("is-dragging");
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("keydown", (event) => {
      const directions = { ArrowLeft: -.16, ArrowRight: .16 };
      if (event.key === "Home") {
        event.preventDefault();
        this.reset();
      }
      if (directions[event.key]) {
        event.preventDefault();
        this.rotate(directions[event.key]);
      }
    });
  }

  emitAngle() {
    const degrees = ((this.yaw * 180 / Math.PI) % 360 + 360) % 360;
    this.onAngleChange(Math.round(degrees));
  }

  queueRender() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  }

  render() {
    const canvas = this.canvas;
    const context = this.context;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    const night = this.scene === "night";
    const background = context.createRadialGradient(
      rect.width * this.light.x, rect.height * this.light.y, 0,
      rect.width * .5, rect.height * .5, Math.max(rect.width, rect.height) * .78
    );
    background.addColorStop(0, night ? "#1c2d38" : "#d7e6e8");
    background.addColorStop(.38, night ? "#091116" : "#81969b");
    background.addColorStop(1, night ? "#020507" : "#172126");
    context.fillStyle = background;
    context.fillRect(0, 0, rect.width, rect.height);

    const floor = context.createLinearGradient(0, rect.height * .58, 0, rect.height);
    floor.addColorStop(0, night ? "rgba(2,7,9,0)" : "rgba(235,245,245,.06)");
    floor.addColorStop(1, night ? "#020406" : "#0a1115");
    context.fillStyle = floor;
    context.fillRect(0, rect.height * .5, rect.width, rect.height * .5);
    this.drawGround(context, rect.width, rect.height, night);
    this.drawDrone(context, rect.width, rect.height, night);
    this.drawWeather(context, rect.width, rect.height);
  }

  transform(point) {
    return rotateX(rotateY(point, this.yaw), this.pitch);
  }

  project(point, width, height) {
    const distance = 9;
    const scale = Math.min(width, height) * .68;
    const depth = distance - point[2];
    return [width / 2 + point[0] / depth * scale, height * .49 - point[1] / depth * scale, point[2]];
  }

  drawGround(context, width, height, night) {
    context.save();
    context.translate(width / 2, height * .79);
    context.scale(1, .25);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, width * .38);
    gradient.addColorStop(0, night ? "rgba(87,231,255,.23)" : "rgba(239,252,253,.5)");
    gradient.addColorStop(.47, night ? "rgba(27,96,108,.12)" : "rgba(55,74,80,.18)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, width * .38, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  drawDrone(context, width, height, night) {
    if (!this.model) return;
    const base = this.color?.hex || this.model.accent || "#82bff0";
    const accent = this.color?.ui || this.model.accent || "#9ae4ee";
    const xray = this.mode === "xray";
    const parts = [];
    const box = (center, size, fill, alpha = 1, label = "") => parts.push({ type: "box", center, size, fill, alpha, label });
    const arm = (x, z) => {
      box([x * .57, .04, z * .57], [Math.abs(x) * .77 + .34, .16, Math.abs(z) * .77 + .34], "#202a2f", xray ? .58 : 1);
      box([x, .12, z], [.32, .28, .32], "#0a1115", 1, "Motor");
    };

    // The body and four motor assemblies are independent geometry. In X-Ray
    // the shell becomes translucent and electronics remain directly visible.
    box([0, .08, 0], [1.25, .46, .95], base, xray ? .2 : 1, "Shell");
    box([0, .14, .06], [.72, .18, .54], colour(base, .63), xray ? .22 : .92, "Upper shell");
    arm(-1.52, -1.3); arm(1.52, -1.3); arm(-1.52, 1.3); arm(1.52, 1.3);
    box([0, -.26, .1], [.63, .18, .52], "#172026", xray ? .95 : .55, "Battery");
    box([0, .01, -.12], [.42, .13, .34], "#50d8ed", xray ? 1 : .35, "Flight controller");
    box([0, -.08, .57], [.34, .25, .18], "#151b20", 1, "Camera");
    box([0, .3, .08], [.25, .07, .18], "#9eb6c6", xray ? 1 : .4, "GPS");

    const faces = [];
    const drawBox = (item) => {
      const [cx, cy, cz] = item.center;
      const [sx, sy, sz] = item.size.map((value) => value / 2);
      const vertices = [
        [cx - sx, cy - sy, cz - sz], [cx + sx, cy - sy, cz - sz], [cx + sx, cy + sy, cz - sz], [cx - sx, cy + sy, cz - sz],
        [cx - sx, cy - sy, cz + sz], [cx + sx, cy - sy, cz + sz], [cx + sx, cy + sy, cz + sz], [cx - sx, cy + sy, cz + sz]
      ].map((point) => this.transform(point));
      const definitions = [[0,1,2,3],[1,5,6,2],[5,4,7,6],[4,0,3,7],[3,2,6,7],[4,5,1,0]];
      definitions.forEach((indexes) => {
        const points = indexes.map((index) => vertices[index]);
        if (faceNormalZ(points) >= 0) return;
        faces.push({
          points: points.map((point) => this.project(point, width, height)),
          depth: points.reduce((sum, point) => sum + point[2], 0) / points.length,
          fill: item.fill,
          alpha: item.alpha,
          label: item.label
        });
      });
    };
    parts.forEach(drawBox);
    faces.sort((a, b) => a.depth - b.depth);
    faces.forEach((face) => {
      context.save();
      context.globalAlpha = face.alpha;
      context.beginPath();
      face.points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.closePath();
      context.fillStyle = face.fill;
      context.fill();
      context.strokeStyle = night ? "rgba(189,243,248,.42)" : "rgba(240,252,253,.32)";
      context.lineWidth = 1;
      context.stroke();
      context.restore();
    });

    const motors = [[-1.52,-1.3],[1.52,-1.3],[-1.52,1.3],[1.52,1.3]];
    motors.forEach(([x, z], index) => this.drawRotor(context, this.project(this.transform([x, .34, z]), width, height), base, night, index));
    this.drawCamera(context, this.project(this.transform([0, -.18, .72]), width, height), accent, night);
    if (xray) this.drawXrayLabels(context, width, height, accent);
  }

  drawRotor(context, [x, y, depth], base, night, index) {
    const radius = Math.max(12, 38 + depth * 3);
    context.save();
    context.translate(x, y);
    context.rotate(this.yaw * .42 + index * .26);
    context.globalAlpha = .75;
    context.fillStyle = night ? "rgba(193,229,238,.38)" : "rgba(220,241,242,.58)";
    context.beginPath();
    context.ellipse(-radius * .55, 0, radius, radius * .15, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(radius * .55, 0, radius, radius * .15, 0, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = colour(base, .58);
    context.beginPath();
    context.arc(0, 0, Math.max(6, radius * .16), 0, Math.PI * 2);
    context.fill();
    if (night) {
      context.fillStyle = index % 2 ? "#ff544b" : "#4ff3e5";
      context.shadowBlur = 14;
      context.shadowColor = context.fillStyle;
      context.fillRect(-3, -3, 6, 6);
    }
    context.restore();
  }

  drawCamera(context, [x, y], accent, night) {
    context.save();
    context.translate(x, y);
    context.fillStyle = "#070c10";
    context.beginPath();
    context.arc(0, 0, 13, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = night ? "#36e9fc" : "#a4e9f1";
    context.globalAlpha = .72;
    context.beginPath();
    context.arc(-3, -3, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  drawXrayLabels(context, width, height, accent) {
    const labels = ["BATTERY", "FLIGHT CTRL", "GPS", "CAMERA"];
    context.save();
    context.font = "600 10px ui-monospace, SFMono-Regular, monospace";
    context.fillStyle = accent;
    context.strokeStyle = accent;
    context.globalAlpha = .88;
    labels.forEach((label, index) => {
      const y = height * (.26 + index * .065);
      context.beginPath();
      context.moveTo(width * .7, y);
      context.lineTo(width * .84, y);
      context.stroke();
      context.fillText(label, width * .72, y - 6);
    });
    context.restore();
  }

  drawWeather(context, width, height) {
    if (this.weather === "sun") return;
    context.save();
    const count = this.weather === "wind" ? 12 : 48;
    context.strokeStyle = this.weather === "snow" ? "rgba(255,255,255,.72)" : "rgba(161,215,238,.44)";
    context.lineWidth = this.weather === "snow" ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      const x = (index * 97 % width) + (index % 3) * 11;
      const y = (index * 47 % height);
      context.beginPath();
      if (this.weather === "wind") {
        context.moveTo(x, y);
        context.lineTo(x + 40, y - 8);
      } else if (this.weather === "snow") {
        context.arc(x, y, 1.6, 0, Math.PI * 2);
      } else {
        context.moveTo(x, y);
        context.lineTo(x - 5, y + 18);
      }
      context.stroke();
    }
    context.restore();
  }
}
