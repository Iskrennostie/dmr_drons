import { DroneViewer } from "./viewer.js";

const products = window.MDR_PRODUCTS || {};
const productIds = window.MDR_MODEL_ORDER || Object.keys(products);
const money = window.MDR_MONEY || ((value) => new Intl.NumberFormat("ru-RU").format(value));
const root = document.querySelector("#app");
const page = document.body.dataset.page || "home";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = {
  viewer: null,
  modelId: "ultra",
  colorId: "",
  packageId: "",
  extras: new Set(),
  weather: "sun",
  scene: "day",
  xray: false,
  flightTimer: 0
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const query = new URLSearchParams(location.search);
const safeModel = (id) => products[id] ? id : "ultra";
const currentModel = () => products[state.modelId];
const currentColor = () => currentModel().colors.find((item) => item.id === state.colorId) || currentModel().colors[0];
const currentPackage = () => currentModel().packages.find((item) => item.id === state.packageId) || currentModel().packages[0];
const currentExtras = () => currentModel().extras.filter((item) => state.extras.has(item.id));

const weatherRules = {
  sun: { label: "Солнце", autonomy: 0, stability: 0, wind: 7, icon: "☀" },
  rain: { label: "Дождь", autonomy: -14, stability: -8, wind: 17, icon: "☂" },
  snow: { label: "Снег", autonomy: -20, stability: -10, wind: 13, icon: "❄" },
  wind: { label: "Сильный ветер", autonomy: -17, stability: -22, wind: 28, icon: "≋" }
};

const flightMinutes = (model) => {
  const source = (model.stats || []).find(([value, label]) => /мин|воздух|полёт/i.test(`${value} ${label}`));
  const parsed = Number.parseInt(source?.[0], 10);
  return Number.isFinite(parsed) ? parsed : 38;
};

const configuration = () => {
  const model = currentModel();
  const color = currentColor();
  const pack = currentPackage();
  const extras = currentExtras();
  const weather = weatherRules[state.weather];
  const optionTotal = extras.reduce((sum, item) => sum + item.add, 0);
  const total = model.price + color.add + pack.add + optionTotal;
  const hasRtk = extras.some((item) => item.id === "rtk") || /rtk/i.test(pack.name);
  const hasBattery = extras.some((item) => item.id === "battery") || /аккумулятор/i.test(pack.note);
  const hasThermal = extras.some((item) => item.id === "thermal") || /теплов/i.test(pack.note);
  const baseFlight = flightMinutes(model) + (hasBattery ? 12 : 0);
  const autonomy = Math.max(18, baseFlight + weather.autonomy);
  const autonomyScore = Math.min(100, Math.round(autonomy / 60 * 100));
  const payload = /heavy|rescue|steel/i.test(model.id) ? 100 : /fast|ember/i.test(model.id) ? 52 : 72;
  const stability = Math.max(35, Math.min(100, 86 + weather.stability + (hasRtk ? 4 : 0)));
  const precision = Math.min(100, 76 + (hasRtk ? 20 : 0) + (model.category === "mapping" ? 4 : 0));
  const readiness = Math.min(99, Math.round((stability + precision + Math.min(100, autonomy * 2) + payload) / 4));
  return { model, color, pack, extras, total, weather, autonomy, autonomyScore, stability, precision, readiness, hasThermal, hasRtk };
};

const setInitialState = () => {
  state.modelId = safeModel(document.body.dataset.model || query.get("model") || "ultra");
  const model = currentModel();
  state.colorId = model.colors.some((item) => item.id === query.get("color")) ? query.get("color") : model.colors[0].id;
  state.packageId = model.packages.some((item) => item.id === query.get("package")) ? query.get("package") : model.packages[0].id;
  const acceptedExtras = new Set(model.extras.map((item) => item.id));
  state.extras = new Set((query.get("extras") || "").split(",").filter((id) => acceptedExtras.has(id)));
};

const detailUrl = (id) => `model.html?model=${encodeURIComponent(id)}`;
const buyUrl = (id) => `buy.html?model=${encodeURIComponent(id)}`;
const nav = () => `
  <header class="site-header">
    <a class="brand" href="index.html" aria-label="MDR — главная">MDR<span>DRONE SYSTEMS</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-navigation">Меню</button>
    <nav id="main-navigation" aria-label="Основная навигация">
      <a href="index.html#models">Модели</a>
      <a href="about.html">О компании</a>
      <a href="reviews.html">Отзывы</a>
      <a href="contacts.html">Контакты</a>
    </nav>
    <a class="button button--accent header-cta" href="buy.html">Собрать MDR</a>
  </header>`;

const footer = () => `
  <footer class="site-footer">
    <div><a class="brand" href="index.html">MDR<span>DRONE SYSTEMS</span></a><p>Профессиональные платформы для съёмки, инспекций, картографии и специальных миссий.</p></div>
    <div><small>Связь</small><a href="tel:+998910018172">+998 91 001 81 72</a><a href="mailto:itaci3367@gmail.com">itaci3367@gmail.com</a></div>
    <div><small>Навигация</small><a href="buy.html">Конфигуратор</a><a href="reviews.html">Отзывы</a><a href="contacts.html">Команда MDR</a></div>
  </footer>`;

const shell = (content, pageClass = "") => {
  document.body.className = `mdr-page ${pageClass}`;
  root.innerHTML = `${nav()}<main>${content}</main>${footer()}`;
  bindNavigation();
};

const bindNavigation = () => {
  const toggle = root.querySelector(".nav-toggle");
  const menu = root.querySelector("#main-navigation");
  toggle?.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
};

const metric = (label, value, suffix = "%") => `<div class="metric"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}${suffix}</b><i><em style="--metric:${Math.max(0, Math.min(100, Number(value) || 0))}%"></em></i></div>`;

const modelCard = (model, index = 0) => `
  <article class="model-card" style="--accent:${model.accent}">
    <a class="model-card__visual" href="${detailUrl(model.id)}"><img src="${model.image}" alt="${escapeHtml(model.imageAlt)}" loading="lazy"></a>
    <div class="model-card__copy"><small>/${String(index + 1).padStart(2, "0")} · ${escapeHtml(model.eyebrow)}</small><h3>${escapeHtml(model.name)}</h3><p>${escapeHtml(model.tagline)}</p><div><span>${escapeHtml(model.priceLabel)}</span><a href="${buyUrl(model.id)}">Настроить <b>↗</b></a></div></div>
  </article>`;

const initViewer = (canvas, options = {}) => {
  state.viewer?.destroy();
  state.viewer = new DroneViewer(canvas, {
    onAngleChange: (degrees) => {
      const target = document.querySelector("[data-viewer-angle]");
      if (target) target.textContent = `${degrees}°`;
    }
  });
  const active = configuration();
  state.viewer.setProduct(active.model, active.color);
  state.viewer.setPresentation({ mode: state.xray ? "xray" : "shell", scene: state.scene, weather: state.weather, ...options });
  return state.viewer;
};

const renderHome = () => {
  const selected = currentModel();
  shell(`
    <section class="home-hero" style="--accent:${selected.accent}">
      <div class="home-hero__copy"><p class="eyebrow">MDR / PROFESSIONAL FLIGHT SYSTEMS</p><h1>${escapeHtml(selected.displayLead)} <span>${escapeHtml(selected.displayAccent)}</span></h1><p>${escapeHtml(selected.tagline)}</p><div class="hero-actions"><a class="button button--accent" href="${buyUrl(selected.id)}">Оформить предзаказ</a><a class="button" href="${detailUrl(selected.id)}">Подробнее</a></div></div>
      <div class="home-hero__stage"><img src="${selected.image}" alt="${escapeHtml(selected.imageAlt)}"><i aria-hidden="true"></i></div>
      <div class="home-model-switch" role="tablist" aria-label="Выбрать модель">${productIds.slice(0, 3).map((id) => `<button type="button" role="tab" aria-selected="${id === selected.id}" data-home-model="${id}">${escapeHtml(products[id].name)}</button>`).join("")}</div>
    </section>
    <section class="section model-section" id="models"><header class="section-heading"><p class="eyebrow">01 / ЛИНЕЙКА MDR</p><h2>Десять систем.<br>Один стандарт точности.</h2><p>Выберите платформу по реальной задаче, затем настройте цвет, комплект и дополнительные модули с расчётом итоговой цены.</p></header><div class="model-grid">${productIds.map((id, index) => modelCard(products[id], index)).join("")}</div></section>
    <section class="section system-strip"><p class="eyebrow">02 / ПРОЦЕСС</p><ol><li><b>01</b><span>Выберите платформу</span></li><li><b>02</b><span>Проверьте 3D-модель и параметры</span></li><li><b>03</b><span>Соберите конфигурацию</span></li><li><b>04</b><span>Оставьте заявку</span></li></ol></section>
  `, "home");
  root.querySelectorAll("[data-home-model]").forEach((button) => button.addEventListener("click", () => {
    state.modelId = button.dataset.homeModel;
    const model = currentModel();
    state.colorId = model.colors[0].id;
    state.packageId = model.packages[0].id;
    renderHome();
  }));
};

const renderModel = () => {
  const active = configuration();
  const { model } = active;
  shell(`
    <section class="product-hero" style="--accent:${model.accent}">
      <div class="product-hero__copy"><p class="eyebrow">${escapeHtml(model.eyebrow)}</p><h1>${escapeHtml(model.displayLead)}<br><span>${escapeHtml(model.displayAccent)}</span></h1><p>${escapeHtml(model.description)}</p><div class="hero-actions"><a class="button button--accent" href="${buyUrl(model.id)}">Настроить и купить</a><button class="button" type="button" data-view-mode="xray">Открыть X-Ray</button></div></div>
      <section class="viewer-frame viewer-frame--product"><canvas data-drone-viewer></canvas><div class="viewer-controls"><button type="button" data-viewer-left aria-label="Повернуть модель влево">←</button><output data-viewer-angle>0°</output><button type="button" data-viewer-right aria-label="Повернуть модель вправо">→</button></div><p>Интерактивная 3D-модель · перетаскивайте или используйте стрелки</p></section>
    </section>
    <section class="section specifications"><header class="section-heading"><p class="eyebrow">ТЕХНИЧЕСКИЙ ПАСПОРТ</p><h2>Параметры<br>без маркетинговой шелухи.</h2></header><dl>${model.specs.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>
    <section class="section capability-grid">${model.features.map(([title, description], index) => `<article><small>0${index + 1}</small><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></article>`).join("")}</section>
    <section class="section cockpit-section" style="--accent:${active.color.ui}"><div class="section-heading"><p class="eyebrow">MDR DIGITAL COCKPIT</p><h2>Живые параметры<br>выбранной платформы.</h2><p>Расчёт конфигуратора: автономность ${active.autonomy} мин. Это не телеметрия настоящего борта.</p></div><div class="cockpit-grid">${metric("Автономность", active.autonomyScore)}${metric("Устойчивость", active.stability)}${metric("Точность", active.precision)}${metric("Готовность к миссии", active.readiness)}</div></section>
  `, "product");
  initViewer(root.querySelector("[data-drone-viewer]"));
  bindViewerButtons();
};

const persistConfigurationUrl = () => {
  const active = configuration();
  const params = new URLSearchParams({ model: active.model.id, color: active.color.id, package: active.pack.id });
  if (active.extras.length) params.set("extras", active.extras.map((item) => item.id).join(","));
  history.replaceState({}, "", `buy.html?${params}`);
};

const renderBuy = () => {
  const active = configuration();
  const { model, color, pack, extras, total } = active;
  document.title = `${model.name} — конфигуратор MDR`;
  shell(`
    <section class="build-page" style="--accent:${color.ui || model.accent}">
      <header class="build-page__intro"><p class="eyebrow">MDR STUDIO / CONFIGURATION</p><h1>Соберите ${escapeHtml(model.short)}<br>под задачу.</h1><p>Выбор меняет итоговую цену, визуальную модель и расчёт готовности. Никаких скрытых вариантов.</p></header>
      <div class="build-layout">
        <aside class="build-studio"><div class="viewer-frame"><canvas data-drone-viewer></canvas><div class="viewer-controls"><button type="button" data-viewer-left aria-label="Повернуть модель влево">←</button><output data-viewer-angle>0°</output><button type="button" data-viewer-right aria-label="Повернуть модель вправо">→</button></div><div class="viewer-toolbar"><button class="${state.xray ? "is-active" : ""}" type="button" data-view-mode="xray">X-Ray</button><button class="${!state.xray ? "is-active" : ""}" type="button" data-view-mode="shell">Корпус</button><button class="${state.scene === "night" ? "is-active" : ""}" type="button" data-view-scene="night">Night LEDs</button></div></div><p class="viewer-note">3D-модель отвечает на перетаскивание, клавиши и выбор покрытия. X-Ray открывает независимые внутренние узлы.</p><div class="live-readout"><span><small>GPS</small><b>${active.hasRtk ? 32 : 28} спутника</b></span><span><small>Ветер</small><b>${active.weather.wind} км/ч</b></span><span><small>Связь</small><b>99%</b></span><span><small>Готовность</small><b>${active.readiness}%</b></span></div></aside>
        <div class="config-form" aria-label="Конфигуратор">
          <section><header><span>01</span><div><h2>Модель</h2><p>Базовая платформа и её цена.</p></div></header><div class="choice-grid choice-grid--models">${productIds.map((id) => { const item = products[id]; return `<button type="button" data-select-model="${id}" class="${id === model.id ? "is-selected" : ""}"><img src="${item.image}" alt="" loading="lazy"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.priceLabel)}</small></button>`; }).join("")}</div></section>
          <section><header><span>02</span><div><h2>Покрытие корпуса</h2><p>Меняется цвет именно 3D-модели; фон остаётся студийным.</p></div></header><div class="choice-grid choice-grid--colors">${model.colors.map((item) => `<button type="button" data-select-color="${item.id}" class="${item.id === color.id ? "is-selected" : ""}"><i style="background:${item.hex}"></i><b>${escapeHtml(item.name)}</b><small>${item.add ? `+ ${money(item.add)} у.е.` : "Включено"}</small></button>`).join("")}</div></section>
          <section><header><span>03</span><div><h2>Комплектация</h2><p>Входит в поставку и влияет на цену.</p></div></header><div class="choice-stack">${model.packages.map((item) => `<button type="button" data-select-package="${item.id}" class="${item.id === pack.id ? "is-selected" : ""}"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.note)}</small></span><strong>${item.add ? `+ ${money(item.add)}` : "Включено"}</strong></button>`).join("")}</div></section>
          <section><header><span>04</span><div><h2>Дополнительные модули</h2><p>Выберите только нужное для миссии.</p></div></header><div class="choice-stack">${model.extras.map((item) => `<label class="extra-choice ${state.extras.has(item.id) ? "is-selected" : ""}"><input type="checkbox" data-select-extra="${item.id}" ${state.extras.has(item.id) ? "checked" : ""}><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.note)}</small></span><strong>+ ${money(item.add)}</strong></label>`).join("")}</div></section>
          <section><header><span>05</span><div><h2>Среда миссии</h2><p>Расчёт запаса строится по выбранным условиям.</p></div></header><div class="weather-options">${Object.entries(weatherRules).map(([id, item]) => `<button type="button" data-select-weather="${id}" class="${state.weather === id ? "is-selected" : ""}"><i>${item.icon}</i>${item.label}</button>`).join("")}</div></section>
        </div>
      </div>
      <section class="configuration-summary" id="summary"><div><p class="eyebrow">ВАША КОНФИГУРАЦИЯ</p><h2>${escapeHtml(model.name)}</h2><p>${escapeHtml(color.name)} · ${escapeHtml(pack.name)}${extras.length ? ` · ${extras.map((item) => escapeHtml(item.name)).join(", ")}` : ""}</p></div><div class="summary-metrics">${metric("Автономность", active.autonomyScore)}${metric("Устойчивость", active.stability)}${metric("Точность", active.precision)}${metric("Готовность", active.readiness)}</div><div class="summary-price"><small>Ориентировочная стоимость</small><strong>${money(total)} <i>у.е.</i></strong><button class="button button--accent" type="button" data-open-order>Оставить заявку</button><p>Финальная сумма зависит от доставки и согласованного состава оборудования.</p></div></section>
      <section class="flight-simulator" data-flight-simulator><div><p class="eyebrow">ИНТЕРАКТИВНЫЙ ТРЕНАЖЁР</p><h2>Проверьте логику полёта.</h2><p>Демонстрационный симулятор интерфейса: он не управляет настоящим дроном.</p></div><div class="flight-screen"><span data-flight-drone>✦</span><i></i><output><b data-flight-altitude>0 м</b><b data-flight-speed>0 км/ч</b><b data-flight-battery>100%</b></output></div><div class="flight-controls"><button type="button" data-flight-action="takeoff">Взлёт</button><button type="button" data-flight-action="left">←</button><button type="button" data-flight-action="right">→</button><button type="button" data-flight-action="land">Посадка</button></div></section>
    </section>
  `, "buy");
  initViewer(root.querySelector("[data-drone-viewer]"));
  bindViewerButtons();
  bindConfigurator();
  bindFlightSimulator();
};

