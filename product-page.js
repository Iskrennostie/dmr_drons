(() => {
  const products = window.MDR_PRODUCTS || {};
  const ids = window.MDR_MODEL_ORDER || Object.keys(products);
  const requested = new URLSearchParams(location.search).get("model");
  const id = products[requested] ? requested : document.body.dataset.product;
  const product = products[id];
  if (!product) {
    location.replace("index.html");
    return;
  }

  document.body.dataset.product = product.id;
  document.title = `${product.name} — MDR`;
  const color = product.colors[0];
  const accent = color.ui || product.accent;
  document.documentElement.style.setProperty("--accent", accent);
  document.body.style.setProperty("--product-accent", accent);
  const root = document.querySelector("#product-root");
  const index = ids.indexOf(product.id);
  const related = [1, 2, 3].map((offset) => products[ids[(index + offset) % ids.length]]);

  root.innerHTML = `
    <section class="product-hero product-hero--${product.id}" style="--model-accent:${accent}">
      <div class="product-hero__copy wrap">
        <p class="kicker">${product.eyebrow}</p>
        <h1><span>${product.displayLead}</span> <b>${product.displayAccent}</b></h1>
        <p class="hero-lead">${product.tagline}</p>
        <p class="product-hero__text">${product.description}</p>
        <div class="hero-actions">
          <a class="button button--accent" href="buy.html?model=${product.id}">Настроить и купить</a>
          <a class="button button--ghost" href="#details">Характеристики</a>
        </div>
      </div>
      <div class="product-hero__viewer" data-turntable>
        <div class="product-hero__turn-zone" data-turntable-zone tabindex="0" aria-label="Поверните дрон перетаскиванием">
          <span class="product-hero__light" aria-hidden="true"></span>
          <img class="product-hero__image" data-turntable-image src="${product.image}" alt="${product.imageAlt}" style="--drone-filter:${color.filter}" />
          <div class="product-hero__ring" aria-hidden="true"></div>
        </div>
        <div class="turntable-controls">
          <button type="button" data-turn-left aria-label="Повернуть влево">↶</button>
          <button type="button" data-turn-reset><span data-turntable-value>0°</span> / 360°</button>
          <button type="button" data-turn-right aria-label="Повернуть вправо">↷</button>
        </div>
      </div>
    </section>
    <section class="product-stats wrap" aria-label="Ключевые характеристики">
      ${product.stats.map(([number, caption]) => `<article><strong>${number}</strong><span>${caption}</span></article>`).join("")}
    </section>
    <section class="product-story wrap" id="details">
      <div><p class="kicker">Конструкция</p><h2>Инженерия<br />на своём месте.</h2></div>
      <p>${product.story}</p>
    </section>
    <section class="feature-cards wrap">
      ${product.features.map(([title, text], featureIndex) => `<article><span>0${featureIndex + 1}</span><h3>${title}</h3><p>${text}</p></article>`).join("")}
    </section>
    <section class="specs wrap">
      <div><p class="kicker">Паспорт модели</p><h2>Точные параметры<br />для точной работы.</h2><a class="button button--dark" href="buy.html?model=${product.id}">Открыть конфигуратор</a></div>
      <dl>${product.specs.map(([term, description]) => `<div><dt>${term}</dt><dd>${description}</dd></div>`).join("")}</dl>
    </section>
    <section class="other-models wrap">
      <div class="other-models__head"><p class="kicker">Другие модели</p><h2>Другая миссия — другой MDR.</h2></div>
      <div class="other-models__grid">
        ${related.map((item) => `<a href="${item.page}" style="--related-accent:${item.accent}">
          <img src="${item.image}" alt="" loading="lazy" style="--drone-filter:${item.colors[0].filter}" />
          <small>${item.eyebrow}</small><strong>${item.name}</strong><span>${item.priceLabel} · Подробнее ↗</span>
        </a>`).join("")}
      </div>
    </section>`;

  window.MDR_INIT_TURNTABLES?.(root);
  root.querySelector("[data-turntable]")?.mdrTurntable?.setFrames(product.views || [product.image], product.imageAlt);
  document.dispatchEvent(new CustomEvent("mdr:productchange", { detail: { id: product.id } }));
})();
