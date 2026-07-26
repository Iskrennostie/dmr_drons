(() => {
  const core = window.MDR_COCKPIT_CORE;
  if (!core) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const missions = new Set(["inspection"]);
  const compared = new Set();
  let configuration = window.MDR_ACTIVE_CONFIGURATION || core.defaultConfiguration();
  let diagnosticsGeneration = 0;
  let soundEnabled = false;
  let audioContext = null;
  let screenBuilders = {};
  const flight = { x: 50, y: 56, heading: 0, altitude: 0, speed: 0, battery: 98, camera: "4K" };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));

  const percentRow = (label, value) => `
    <div class="cockpit-metric">
      <span>${label}</span><b>${value}%</b>
      <i><em style="--metric:${value}%"></em></i>
    </div>`;

  const compactMetrics = (metrics) => `
    ${percentRow("Высота полёта", metrics.altitude)}
    ${percentRow("Автономность", metrics.autonomy)}
    ${percentRow("Грузоподъёмность", metrics.payload)}
    ${percentRow("Дальность", metrics.range)}
    <div class="cockpit-signals">
      <span><small>Температура</small><b>${metrics.temp}°C</b></span>
      <span><small>GPS</small><b>${metrics.gps} спутников</b></span>
      <span><small>Связь</small><b class="is-online">${metrics.link}</b></span>
    </div>`;

  const cockpitMarkup = () => `
    <button class="cockpit-launch" type="button" data-cockpit-open aria-label="Открыть MDR Digital Cockpit">
      <i></i><span>MDR COCKPIT</span><b>ONLINE</b>
    </button>
    <dialog class="cockpit-dialog" id="mdr-cockpit">
      <div class="cockpit-shell">
        <header class="cockpit-header">
          <div><small>MDR / DIGITAL ECOSYSTEM</small><h2>Digital Cockpit</h2></div>
          <div class="cockpit-header__status"><i></i><span data-cockpit-model></span><b>ONLINE</b></div>
          <button type="button" data-cockpit-close aria-label="Закрыть Digital Cockpit">×</button>
        </header>
        <nav class="cockpit-tabs" aria-label="Разделы Digital Cockpit">
          <button class="is-active" type="button" data-cockpit-tab="live">Live</button>
          <button type="button" data-cockpit-tab="diagnostics">Диагностика</button>
          <button type="button" data-cockpit-tab="flight">Полёт</button>
          <button type="button" data-cockpit-tab="mission">Миссия</button>
          <button type="button" data-cockpit-tab="compare">Сравнение</button>
          <button type="button" data-cockpit-tab="garage">Ангар</button>
          <button type="button" data-cockpit-tab="share">Share / AR</button>
        </nav>
        <div class="cockpit-content">
          <section class="cockpit-screen is-active" data-cockpit-screen="live"></section>
          <section class="cockpit-screen" data-cockpit-screen="diagnostics"></section>
          <section class="cockpit-screen" data-cockpit-screen="flight"></section>
          <section class="cockpit-screen" data-cockpit-screen="mission"></section>
          <section class="cockpit-screen" data-cockpit-screen="compare"></section>
          <section class="cockpit-screen" data-cockpit-screen="garage"></section>
          <section class="cockpit-screen" data-cockpit-screen="share"></section>
        </div>
      </div>
    </dialog>`;

  document.body.insertAdjacentHTML("beforeend", cockpitMarkup());
  const dialog = document.querySelector("#mdr-cockpit");
  const launch = document.querySelector("[data-cockpit-open]");

  const activeScreen = (id) => dialog.querySelector(`[data-cockpit-screen="${id}"]`);
  const setScreen = (id) => {
    screenBuilders[id]?.();
    dialog.querySelectorAll("[data-cockpit-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.cockpitTab === id));
    dialog.querySelectorAll("[data-cockpit-screen]").forEach((screen) => screen.classList.toggle("is-active", screen.dataset.cockpitScreen === id));
  };

  const buildLive = () => {
    const metrics = core.metricsFor(configuration);
    const fit = core.fitFor(configuration, [...missions]);
    activeScreen("live").innerHTML = `
      <div class="cockpit-grid cockpit-grid--live">
        <article class="cockpit-card cockpit-card--drone">
          <small>LIVE CONFIGURATION</small>
          <h3>${configuration.model.name}</h3>
          <div class="cockpit-drone-visual" data-cockpit-light>
            <span></span>
            <img src="${configuration.model.image}" alt="${configuration.model.imageAlt}" style="--drone-filter:${configuration.color.filter}">
          </div>
          <p>${configuration.color.name} · ${configuration.pack.name}</p>
        </article>
        <article class="cockpit-card cockpit-card--metrics">
          <small>TELEMETRY</small>
          <div data-cockpit-metrics>${compactMetrics(metrics)}</div>
        </article>
        <article class="cockpit-card cockpit-card--score">
          <small>MDR ASSIST</small>
          <strong>${fit}%</strong>
          <h3>Готовность к миссии</h3>
          <p>${fit > 93 ? "Конфигурация полностью согласована с выбранной задачей." : "Проверьте рекомендации — они увеличат точность и автономность."}</p>
          <button type="button" data-cockpit-tab-jump="mission">Улучшить конфигурацию ↗</button>
        </article>
      </div>
      <div class="cockpit-timeline" data-cockpit-timeline></div>`;
    renderTimeline();
  };

  const buildDiagnostics = () => {
    activeScreen("diagnostics").innerHTML = `
      <div class="cockpit-grid cockpit-grid--diagnostics">
        <article class="cockpit-card cockpit-boot">
          <small>DIGITAL TWIN / SYSTEM BOOT</small>
          <h3>Проверка готовности</h3>
          <div class="cockpit-boot__progress"><i data-diagnostics-progress></i></div>
          <ol data-diagnostics-log><li>Нажмите запуск, чтобы проверить цифровой двойник.</li></ol>
          <div class="cockpit-actions">
            <button class="cockpit-primary" type="button" data-run-diagnostics>Запустить диагностику</button>
            <button type="button" data-sound-toggle>Звук: выключен</button>
          </div>
        </article>
        <article class="cockpit-card cockpit-digital-twin">
          <small>DIGITAL TWIN</small>
          <div class="cockpit-twin-orbit"><img src="${configuration.model.image}" alt="" style="--drone-filter:${configuration.color.filter}"><i></i><i></i><i></i></div>
          <p data-diagnostics-result>MISSION STATUS / STANDBY</p>
        </article>
      </div>`;
  };

  const buildFlight = () => {
    activeScreen("flight").innerHTML = `
      <div class="cockpit-flight">
        <div class="flight-map">
          <div class="flight-map__grid"></div>
          <span class="flight-home">H</span>
          <div class="flight-drone" data-flight-drone><img src="${configuration.model.image}" alt=""></div>
          <div class="flight-camera" data-flight-camera>CAM / 4K</div>
        </div>
        <aside class="flight-panel">
          <small>FLIGHT SIMULATOR</small><h3>Тестовый полёт</h3>
          <div class="flight-readout">
            <span><small>Высота</small><b data-flight-altitude>0 м</b></span>
            <span><small>Скорость</small><b data-flight-speed>0 км/ч</b></span>
            <span><small>Заряд</small><b data-flight-battery>98%</b></span>
            <span><small>Камера</small><b data-flight-camera-name>4K</b></span>
          </div>
          <div class="flight-pad">
            <button type="button" data-flight="up">↑</button>
            <button type="button" data-flight="left">↶</button>
            <button type="button" data-flight="forward">●</button>
            <button type="button" data-flight="right">↷</button>
            <button type="button" data-flight="down">↓</button>
          </div>
          <div class="cockpit-actions">
            <button class="cockpit-primary" type="button" data-flight="takeoff">Взлёт</button>
            <button type="button" data-flight="camera">Сменить камеру</button>
            <button type="button" data-flight="land">Посадка</button>
          </div>
          <p class="cockpit-note">Демонстрационный симулятор: показывает управление и телеметрию, не является системой подготовки пилотов.</p>
        </aside>
      </div>`;
    renderFlight();
  };

  const missionOptions = [
    ["mapping", "Картография"],
    ["rescue", "Спасательная операция"],
    ["delivery", "Доставка"],
    ["filming", "Съёмка"],
    ["inspection", "Инспекция"]
  ];

  const buildMission = () => {
    const recommendation = core.recommendMission([...missions]);
    activeScreen("mission").innerHTML = `
      <div class="cockpit-grid cockpit-grid--mission">
        <article class="cockpit-card">
          <small>MISSION PLANNER</small><h3>Что должен делать дрон?</h3>
          <div class="mission-options">
            ${missionOptions.map(([id, label]) => `<label><input type="checkbox" value="${id}" data-mission ${missions.has(id) ? "checked" : ""}><span>${label}</span></label>`).join("")}
          </div>
        </article>
        <article class="cockpit-card mission-result" data-mission-result>
          ${missionResultMarkup(recommendation)}
        </article>
        <article class="cockpit-card cockpit-ai" data-ai-result></article>
      </div>`;
    renderAi();
  };

  const missionResultMarkup = ({ id, model }) => `
    <small>ЛУЧШЕЕ СООТВЕТСТВИЕ</small>
    <h3>${model.name}</h3>
    <img src="${model.image}" alt="${model.imageAlt}">
    <p>${model.tagline} Профиль платформы лучше всего соответствует выбранному набору миссий.</p>
    <button class="cockpit-primary" type="button" data-apply-model="${id}">Выбрать эту модель</button>`;

  const buildCompare = () => {
    if (!compared.size) {
      const index = Math.max(0, core.order.indexOf(configuration.id));
      [configuration.id, core.order[(index + 1) % core.order.length], core.order[(index + 2) % core.order.length]].forEach((id) => compared.add(id));
    }
    activeScreen("compare").innerHTML = `
      <div class="compare-head"><div><small>DRONE COMPARISON</small><h3>Сравнение как у премиальных брендов.</h3></div><p>Выберите до трёх моделей.</p></div>
      <div class="compare-picker">
        ${core.order.map((id) => `<label style="--compare-accent:${core.products[id].accent}"><input type="checkbox" data-compare value="${id}" ${compared.has(id) ? "checked" : ""}><span>${core.products[id].name}</span></label>`).join("")}
      </div>
      <p class="compare-message" data-compare-message></p>
      <div class="compare-table-wrap" data-compare-table></div>`;
    renderComparison();
  };

  const buildGarage = () => {
    const entries = core.loadGarage();
    const preview = {
      orderId: "PREVIEW",
      productId: configuration.id,
      productName: configuration.model.name,
      colorName: configuration.color.name,
      image: configuration.model.image,
      battery: 84,
      firmware: "1.2",
      status: "DEMO ONLINE"
    };
    const cards = entries.length ? entries : [preview];
    activeScreen("garage").innerHTML = `
      <div class="garage-head"><div><small>DRONE GARAGE</small><h3>Мой ангар</h3></div><p>${entries.length ? "Сохранённые на этом устройстве заявки." : "Демонстрационный ангар до первой заявки."}</p></div>
      <div class="garage-grid">
        ${cards.map((item) => `<article style="--garage-accent:${core.products[item.productId]?.accent || "#92a7ff"}">
          <small>${item.orderId === "PREVIEW" ? "DEMO UNIT" : `ЗАЯВКА №${escapeHtml(item.orderId)}`}</small>
          <img src="${item.image || core.products[item.productId]?.image}" alt="">
          <h4>${escapeHtml(item.productName)}</h4><p>${escapeHtml(item.colorName)}</p>
          <div><span>${escapeHtml(item.status)}</span><b>Battery ${escapeHtml(item.battery)}%</b><b>Firmware ${escapeHtml(item.firmware)}</b></div>
        </article>`).join("")}
      </div>`;
  };

  const buildShare = () => {
    const configUrl = core.configurationUrl(configuration);
    const mobileArUrl = core.arUrl(configuration);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&margin=12&data=${encodeURIComponent(mobileArUrl)}`;
    activeScreen("share").innerHTML = `
      <div class="cockpit-grid cockpit-grid--share">
        <article class="cockpit-card">
          <small>CONFIG SHARE</small><h3>Поделиться сборкой</h3>
          <p>Ссылка сохраняет модель, цвет, комплект и дополнительные модули.</p>
          <input data-share-url readonly value="${escapeHtml(configUrl)}">
          <div class="cockpit-actions"><button class="cockpit-primary" type="button" data-copy-config>Скопировать ссылку</button><button type="button" data-native-share>Поделиться</button></div>
          <output data-share-status></output>
        </article>
        <article class="cockpit-card cockpit-ar">
          <small>AR MODE / MOBILE</small><h3>Поставьте MDR на пол</h3>
          <img src="${qr}" alt="QR-код для открытия MDR AR" referrerpolicy="no-referrer">
          <p>Отсканируйте код телефоном и разрешите доступ к камере.</p>
          <a class="cockpit-primary" href="${mobileArUrl}">Открыть AR на этом устройстве ↗</a>
        </article>
      </div>`;
  };

  const renderTimeline = () => {
    const root = dialog.querySelector("[data-cockpit-timeline]");
    if (!root) return;
    const ordered = core.loadGarage().some((item) => item.productId === configuration.id);
    const stages = ordered
      ? [["Проектирование", 100], ["Производство", 42], ["Тестирование", 8], ["Готов к отправке", 0]]
      : [["Проектирование", 100], ["Производство", 26], ["Тестирование", 0], ["Готов к отправке", 0]];
    root.innerHTML = `<div><small>DRONE TIMELINE</small><p>Демонстрационный прогноз этапов</p></div>${stages.map(([label, value]) => `<span><b>${label}</b><i><em style="--metric:${value}%"></em></i><small>${value}%</small></span>`).join("")}`;
  };

  const renderAi = () => {
    const root = dialog.querySelector("[data-ai-result]");
    if (!root) return;
    const fit = core.fitFor(configuration, [...missions]);
    const extraIds = new Set(configuration.extras.map((item) => item.id));
    const available = new Set(configuration.model.extras.map((item) => item.id));
    const suggestions = [];
    if (available.has("rtk") && !extraIds.has("rtk")) suggestions.push(["rtk", "Добавьте RTK — точность вырастет до 27%."]);
    if (available.has("battery") && !extraIds.has("battery")) suggestions.push(["battery", "Energy Reserve добавит до 18 минут автономности."]);
    if (available.has("thermal") && !extraIds.has("thermal")) suggestions.push(["thermal", "Thermal Vision расширит ночную и поисковую миссию."]);
    root.innerHTML = `<small>AI RECOMMENDATION</small><strong>${fit}%</strong><h3>Совместимость конфигурации</h3>
      ${suggestions.length ? suggestions.slice(0, 2).map(([id, text]) => `<p>${text}</p><button type="button" data-add-extra="${id}">Добавить модуль ↗</button>`).join("") : "<p>Активная конфигурация сбалансирована. Критичных рекомендаций нет.</p>"}`;
  };

  const renderComparison = () => {
    const root = dialog.querySelector("[data-compare-table]");
    if (!root) return;
    const ids = [...compared];
    const rows = [
      ["Автономность", "autonomy", "%"],
      ["Грузоподъёмность", "payload", "%"],
      ["Дальность", "range", "%"],
      ["Точность", "accuracy", "%"],
      ["GPS", "gps", " спутников"],
      ["Масса", "weight", " кг"]
    ];
    root.innerHTML = `<table><thead><tr><th>Параметр</th>${ids.map((id) => `<th style="--compare-accent:${core.products[id].accent}"><img src="${core.products[id].image}" alt=""><b>${core.products[id].name}</b><small>${core.products[id].priceLabel}</small></th>`).join("")}</tr></thead>
      <tbody>${rows.map(([label, key, suffix]) => `<tr><th>${label}</th>${ids.map((id) => `<td>${core.profiles[id][key]}${suffix}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  };

  const renderFlight = () => {
    const drone = dialog.querySelector("[data-flight-drone]");
    if (!drone) return;
    drone.style.setProperty("--flight-x", `${flight.x}%`);
    drone.style.setProperty("--flight-y", `${flight.y}%`);
    drone.style.setProperty("--flight-heading", `${flight.heading}deg`);
    dialog.querySelector("[data-flight-altitude]").textContent = `${Math.round(flight.altitude)} м`;
    dialog.querySelector("[data-flight-speed]").textContent = `${Math.round(flight.speed)} км/ч`;
    dialog.querySelector("[data-flight-battery]").textContent = `${Math.round(flight.battery)}%`;
    dialog.querySelector("[data-flight-camera-name]").textContent = flight.camera;
    dialog.querySelector("[data-flight-camera]").textContent = `CAM / ${flight.camera}`;
  };

  const updateFlight = (action) => {
    if (action === "takeoff") flight.altitude = Math.max(12, flight.altitude);
    if (action === "land") Object.assign(flight, { altitude: 0, speed: 0, x: 50, y: 56 });
    if (action === "up") flight.altitude = core.clamp(flight.altitude + 8, 0, 120);
    if (action === "down") flight.altitude = core.clamp(flight.altitude - 8, 0, 120);
    if (action === "left") flight.heading -= 20;
    if (action === "right") flight.heading += 20;
    if (action === "camera") flight.camera = flight.camera === "4K" ? "THERMAL" : "4K";
    if (action === "forward" && flight.altitude > 0) moveFlightForward();
    flight.battery = core.clamp(flight.battery - (action === "camera" ? 0.2 : 0.5), 0, 100);
    renderFlight();
    tone(action === "camera" ? 760 : 180, 0.08);
  };

  const moveFlightForward = () => {
    const radians = flight.heading * Math.PI / 180;
    flight.x = core.clamp(flight.x + Math.sin(radians) * 5, 4, 96);
    flight.y = core.clamp(flight.y - Math.cos(radians) * 5, 7, 93);
    flight.speed = core.clamp(flight.speed + 7, 0, 92);
  };

  const tone = (frequency, duration = 0.12) => {
    if (!soundEnabled) return;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) {
      soundEnabled = false;
      return;
    }
    audioContext ||= new AudioEngine();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = frequency < 300 ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  const runDiagnostics = async () => {
    diagnosticsGeneration += 1;
    const generation = diagnosticsGeneration;
    const log = dialog.querySelector("[data-diagnostics-log]");
    const progress = dialog.querySelector("[data-diagnostics-progress]");
    const result = dialog.querySelector("[data-diagnostics-result]");
    const metrics = core.metricsFor(configuration);
    const lines = ["SYSTEM BOOT", "Motor 1........OK", "Motor 2........OK", "GPS............OK", "Compass........OK", `Camera..........${metrics.camera}`, `Battery.........${metrics.battery}%`, "Navigation......ONLINE", "MISSION READY"];
    log.innerHTML = "";
    result.textContent = "MISSION STATUS / CHECKING";
    for (let index = 0; index < lines.length; index += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 20 : 330));
      if (generation !== diagnosticsGeneration) return;
      log.insertAdjacentHTML("beforeend", `<li class="is-ok">${lines[index]}</li>`);
      progress.style.width = `${Math.round(((index + 1) / lines.length) * 100)}%`;
      tone(index === lines.length - 1 ? 880 : 420 + index * 32, 0.07);
    }
    result.textContent = `MISSION READY / ${core.fitFor(configuration, [...missions])}%`;
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  };

  const updateConfiguration = (next) => {
    configuration = next || core.defaultConfiguration();
    dialog.querySelector("[data-cockpit-model]").textContent = configuration.model.name;
    launch.style.setProperty("--cockpit-accent", configuration.color.ui || configuration.model.accent);
    if (dialog.open) {
      const currentScreen = dialog.querySelector("[data-cockpit-screen].is-active")?.dataset.cockpitScreen || "live";
      screenBuilders[currentScreen]?.();
    }
    updateDock();
  };

  const updateDock = () => {
    const viewer = document.querySelector(".build-viewer");
    if (!viewer) return;
    let dock = viewer.querySelector("[data-live-dock]");
    if (!dock) {
      dock = document.createElement("aside");
      dock.className = "cockpit-live-dock";
      dock.dataset.liveDock = "";
      viewer.append(dock);
    }
    const metrics = core.metricsFor(configuration);
    dock.innerHTML = `<small>MDR DIGITAL COCKPIT</small><h2>${configuration.model.name}</h2>${compactMetrics(metrics)}<button type="button" data-cockpit-open>Открыть полную панель ↗</button>`;
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-cockpit-open]")) {
      if (!dialog.open) dialog.showModal();
      setScreen("live");
    }
    if (event.target.closest("[data-cockpit-close]")) dialog.close();
    const tab = event.target.closest("[data-cockpit-tab]");
    if (tab) setScreen(tab.dataset.cockpitTab);
    const jump = event.target.closest("[data-cockpit-tab-jump]");
    if (jump) setScreen(jump.dataset.cockpitTabJump);
    if (event.target.closest("[data-run-diagnostics]")) {
      void runDiagnostics().catch(() => {
        const result = dialog.querySelector("[data-diagnostics-result]");
        if (result) result.textContent = "MISSION STATUS / CHECK INTERRUPTED";
      });
    }
    if (event.target.closest("[data-sound-toggle]")) toggleSound(event.target.closest("[data-sound-toggle]"));
    const flightAction = event.target.closest("[data-flight]")?.dataset.flight;
    if (flightAction) updateFlight(flightAction);
    const modelButton = event.target.closest("[data-apply-model]");
    if (modelButton) applyModel(modelButton.dataset.applyModel);
    const extraButton = event.target.closest("[data-add-extra]");
    if (extraButton) document.dispatchEvent(new CustomEvent("mdr:addextra", { detail: { id: extraButton.dataset.addExtra } }));
    if (event.target.closest("[data-copy-config]")) void shareConfiguration(false);
    if (event.target.closest("[data-native-share]")) void shareConfiguration(true);
  });

  const toggleSound = (button) => {
    soundEnabled = !soundEnabled;
    button.textContent = `Звук: ${soundEnabled ? "включён" : "выключен"}`;
    if (soundEnabled) tone(520, 0.11);
  };

  const applyModel = (id) => {
    if (document.body.classList.contains("buy-page")) {
      document.dispatchEvent(new CustomEvent("mdr:selectmodel", { detail: { id } }));
      dialog.close();
    } else window.location.href = `buy.html?model=${id}`;
  };

  const shareConfiguration = async (native) => {
    const url = core.configurationUrl(configuration);
    const status = dialog.querySelector("[data-share-status]");
    try {
      if (native && navigator.share) await navigator.share({ title: configuration.model.name, text: configuration.model.tagline, url });
      else await copyText(url);
      status.textContent = native && navigator.share ? "Меню отправки открыто." : "Ссылка скопирована.";
    } catch (error) {
      status.textContent = error.name === "AbortError" ? "Отправка отменена." : "Не удалось скопировать. Выделите ссылку вручную.";
    }
  };

  dialog.addEventListener("change", (event) => {
    if (event.target.matches("[data-mission]")) {
      if (event.target.checked) missions.add(event.target.value);
      else missions.delete(event.target.value);
      const recommendation = core.recommendMission([...missions]);
      dialog.querySelector("[data-mission-result]").innerHTML = missionResultMarkup(recommendation);
      renderAi();
      buildLive();
    }
    if (event.target.matches("[data-compare]")) updateComparisonSelection(event.target);
  });

  const updateComparisonSelection = (input) => {
    if (input.checked && compared.size >= 3) {
      input.checked = false;
      dialog.querySelector("[data-compare-message]").textContent = "Можно сравнить не более трёх моделей.";
      return;
    }
    if (input.checked) compared.add(input.value);
    else compared.delete(input.value);
    dialog.querySelector("[data-compare-message]").textContent = compared.size ? "" : "Выберите хотя бы одну модель.";
    renderComparison();
  };

  dialog.addEventListener("close", () => {
    diagnosticsGeneration += 1;
  });
  dialog.addEventListener("pointerover", (event) => {
    if (!soundEnabled) return;
    const target = event.target.closest("button, a, .cockpit-drone-visual");
    if (!target || target.contains(event.relatedTarget)) return;
    tone(target.classList.contains("cockpit-drone-visual") ? 120 : 620, 0.045);
  });

  document.addEventListener("mdr:configurationchange", (event) => updateConfiguration(event.detail));
  document.addEventListener("mdr:productchange", (event) => {
    if (document.body.classList.contains("buy-page")) return;
    const model = core.products[event.detail?.id];
    if (!model || configuration.id === model.id) return;
    updateConfiguration({
      id: model.id,
      model,
      color: model.colors[0],
      pack: model.packages[0],
      extras: [],
      total: model.price,
      url: window.location.href
    });
  });
  document.addEventListener("mdr:orderaccepted", (event) => {
    const data = event.detail?.configuration || {};
    core.saveGarage({
      orderId: event.detail?.order?.id,
      productId: data.productId || configuration.id,
      productName: data.productName || configuration.model.name,
      colorName: data.colorName || configuration.color.name,
      image: configuration.model.image,
      battery: core.metricsFor(configuration).battery,
      firmware: "1.2",
      status: "ORDER SAVED"
    });
    if (activeScreen("garage")?.classList.contains("is-active")) buildGarage();
    if (activeScreen("live")?.classList.contains("is-active")) buildLive();
  });

  const flightTimer = window.setInterval(() => {
    if (!dialog.open || !activeScreen("flight")?.classList.contains("is-active") || flight.altitude <= 0) return;
    flight.battery = core.clamp(flight.battery - 0.2, 0, 100);
    flight.speed = Math.max(0, flight.speed - 1);
    renderFlight();
  }, 2_000);
  window.addEventListener("pagehide", () => window.clearInterval(flightTimer), { once: true });

  screenBuilders = {
    live: buildLive,
    diagnostics: buildDiagnostics,
    flight: buildFlight,
    mission: buildMission,
    compare: buildCompare,
    garage: buildGarage,
    share: buildShare
  };
  updateConfiguration(configuration);
})();