const bindViewerButtons = () => {
  root.querySelector("[data-viewer-left]")?.addEventListener("click", () => state.viewer?.rotate(-Math.PI / 4));
  root.querySelector("[data-viewer-right]")?.addEventListener("click", () => state.viewer?.rotate(Math.PI / 4));
  root.querySelectorAll("[data-view-mode]").forEach((button) => button.addEventListener("click", () => {
    state.xray = button.dataset.viewMode === "xray";
    state.viewer?.setPresentation({ mode: state.xray ? "xray" : "shell" });
    root.querySelectorAll("[data-view-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
  }));
  root.querySelectorAll("[data-view-scene]").forEach((button) => button.addEventListener("click", () => {
    state.scene = state.scene === "night" ? "day" : "night";
    state.viewer?.setPresentation({ scene: state.scene });
    button.classList.toggle("is-active", state.scene === "night");
  }));
};

const bindConfigurator = () => {
  root.querySelectorAll("[data-select-model]").forEach((button) => button.addEventListener("click", () => {
    state.modelId = safeModel(button.dataset.selectModel);
    const next = currentModel();
    state.colorId = next.colors[0].id;
    state.packageId = next.packages[0].id;
    state.extras = new Set();
    persistConfigurationUrl();
    renderBuy();
  }));
  root.querySelectorAll("[data-select-color]").forEach((button) => button.addEventListener("click", () => {
    state.colorId = button.dataset.selectColor;
    persistConfigurationUrl();
    renderBuy();
  }));
  root.querySelectorAll("[data-select-package]").forEach((button) => button.addEventListener("click", () => {
    state.packageId = button.dataset.selectPackage;
    persistConfigurationUrl();
    renderBuy();
  }));
  root.querySelectorAll("[data-select-extra]").forEach((input) => input.addEventListener("change", () => {
    input.checked ? state.extras.add(input.dataset.selectExtra) : state.extras.delete(input.dataset.selectExtra);
    persistConfigurationUrl();
    renderBuy();
  }));
  root.querySelectorAll("[data-select-weather]").forEach((button) => button.addEventListener("click", () => {
    state.weather = button.dataset.selectWeather;
    state.viewer?.setPresentation({ weather: state.weather });
    renderBuy();
  }));
  root.querySelector("[data-open-order]")?.addEventListener("click", () => openOrder(configuration(), "purchase"));
};

const bindFlightSimulator = () => {
  const simulator = root.querySelector("[data-flight-simulator]");
  if (!simulator) return;
  const values = { altitude: 0, speed: 0, battery: 100, x: 50, y: 58 };
  const paint = () => {
    simulator.querySelector("[data-flight-altitude]").textContent = `${Math.round(values.altitude)} м`;
    simulator.querySelector("[data-flight-speed]").textContent = `${Math.round(values.speed)} км/ч`;
    simulator.querySelector("[data-flight-battery]").textContent = `${Math.round(values.battery)}%`;
    const drone = simulator.querySelector("[data-flight-drone]");
    drone.style.setProperty("--x", `${values.x}%`);
    drone.style.setProperty("--y", `${values.y}%`);
  };
  simulator.querySelectorAll("[data-flight-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.flightAction;
    if (action === "takeoff") { values.altitude = Math.min(120, values.altitude + 30); values.speed = Math.min(55, values.speed + 12); values.battery = Math.max(0, values.battery - 2); }
    if (action === "land") { values.altitude = Math.max(0, values.altitude - 30); values.speed = Math.max(0, values.speed - 12); }
    if (action === "left") values.x = Math.max(8, values.x - 9);
    if (action === "right") values.x = Math.min(92, values.x + 9);
    paint();
  }));
  paint();
};

