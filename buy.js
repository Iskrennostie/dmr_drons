(() => {
  const products = window.MDR_PRODUCTS || {};
  const ids = window.MDR_MODEL_ORDER || Object.keys(products);
  const params = new URLSearchParams(location.search);
  let selected = products[params.get("model")] ? params.get("model") : "ultra";
  let selectedColor = products[selected].colors[0].id;
  let selectedPackage = products[selected].packages[0].id;
  let selectedExtras = new Set();
  const root = document.querySelector("#buy-root");
  const money = window.MDR_MONEY || ((value) => new Intl.NumberFormat("ru-RU").format(value));

  const signedPrice = (value) => value ? `+ ${money(value)} у.е.` : "Включено";
  const current = () => {
    const model = products[selected];
    const color = model.colors.find((item) => item.id === selectedColor) || model.colors[0];
    const pack = model.packages.find((item) => item.id === selectedPackage) || model.packages[0];
    const extras = model.extras.filter((item) => selectedExtras.has(item.id));
    const extrasTotal = extras.reduce((sum, item) => sum + item.add, 0);
    return { model, color, pack, extras, total: model.price + color.add + pack.add + extrasTotal };
  };

  const updateUrl = () => {
    const query = new URLSearchParams({ model: selected, color: selectedColor, package: selectedPackage });
    if (selectedExtras.size) query.set("extras", [...selectedExtras].join(","));
    history.replaceState({}, "", `buy.html?${query}`);
  };

  const selectModel = (id) => {
    if (!products[id]) return;
    selected = id;
    selectedColor = products[selected].colors[0].id;
    selectedPackage = products[selected].packages[0].id;
    selectedExtras = new Set();
    updateUrl();
    render();
  };

  const render = () => {
    const { model, color, pack, extras, total } = current();
    const accent = color.ui || color.hex || model.accent;
    document.title = `${model.name} — конфигуратор MDR`;
    document.documentElement.style.setProperty("--accent", accent);
    document.body.style.setProperty("--product-accent", accent);
    root.style.setProperty("--config-accent", accent);

    root.innerHTML = `
      <nav class="config-topbar" aria-label="Этапы конфигуратора">
        <a href="${model.page}" class="config-topbar__back">← <span>${model.name}</span></a>
        <div class="config-topbar__steps">
          <button type="button" data-step-target="step-model">Модель</button>
          <button type="button" data-step-target="step-color">Экстерьер</button>
          <button type="button" data-step-target="step-package">Комплектация</button>
          <button type="button" data-step-target="step-extras">Опции</button>
          <button type="button" data-step-target="build-summary">Итог</button>
        </div>
        <strong>${money(total)} у.е.</strong>
      </nav>

      <section class="build-shell">
        <div class="build-viewer" data-turntable>
          <div class="build-viewer__canvas" data-turntable-zone tabindex="0" aria-label="Поверните дрон перетаскиванием">
            <span class="build-viewer__eyebrow">MDR Studio / интерактивный обзор</span>
            <span class="build-viewer__ambient" aria-hidden="true"></span>
            <img data-turntable-image src="${model.configImage}" alt="${model.imageAlt} в цвете ${color.name}" style="--drone-filter:${color.filter}" />
            <div class="build-viewer__ground" aria-hidden="true"></div>
          </div>
          <div class="turntable-controls turntable-controls--light">
            <button type="button" data-turn-left aria-label="Повернуть влево">↶</button>
            <button type="button" data-turn-reset><span data-turntable-value>0°</span> / 360°</button>
            <button type="button" data-turn-right aria-label="Повернуть вправо">↷</button>
          </div>
          <div class="build-viewer__caption">
            <div><small>${color.finish}</small><h1>${model.name}</h1><p>${color.name}</p></div>
            <div>${model.stats.slice(0, 2).map(([value, label]) => `<span><b>${value}</b><small>${label}</small></span>`).join("")}</div>
          </div>
        </div>

        <div class="build-panel">
          <header class="build-panel__intro">
            <p class="kicker">MDR / Build your own</p>
            <h2>Соберите дрон<br />под свою миссию.</h2>
            <p>Все цены и выбранные опции сразу учитываются в итоговой стоимости.</p>
          </header>

          <section class="build-step" id="step-model">
            <div class="build-step__head"><span>01</span><div><h3>Модель</h3><p>${ids.length} профессиональных систем MDR</p></div></div>
            <div class="build-model-grid">
              ${ids.map((id) => {
                const item = products[id];
                return `<button type="button" data-model="${id}" class="${id === selected ? "is-selected" : ""}" style="--option-accent:${item.accent}">
                  <span><img src="${item.image}" alt="" loading="lazy" style="--drone-filter:${item.colors[0].filter}" /></span>
                  <strong>${item.name}</strong><small>${item.tagline}</small><b>${item.priceLabel}</b>
                </button>`;
              }).join("")}
            </div>
          </section>

          <section class="build-step" id="step-color">
            <div class="build-step__head"><span>02</span><div><h3>Цвет корпуса</h3><p>Меняется только покрытие дрона — студийный фон остаётся нейтральным</p></div></div>
            <div class="finish-group">
              <div class="finish-group__title"><span>${color.finish}</span><small>${model.colors.length} варианта</small></div>
              <div class="finish-options">
                ${model.colors.map((item) => `<button type="button" data-color="${item.id}" class="${item.id === color.id ? "is-selected" : ""}">
                  <i style="--swatch:${item.hex}"><span>✓</span></i>
                  <span><strong>${item.name}</strong><small>${item.finish}</small></span>
                  <b>${item.add ? `+ ${money(item.add)}` : "0"} у.е.</b>
                </button>`).join("")}
              </div>
            </div>
          </section>

          <section class="build-step" id="step-package">
            <div class="build-step__head"><span>03</span><div><h3>Комплектация</h3><p>Выберите основной набор оборудования</p></div></div>
            <div class="build-options">
              ${model.packages.map((item) => `<button type="button" data-package="${item.id}" class="${item.id === pack.id ? "is-selected" : ""}">
                <span><strong>${item.name}</strong><small>${item.note}</small></span><b>${signedPrice(item.add)}</b><i>✓</i>
              </button>`).join("")}
            </div>
          </section>

          <section class="build-step" id="step-extras">
            <div class="build-step__head"><span>04</span><div><h3>Дополнительные опции</h3><p>Можно выбрать несколько — цена пересчитывается сразу</p></div></div>
            <div class="build-options build-options--extras">
              ${model.extras.map((item) => `<button type="button" data-extra="${item.id}" aria-pressed="${selectedExtras.has(item.id)}" class="${selectedExtras.has(item.id) ? "is-selected" : ""}">
                <span><strong>${item.name}</strong><small>${item.note}</small></span><b>+ ${money(item.add)} у.е.</b><i>✓</i>
              </button>`).join("")}
            </div>
          </section>

          <section class="build-summary" id="build-summary">
            <p class="kicker">Ваша конфигурация</p>
            <h2>${model.name}</h2>
            <p class="build-summary__color"><i style="background:${color.hex}"></i>${color.name}</p>
            <dl>
              <div><dt>Базовая модель</dt><dd>${money(model.price)} у.е.</dd></div>
              <div><dt>Покрытие · ${color.name}</dt><dd>${color.add ? `+ ${money(color.add)}` : "0"} у.е.</dd></div>
              <div><dt>Комплектация · ${pack.name}</dt><dd>${pack.add ? `+ ${money(pack.add)}` : "0"} у.е.</dd></div>
              ${extras.map((item) => `<div><dt>${item.name}</dt><dd>+ ${money(item.add)} у.е.</dd></div>`).join("")}
            </dl>
            <div class="build-summary__total"><span>Итоговая стоимость конфигурации</span><strong data-total-price="${total}">${money(total)} <small>у.е.</small></strong></div>
            <p class="build-summary__note">Стоимость рассчитана по выбранным параметрам. Доставка, налоги и индивидуальная интеграция согласуются отдельно.</p>
            <button class="button button--accent" type="button" data-open-order>Получить предложение</button>
          </section>
        </div>
      </section>`;

    root.querySelectorAll("[data-model]").forEach((button) => button.addEventListener("click", () => {
      selectModel(button.dataset.model);
    }));
    root.querySelectorAll("[data-color]").forEach((button) => button.addEventListener("click", () => {
      selectedColor = button.dataset.color;
      updateUrl();
      render();
    }));
    root.querySelectorAll("[data-package]").forEach((button) => button.addEventListener("click", () => {
      selectedPackage = button.dataset.package;
      updateUrl();
      render();
    }));
    root.querySelectorAll("[data-extra]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.extra;
      if (selectedExtras.has(id)) selectedExtras.delete(id);
      else selectedExtras.add(id);
      updateUrl();
      render();
    }));
    root.querySelectorAll("[data-step-target]").forEach((button) => button.addEventListener("click", () => {
      document.getElementById(button.dataset.stepTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    root.querySelector("[data-open-order]")?.addEventListener("click", () => {
      const selection = `${model.name}; ${color.name}; ${pack.name}${extras.length ? `; ${extras.map((item) => item.name).join(", ")}` : ""}; Итого: ${money(total)} у.е.`;
      const summary = document.querySelector("#order-selection");
      const hidden = document.querySelector("#order-configuration");
      if (summary) summary.textContent = selection;
      if (hidden) hidden.value = selection;
      const values = {
        "#order-product-id": model.id,
        "#order-product-name": model.name,
        "#order-color-name": color.name,
        "#order-package-name": pack.name,
        "#order-selected-options": JSON.stringify(extras.map(({ id, name, add }) => ({ id, name, add }))),
        "#order-total-price": String(total)
      };
      Object.entries(values).forEach(([selector, value]) => {
        const field = document.querySelector(selector);
        if (field) field.value = value;
      });
    });

    window.MDR_INIT_TURNTABLES?.(root);
    root.querySelector("[data-turntable]")?.mdrTurntable?.setFrames(model.views || [model.configImage], `${model.imageAlt} в цвете ${color.name}`);
    const configuration = {
      id: model.id,
      model,
      color,
      pack,
      extras,
      total,
      url: window.location.href
    };
    window.MDR_ACTIVE_CONFIGURATION = configuration;
    document.dispatchEvent(new CustomEvent("mdr:configurationchange", { detail: configuration }));
    document.dispatchEvent(new CustomEvent("mdr:productchange", { detail: { id: model.id } }));
  };

  const urlColor = params.get("color");
  const urlPackage = params.get("package");
  const urlExtras = (params.get("extras") || "").split(",").filter(Boolean);
  if (products[selected].colors.some((item) => item.id === urlColor)) selectedColor = urlColor;
  if (products[selected].packages.some((item) => item.id === urlPackage)) selectedPackage = urlPackage;
  selectedExtras = new Set(urlExtras.filter((id) => products[selected].extras.some((item) => item.id === id)));
  document.addEventListener("mdr:selectmodel", (event) => selectModel(event.detail?.id));
  document.addEventListener("mdr:addextra", (event) => {
    const id = event.detail?.id;
    if (!products[selected].extras.some((item) => item.id === id)) return;
    selectedExtras.add(id);
    updateUrl();
    render();
  });
  render();
})();