const renderAbout = () => shell(`
  <section class="editorial-hero"><p class="eyebrow">MDR / О КОМПАНИИ</p><h1>Технологии в воздухе<br>должны быть понятными на земле.</h1><p>Мы строим линейку профессиональных дронов с ясной задачей для каждой платформы: от лёгкой съёмки до промышленной инспекции и аварийных сценариев.</p></section>
  <section class="section value-grid"><article><small>01</small><h2>Задача важнее эффекта.</h2><p>Конфигурация показывает цену, состав и реальные ограничения до отправки заявки.</p></article><article><small>02</small><h2>Честный интерфейс.</h2><p>Визуальные симуляторы обозначены как симуляторы. Заявки сохраняются только после ответа сервера.</p></article><article><small>03</small><h2>Команда на связи.</h2><p>За каждой конфигурацией стоит консультация человека, а не исчезающий чат-виджет.</p></article></section>
  <section class="section case-note"><p class="eyebrow">ДЕМОНСТРАЦИОННЫЙ КЕЙС</p><h2>Съёмка игры в гольф<br>с участием Майкла Джордана.</h2><p>Это концептуальный пример возможного применения MDR для спортивной съёмки. Он не является заявлением о состоявшейся поставке или сотрудничестве.</p></section>
`, "about");

const renderContacts = () => shell(`
  <section class="editorial-hero contacts-hero"><p class="eyebrow">MDR / КОНТАКТЫ</p><h1>Всегда<br>на связи.</h1><p>Оставьте заявку на конфигурацию или свяжитесь напрямую. Мы уточним задачу, условия поставки и нужный состав оборудования.</p><div class="contact-actions"><a href="tel:+998910018172">+998 91 001 81 72</a><a href="mailto:itaci3367@gmail.com">itaci3367@gmail.com</a></div></section>
  <section class="section team-grid"><article class="team-lead"><img src="assets/mdr-owner-director-v3.jpg" alt="Основатель MDR"><div><small>ОСНОВАТЕЛЬ / MDR</small><h2>Афрузбек</h2><p>Координация проектов и консультации по конфигурации.</p><a href="tel:+998910018172">+998 91 001 81 72</a></div></article>${[
    ["team-amir-v1.png", "Ниязов Амир", "+998 91 001 01 01"],
    ["team-alisher-v1.png", "Садьуллаев Алишер", "+998 33 333 33 33"],
    ["team-fakhriddin-v1.png", "Абдувахабов Фахриддин", "+998 55 555 55 55"],
    ["team-ozod-v1.png", "Арабхонов Озод", "+998 99 999 99 99"],
    ["mdr-supply-director-v1.png", "Поставка и комплектация", "+998 91 001 81 72"]
  ].map(([image, name, phone]) => `<article><img src="assets/${image}" alt="${name}"><small>MDR / КОНСУЛЬТАЦИЯ</small><h3>${name}</h3><a href="tel:${phone.replace(/\s/g, "")}">${phone}</a></article>`).join("")}</section>
`, "contacts");

const demoReviews = [
  ["Исмаилова Юлиана", "MDR Ultra Light", 5, "Быстро согласовали комплект для съёмки и объяснили разницу между модулями."],
  ["Мамедов Теймур", "MDR Heavy", 5, "Нужна была инспекция объекта: помогли подобрать RTK и резерв питания."],
  ["Нуруллаев Абу-Суфен", "MDR Super Fast", 4.5, "Понятный выбор опций и хороший диалог по скорости и камере."],
  ["Собиржонов Умид", "MDR Rescue One", 5, "Проконсультировали по полезной нагрузке и условиям работы."],
  ["Султанова Шахзода", "MDR Ultra Light", 5, "Удобно, что цена меняется сразу при выборе комплекта."],
  ["Тен Виктория", "MDR Aqua Ray", 4.5, "Нужен был дрон для водной инфраструктуры — объяснили защиту корпуса."],
  ["Чаплыгина Варвара", "MDR Night Falcon", 5, "Подробно рассказали о ночной камере и подготовке к полёту."],
  ["Югай Анастасия", "MDR Arctic Scout", 5, "Хорошо объяснили, какие опции нужны для холодной погоды."],
  ["Ташпулатова Самира", "MDR Terra Green", 4.5, "Быстрая консультация и понятные характеристики."],
  ["Рузимахов Абдулрауф", "MDR Steel Surveyor", 5, "Подобрали конфигурацию для картографии и лидарных задач."],
  ["Джураев Данияр", "MDR Ember Sprint", 5, "Понравилась логика выбора FPV-комплектации."],
  ["Губайдулин Таймас", "MDR Heavy", 4.5, "Дали конкретные рекомендации без лишних обещаний."]
];

const reviewCard = ([name, product, score, message], type = "demo") => `<article class="review-card ${type === "demo" ? "is-demo" : ""}"><div><span>${"★".repeat(Math.floor(score))}${score % 1 ? "½" : ""}</span><small>${type === "demo" ? "ДЕМОНСТРАЦИОННЫЙ ПРИМЕР" : "ПРОВЕРЕННЫЙ ОТЗЫВ"}</small></div><p>«${escapeHtml(message)}»</p><footer><b>${escapeHtml(name)}</b><span>${escapeHtml(product)}</span></footer></article>`;

const renderReviews = () => {
  shell(`
    <section class="editorial-hero"><p class="eyebrow">MDR / ОТЗЫВЫ</p><h1>Опыт начинается<br>до взлёта.</h1><p>Здесь публикуются одобренные отзывы. Примеры ниже явно отделены от отзывов, которые поступают через форму сайта.</p></section>
    <section class="section reviews-section"><div class="review-list" data-approved-reviews></div><p class="remote-status" data-review-status>Загружаем одобренные отзывы…</p><h2>Демонстрационные примеры</h2><div class="review-list">${demoReviews.map((item) => reviewCard(item)).join("")}</div></section>
    <section class="section review-form"><div><p class="eyebrow">ОСТАВИТЬ ОТЗЫВ</p><h2>Ваш опыт<br>имеет значение.</h2></div><form data-review-form><label>Имя<input name="name" required minlength="2"></label><label>Модель<select name="productId"><option value="">Не выбрана</option>${productIds.map((id) => `<option value="${id}">${escapeHtml(products[id].name)}</option>`).join("")}</select></label><label>Оценка<select name="rating">${[5,4,3,2,1].map((score) => `<option value="${score}">${score} / 5</option>`).join("")}</select></label><label>Отзыв<textarea name="comment" required minlength="10" maxlength="1500"></textarea></label><button class="button button--accent" type="submit">Отправить на модерацию</button><output data-review-message role="status"></output></form></section>
  `, "reviews");
  void loadReviews();
  root.querySelector("[data-review-form]")?.addEventListener("submit", submitReview);
};

const loadReviews = async () => {
  const list = root.querySelector("[data-approved-reviews]");
  const status = root.querySelector("[data-review-status]");
  try {
    const response = await fetch("/api/reviews", { headers: { accept: "application/json" } });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось загрузить отзывы.");
    const reviews = result.reviews || [];
    list.innerHTML = reviews.length ? reviews.map((item) => reviewCard([item.name, item.product_name || "MDR", Number(item.rating), item.comment], "verified")).join("") : "<p>Пока нет одобренных отзывов.</p>";
    status.textContent = "";
  } catch {
    status.textContent = "Сервер отзывов временно недоступен. Демонстрационные примеры остаются отдельно ниже.";
  }
};

const submitReview = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("[data-review-message]");
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  data.productName = products[data.productId]?.name || "";
  data.sourceUrl = location.href;
  try {
    const response = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось сохранить отзыв.");
    message.textContent = "Спасибо. Отзыв отправлен на модерацию.";
    form.reset();
  } catch (error) {
    message.textContent = error.message || "Не удалось отправить отзыв.";
  }
};

const renderAdmin = () => {
  shell(`
  <section class="admin-page"><p class="eyebrow">MDR / ЗАКРЫТАЯ АДМИНКА</p><h1>Заявки и отзывы.</h1><form class="admin-login" data-admin-login><label>Пароль администратора<input type="password" name="password" required autocomplete="current-password"></label><button class="button button--accent">Войти</button><output data-admin-message role="status"></output></form><div data-admin-content hidden><header><h2>Новые заявки</h2><button type="button" data-admin-logout>Выйти</button></header><div data-admin-orders></div><h2>Отзывы на модерации</h2><div data-admin-reviews></div></div></section>
  `, "admin");
  root.querySelector("[data-admin-login]")?.addEventListener("submit", adminLogin);
  root.querySelector("[data-admin-logout]")?.addEventListener("click", () => { sessionStorage.removeItem("mdrAdminToken"); renderAdmin(); });
  const token = sessionStorage.getItem("mdrAdminToken");
  if (token) void loadAdmin(token);
};

const adminLogin = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("[data-admin-message]");
  try {
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось войти.");
    sessionStorage.setItem("mdrAdminToken", result.token);
    await loadAdmin(result.token);
  } catch (error) { message.textContent = error.message; }
};

const loadAdmin = async (token) => {
  const headers = { authorization: `Bearer ${token}`, accept: "application/json" };
  try {
    const [ordersResponse, reviewsResponse] = await Promise.all([fetch("/api/admin/orders?status=new", { headers }), fetch("/api/admin/reviews?status=pending", { headers })]);
    const [orders, reviews] = await Promise.all([ordersResponse.json(), reviewsResponse.json()]);
    if (!ordersResponse.ok || !reviewsResponse.ok) throw new Error(orders.error || reviews.error || "Сессия завершена.");
    root.querySelector("[data-admin-content]").hidden = false;
    root.querySelector("[data-admin-login]").hidden = true;
    root.querySelector("[data-admin-orders]").innerHTML = orders.orders.length ? orders.orders.map((item) => `<article class="admin-item"><b>№${item.id} · ${escapeHtml(item.name)}</b><a href="tel:${escapeHtml(item.phone)}">${escapeHtml(item.phone)}</a><p>${escapeHtml(item.product_name || item.configuration)}</p><small>${escapeHtml(item.color_name || "")} · ${escapeHtml(item.package_name || "")} · ${item.total_price ? `${money(item.total_price)} у.е.` : ""}</small></article>`).join("") : "<p>Новых заявок нет.</p>";
    root.querySelector("[data-admin-reviews]").innerHTML = reviews.reviews.length ? reviews.reviews.map((item) => `<article class="admin-item"><b>${escapeHtml(item.name)} · ${item.rating}/5</b><p>${escapeHtml(item.comment)}</p></article>`).join("") : "<p>Отзывов на модерации нет.</p>";
  } catch {
    sessionStorage.removeItem("mdrAdminToken");
    root.querySelector("[data-admin-message]").textContent = "Не удалось открыть админку. Войдите заново.";
  }
};

const newRequestId = () => globalThis.crypto?.randomUUID?.() || `mdr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const draftKey = "mdr:order-draft:v22";

const openOrder = (active, orderType = "inquiry") => {
  let dialog = document.querySelector("#order-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "order-dialog";
    document.body.append(dialog);
  }
  const selectedOptions = active.extras.map(({ id, name, add }) => ({ id, name, add }));
  const orderSummary = `${active.model.name}; ${active.color.name}; ${active.pack.name}; ${active.extras.map((item) => item.name).join(", ") || "без дополнительных модулей"}; итог ${money(active.total)} у.е.`;
  dialog.innerHTML = `<form method="dialog" class="order-modal" data-order-form><button type="button" class="modal-close" data-order-close aria-label="Закрыть">×</button><p class="eyebrow">ЗАЯВКА MDR</p><h2>Зафиксируем<br>вашу конфигурацию.</h2><p class="order-modal__summary">${escapeHtml(orderSummary)}</p><input type="hidden" name="configuration" value="${escapeHtml(orderSummary)}"><input type="hidden" name="orderType" value="${orderType}"><input type="hidden" name="productId" value="${escapeHtml(active.model.id)}"><input type="hidden" name="productName" value="${escapeHtml(active.model.name)}"><input type="hidden" name="colorName" value="${escapeHtml(active.color.name)}"><input type="hidden" name="packageName" value="${escapeHtml(active.pack.name)}"><input type="hidden" name="selectedOptions" value="${escapeHtml(JSON.stringify(selectedOptions))}"><input type="hidden" name="totalPrice" value="${active.total}"><input type="hidden" name="clientRequestId" value="${newRequestId()}"><label>Имя<input name="name" required minlength="2" autocomplete="name" placeholder="Как к вам обращаться?"></label><label>Телефон<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67"></label><label>Почта <small>необязательно</small><input name="email" type="email" autocomplete="email" placeholder="name@example.com"></label>${orderType === "purchase" ? '<label>Город или адрес доставки<textarea name="address" required minlength="5" maxlength="700" placeholder="Город, район и удобный способ доставки"></textarea></label>' : '<input type="hidden" name="address" value="">'}<label>Комментарий <small>необязательно</small><textarea name="comment" maxlength="1500" placeholder="Задача или удобное время для звонка"></textarea></label><button class="button button--accent" type="submit">Отправить заявку</button><output data-order-message role="status" aria-live="polite"></output></form>`;
  const restoreDraft = (() => { try { return JSON.parse(sessionStorage.getItem(draftKey) || "null"); } catch { return null; } })();
  if (restoreDraft?.productId === active.model.id) ["name", "phone", "email", "address", "comment"].forEach((name) => { if (dialog.querySelector(`[name="${name}"]`) && restoreDraft[name]) dialog.querySelector(`[name="${name}"]`).value = restoreDraft[name]; });
  dialog.querySelector("[data-order-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-order-form]").addEventListener("submit", submitOrder);
  dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector("[name=name]")?.focus());
};

const postOrder = async (payload, message) => {
  const timeouts = [95_000, 45_000];
  let lastError = null;
  for (let attempt = 0; attempt < timeouts.length; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeouts[attempt]);
    try {
      if (attempt === 0) message.textContent = "Подключаемся к защищённому сервису заявок. Если сервис был в простое, это может занять до минуты.";
      const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(payload), signal: controller.signal, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) return result;
      const error = new Error(result.fields ? Object.values(result.fields)[0] : result.error || "Сервер не принял заявку.");
      error.retryable = [408, 425, 429, 502, 503, 504].includes(response.status);
      throw error;
    } catch (error) {
      lastError = error;
      if (attempt === timeouts.length - 1 || (!error.retryable && error.name !== "AbortError" && !(error instanceof TypeError))) throw error;
      message.textContent = "Сервис ещё запускается. Повторяем запрос безопасно: заявка не продублируется.";
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error("Не удалось отправить заявку.");
};

const submitOrder = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity() || form.dataset.busy === "true") return;
  const submit = form.querySelector("button[type=submit]");
  const message = form.querySelector("[data-order-message]");
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.sourceUrl = location.href;
  form.dataset.busy = "true";
  submit.disabled = true;
  submit.textContent = "Отправляем…";
  try { sessionStorage.setItem(draftKey, JSON.stringify(payload)); } catch { /* Session storage is only a nonessential draft backup. */ }
  try {
    const result = await postOrder(payload, message);
    message.textContent = result.duplicate ? `Заявка №${result.order.id} уже была сохранена ранее.` : `Заявка №${result.order.id} принята. Данные сохранены в админке, уведомление отправлено в очередь почты.`;
    message.className = "is-success";
    submit.textContent = `Заявка №${result.order.id} принята`;
    try { sessionStorage.removeItem(draftKey); } catch { /* no-op */ }
  } catch (error) {
    message.textContent = `${error.message || "Не удалось отправить заявку."} Можно позвонить: +998 91 001 81 72.`;
    message.className = "is-error";
    submit.disabled = false;
    submit.textContent = "Повторить отправку";
  } finally { form.dataset.busy = "false"; }
};

setInitialState();
if (!root || !productIds.length) throw new Error("MDR catalog could not be initialized.");
if (page === "home") renderHome();
if (page === "model") renderModel();
if (page === "buy") renderBuy();
if (page === "about") renderAbout();
if (page === "contacts") renderContacts();
if (page === "reviews") renderReviews();
if (page === "admin") renderAdmin();

if (!reducedMotion && document.startViewTransition) {
  document.documentElement.classList.add("supports-view-transitions");
}
