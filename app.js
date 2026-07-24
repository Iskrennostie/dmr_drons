(() => {
  const products = window.MDR_PRODUCTS || {};
  const ids = window.MDR_MODEL_ORDER || Object.keys(products);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsViewTransitions = typeof document.startViewTransition === "function";
  const money = window.MDR_MONEY || ((value) => new Intl.NumberFormat("ru-RU").format(value));
  const pageFor = window.MDR_MODEL_PAGE || ((id) => `model.html?model=${id}`);

  const setTheme = (product, color = product.colors?.[0]) => {
    const accent = color?.ui || color?.hex || product.accent;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--hero-accent", accent);
    document.body.style.setProperty("--product-accent", accent);
  };

  // Мягкий переход между всеми внутренними страницами.
  const transitionLayer = document.createElement("div");
  transitionLayer.className = "page-transition-layer";
  transitionLayer.setAttribute("aria-hidden", "true");
  document.body.append(transitionLayer);
  window.addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));
  if (!reduceMotion) {
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (!["http:", "https:", "file:"].includes(destination.protocol) || destination.origin !== window.location.origin) return;
      const sameDocument = destination.pathname === window.location.pathname && destination.search === window.location.search;
      if (sameDocument && destination.hash) return;
      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(() => window.location.assign(destination.href), 360);
    });
  }

  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  menuToggle?.addEventListener("click", () => {
    const open = header?.classList.toggle("is-menu-open");
    menuToggle.setAttribute("aria-expanded", String(Boolean(open)));
  });
  document.querySelectorAll(".main-nav a").forEach((link) => link.addEventListener("click", () => {
    header?.classList.remove("is-menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }));

  // BMW-подобное мегаменю, но с собственной системой MDR.
  const categoryNames = {
    all: "Все модели",
    industrial: "Промышленные",
    creative: "Съёмка",
    speed: "Скоростные",
    security: "Наблюдение",
    mapping: "Картография",
    rescue: "Спасательные",
    marine: "Морские",
    agri: "Агро"
  };

  const ensureMegaMenu = () => {
    if (!header || !ids.length) return null;
    let panel = document.querySelector("[data-model-mega]");
    if (!panel) {
      panel = document.createElement("aside");
      panel.className = "model-mega";
      panel.dataset.modelMega = "";
      panel.setAttribute("aria-hidden", "true");
      panel.innerHTML = `
        <div class="model-mega__inner">
          <div class="model-mega__side">
            <p class="model-mega__label">Линейка MDR / 10 моделей</p>
            <div class="model-mega__filters" data-model-filters></div>
            <a href="buy.html" class="model-mega__build">Собрать свой MDR <span>↗</span></a>
          </div>
          <div class="model-mega__content">
            <div class="model-mega__heading"><div><small>Каталог</small><h2>Выберите характер миссии.</h2></div><button type="button" data-mega-close aria-label="Закрыть каталог">×</button></div>
            <div class="model-mega__grid" data-model-grid></div>
          </div>
        </div>`;
      header.insertAdjacentElement("afterend", panel);
    }

    let toggle = document.querySelector("[data-mega-toggle]");
    if (!toggle) {
      toggle = [...document.querySelectorAll(".main-nav a")].find((link) => /catalog|каталог|model/i.test(link.getAttribute("href") + link.textContent));
      if (toggle) toggle.dataset.megaToggle = "";
    }
    if (!toggle) return panel;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "mdr-model-menu");
    panel.id = "mdr-model-menu";

    const filterRoot = panel.querySelector("[data-model-filters]");
    const grid = panel.querySelector("[data-model-grid]");
    const categories = ["all", ...new Set(ids.map((id) => products[id].category))];
    filterRoot.innerHTML = categories.map((category, index) => (
      `<button type="button" class="${index === 0 ? "is-active" : ""}" data-model-filter="${category}">${categoryNames[category] || category}</button>`
    )).join("");

    const renderGrid = (category = "all") => {
      const visible = ids.filter((id) => category === "all" || products[id].category === category);
      grid.innerHTML = visible.map((id) => {
        const item = products[id];
        return `<a class="mega-model-card" href="${item.page}" style="--card-accent:${item.accent}">
          <div><img src="${item.image}" alt="" loading="lazy" style="--drone-filter:${item.colors[0].filter}"></div>
          <span>${item.name}</span><small>${item.tagline}</small><b>${item.priceLabel} <i>↗</i></b>
        </a>`;
      }).join("");
    };
    renderGrid();

    filterRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-model-filter]");
      if (!button) return;
      filterRoot.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
      renderGrid(button.dataset.modelFilter);
    });

    const setOpen = (open) => {
      panel.classList.toggle("is-open", open);
      document.body.classList.toggle("is-mega-open", open);
      panel.setAttribute("aria-hidden", String(!open));
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(!panel.classList.contains("is-open"));
    });
    panel.querySelector("[data-mega-close]")?.addEventListener("click", () => setOpen(false));
    panel.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
    return panel;
  };
  ensureMegaMenu();

  // Покадровый круговой осмотр из реальных ракурсов модели.
  const initTurntables = (scope = document) => {
    scope.querySelectorAll("[data-turntable]").forEach((root) => {
      if (root.dataset.turntableReady === "true") return;
      root.dataset.turntableReady = "true";
      const image = root.querySelector("[data-turntable-image]");
      const zone = root.querySelector("[data-turntable-zone]") || root;
      const label = root.querySelector("[data-turntable-value]");
      if (!image) return;

      const blend = image.cloneNode();
      blend.removeAttribute("data-turntable-image");
      blend.removeAttribute("data-hero-image");
      blend.removeAttribute("data-footer-image");
      blend.classList.add("turntable-blend");
      blend.setAttribute("aria-hidden", "true");
      blend.alt = "";
      image.insertAdjacentElement("afterend", blend);

      let frames = [image.getAttribute("src")].filter(Boolean);
      let angle = Number(root.dataset.turnAngle || 0);
      let pointerId = null;
      let startX = 0;
      let startAngle = angle;
      const preload = (src) => {
        const frame = new Image();
        frame.decoding = "async";
        frame.src = src;
      };
      const syncAppearance = () => {
        const filter = image.style.getPropertyValue("--drone-filter");
        blend.style.setProperty("--drone-filter", filter || "none");
      };
      const apply = () => {
        angle = ((angle % 360) + 360) % 360;
        const frameCount = Math.max(1, frames.length);
        const position = angle / (360 / frameCount);
        const baseIndex = Math.floor(position) % frameCount;
        const nextIndex = (baseIndex + 1) % frameCount;
        const phase = position - Math.floor(position);
        const easedPhase = phase * phase * (3 - 2 * phase);
        if (image.getAttribute("src") !== frames[baseIndex]) image.src = frames[baseIndex];
        if (blend.getAttribute("src") !== frames[nextIndex]) blend.src = frames[nextIndex];
        blend.style.opacity = frameCount > 1 ? String(easedPhase) : "0";
        syncAppearance();
        root.dataset.turnAngle = String(Math.round(angle));
        if (label) label.textContent = `${Math.round(angle)}°`;
      };
      const rotate = (delta) => {
        angle += delta;
        apply();
      };
      const reset = () => {
        angle = 0;
        apply();
      };
      const setFrames = (nextFrames, altText = image.alt) => {
        const cleanFrames = [...new Set((nextFrames || []).filter(Boolean))];
        frames = cleanFrames.length ? cleanFrames : [image.getAttribute("src")].filter(Boolean);
        frames.forEach(preload);
        image.alt = altText || image.alt;
        blend.alt = "";
        angle = 0;
        apply();
      };

      zone.addEventListener("pointerdown", (event) => {
        if (event.target.closest("a, button")) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startAngle = angle;
        zone.setPointerCapture?.(pointerId);
        root.classList.add("is-dragging");
      });
      zone.addEventListener("pointermove", (event) => {
        if (pointerId !== event.pointerId) return;
        angle = startAngle + (event.clientX - startX) * .64;
        apply();
      });
      const stop = (event) => {
        if (pointerId !== event.pointerId) return;
        pointerId = null;
        root.classList.remove("is-dragging");
      };
      zone.addEventListener("pointerup", stop);
      zone.addEventListener("pointercancel", stop);
      zone.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Home") reset();
        else rotate(event.key === "ArrowRight" ? 90 : -90);
      });
      root.querySelector("[data-turn-left]")?.addEventListener("click", () => rotate(-90));
      root.querySelector("[data-turn-right]")?.addEventListener("click", () => rotate(90));
      root.querySelector("[data-turn-reset]")?.addEventListener("click", reset);
      root.mdrTurntable = { reset, rotate, apply, setFrames };
      apply();
    });
  };
  window.MDR_INIT_TURNTABLES = initTurntables;
  initTurntables();

  const orderDialog = document.querySelector("#order-dialog");
  if (orderDialog) {
    const dialogTitle = orderDialog.querySelector("h2");
    if (dialogTitle) {
      dialogTitle.id ||= "order-dialog-title";
      orderDialog.setAttribute("aria-labelledby", dialogTitle.id);
    }
    const form = orderDialog.querySelector("#order-form");
    if (form && !form.elements.comment) {
      const label = document.createElement("label");
      label.innerHTML = 'Комментарий<textarea name="comment" rows="3" maxlength="1500" placeholder="Расскажите о задаче или удобном времени для звонка"></textarea>';
      form.querySelector("button[type=submit]")?.insertAdjacentElement("beforebegin", label);
    }
    if (form && !form.elements.configuration) {
      const configuration = document.createElement("input");
      configuration.type = "hidden";
      configuration.name = "configuration";
      configuration.value = document.body.dataset.product
        ? `Интерес к модели ${products[document.body.dataset.product]?.name || document.body.dataset.product}`
        : "Консультация по линейке MDR";
      form.prepend(configuration);
    }
  }
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-order-open], [data-open-order]")) {
      const form = orderDialog?.querySelector("#order-form");
      const submit = form?.querySelector("button[type=submit]");
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Отправить заявку";
      }
      form?.removeAttribute("aria-busy");
      orderDialog?.classList.remove("is-submitting", "is-success", "has-error");
      const message = form?.querySelector("#form-message");
      if (message) {
        message.textContent = "";
        message.className = "";
      }
      if (typeof orderDialog?.showModal === "function") {
        if (!orderDialog.open) orderDialog.showModal();
      } else orderDialog?.setAttribute("open", "");
    }
    const close = event.target.closest("[data-dialog-close]");
    if (close) {
      const dialog = close.closest("dialog");
      if (typeof dialog?.close === "function") dialog.close();
      else dialog?.removeAttribute("open");
    }
  });
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
  document.querySelector("#order-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = form.querySelector("button[type=submit]");
    const message = form.querySelector("#form-message");
    if (form.getAttribute("aria-busy") === "true") return;

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.sourceUrl = window.location.href;
    form.setAttribute("aria-busy", "true");
    orderDialog?.classList.remove("is-success", "has-error");
    orderDialog?.classList.add("is-submitting");
    submit.disabled = true;
    submit.textContent = "Отправляем…";
    message.textContent = "Сохраняем заявку в админке и отправляем уведомление на почту.";
    message.className = "is-pending";

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => window.clearTimeout(timeout));
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Сервер временно недоступен.");

      submit.textContent = `Заявка №${result.order.id} принята`;
      message.textContent = "Спасибо! Заявка сохранена в админке MDR. Почтовое уведомление отправляется владельцу.";
      message.className = "is-success";
      orderDialog?.classList.add("is-success");
      form.reset();
    } catch (error) {
      const offline = !navigator.onLine;
      submit.disabled = false;
      submit.textContent = "Повторить отправку";
      message.innerHTML = `${offline ? "Нет соединения с интернетом." : "Не удалось отправить заявку."} Попробуйте ещё раз или свяжитесь напрямую: <a href="tel:+998910018172">+998 91 001 81 72</a> · <a href="mailto:itaci3367@gmail.com">itaci3367@gmail.com</a>`;
      message.className = "is-error";
      orderDialog?.classList.add("has-error");
      console.error("[order]", error);
    } finally {
      form.removeAttribute("aria-busy");
      orderDialog?.classList.remove("is-submitting");
    }
  });

  // Ненавязчивая «живая» атмосфера без сдвига дрона и без влияния на компоновку.
  const ambientHero = document.querySelector(".home-hero");
  if (ambientHero && !reduceMotion && matchMedia("(pointer:fine)").matches) {
    const glow = document.createElement("span");
    glow.className = "ambient-pointer";
    glow.setAttribute("aria-hidden", "true");
    ambientHero.prepend(glow);
    let pointerFrame = 0;
    ambientHero.addEventListener("pointermove", (event) => {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const bounds = ambientHero.getBoundingClientRect();
        ambientHero.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
        ambientHero.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
      });
    }, { passive: true });
  }

  let scrollFrame = 0;
  window.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => header?.classList.toggle("is-condensed", window.scrollY > 28));
  }, { passive: true });

  const revealItems = [...document.querySelectorAll("[data-reveal]")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .1, rootMargin: "0px 0px -5%" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const renderCatalog = () => {
    const root = document.querySelector("[data-full-catalog]");
    if (!root) return;
    root.innerHTML = ids.map((id, index) => {
      const item = products[id];
      return `<article class="range-card" data-reveal style="--card-accent:${item.accent}">
        <a class="range-card__visual" href="${item.page}">
          <span>${String(index + 1).padStart(2, "0")} / ${String(ids.length).padStart(2, "0")}</span>
          <img src="${item.image}" alt="${item.imageAlt}" loading="lazy" style="--drone-filter:${item.colors[0].filter}">
        </a>
        <div class="range-card__copy">
          <div><small>${categoryNames[item.category]}</small><h3>${item.name}</h3><p>${item.tagline}</p></div>
          <div class="range-card__stats">${item.stats.slice(0, 2).map(([value, label]) => `<span><b>${value}</b><small>${label}</small></span>`).join("")}</div>
          <div class="range-card__actions"><strong>${item.priceLabel}</strong><a href="${item.page}">Подробнее</a><a href="buy.html?model=${id}">Настроить ↗</a></div>
        </div>
      </article>`;
    }).join("");
    root.querySelectorAll("[data-reveal]").forEach((item) => item.classList.add("is-visible"));
  };
  renderCatalog();

  const missionRail = document.querySelector("[data-mission-rail]");
  if (missionRail) {
    const actionCards = [...missionRail.querySelectorAll("[data-action-card]")];
    const galleryFilters = [...document.querySelectorAll("[data-gallery-model]")];
    const setGalleryModel = (id) => galleryFilters.forEach((button) => button.classList.toggle("is-active", button.dataset.galleryModel === id));
    const goToGalleryModel = (id, animate = true) => {
      const target = actionCards.find((card) => card.dataset.model === id);
      if (!target) return;
      setGalleryModel(id);
      missionRail.scrollTo({ left: target.offsetLeft - missionRail.offsetLeft, behavior: animate && !reduceMotion ? "smooth" : "auto" });
    };
    const scrollGallery = (direction) => missionRail.scrollBy({ left: direction * Math.max(280, missionRail.clientWidth * .82), behavior: reduceMotion ? "auto" : "smooth" });
    document.querySelector("[data-gallery-prev]")?.addEventListener("click", () => scrollGallery(-1));
    document.querySelector("[data-gallery-next]")?.addEventListener("click", () => scrollGallery(1));
    galleryFilters.forEach((button) => button.addEventListener("click", () => goToGalleryModel(button.dataset.galleryModel)));
    missionRail.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      scrollGallery(event.key === "ArrowRight" ? 1 : -1);
    });
    let frame;
    missionRail.addEventListener("scroll", () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nearest = actionCards.reduce((best, card) => (
          Math.abs(card.offsetLeft - missionRail.scrollLeft) < Math.abs(best.offsetLeft - missionRail.scrollLeft) ? card : best
        ));
        setGalleryModel(nearest.dataset.model);
      });
    }, { passive: true });
    document.addEventListener("mdr:productchange", (event) => {
      if (["heavy", "ultra", "fast"].includes(event.detail.id)) goToGalleryModel(event.detail.id);
    });
    goToGalleryModel("ultra", false);
  }

  const buildFooterStudio = () => {
    const footer = document.querySelector(".site-footer");
    if (!footer || document.querySelector("[data-footer-studio]")) return null;
    const section = document.createElement("section");
    section.className = "footer-studio";
    section.dataset.footerStudio = "";
    section.innerHTML = `
      <div class="footer-studio__head">
        <div><small>Интерактивный студийный обзор</small><h2 data-footer-name>MDR Ultra Light</h2></div>
        <div class="footer-studio__switch"><button type="button" data-footer-prev aria-label="Предыдущая модель">←</button><span data-footer-count>02 / 10</span><button type="button" data-footer-next aria-label="Следующая модель">→</button></div>
      </div>
      <div class="footer-studio__viewer" data-turntable>
        <div class="footer-studio__zone" data-turntable-zone tabindex="0" aria-label="Поверните дрон перетаскиванием">
          <span class="footer-studio__halo" aria-hidden="true"></span>
          <img data-footer-image data-turntable-image src="${products.ultra?.image || products[ids[0]].image}" alt="">
        </div>
        <div class="turntable-controls">
          <button type="button" data-turn-left aria-label="Повернуть влево">↶</button>
          <button type="button" data-turn-reset><span data-turntable-value>0°</span> / 360°</button>
          <button type="button" data-turn-right aria-label="Повернуть вправо">↷</button>
        </div>
      </div>
      <div class="footer-studio__meta"><p data-footer-tagline></p><div><a data-footer-detail href="#">Характеристики</a><a data-footer-buy href="#">Настроить и купить ↗</a></div></div>`;
    footer.insertAdjacentElement("beforebegin", section);
    initTurntables(section);
    return section;
  };

  const footerStudio = buildFooterStudio() || document.querySelector("[data-footer-studio]");
  let footerIndex = Math.max(0, ids.indexOf(document.body.dataset.product || "ultra"));
  const setFooterProduct = (id) => {
    if (!footerStudio || !products[id]) return;
    footerIndex = ids.indexOf(id);
    const item = products[id];
    const color = item.colors[0];
    footerStudio.style.setProperty("--studio-accent", color.ui || item.accent);
    footerStudio.querySelector("[data-footer-name]").textContent = item.name;
    footerStudio.querySelector("[data-footer-tagline]").textContent = `${item.tagline} ${item.stats[0][0]} — ${item.stats[0][1]}.`;
    footerStudio.querySelector("[data-footer-count]").textContent = `${String(footerIndex + 1).padStart(2, "0")} / ${String(ids.length).padStart(2, "0")}`;
    const image = footerStudio.querySelector("[data-footer-image]");
    image.src = item.image;
    image.alt = item.imageAlt;
    image.style.setProperty("--drone-filter", color.filter);
    footerStudio.querySelector("[data-footer-detail]").href = item.page;
    footerStudio.querySelector("[data-footer-buy]").href = `buy.html?model=${id}`;
    footerStudio.mdrActiveModel = id;
    footerStudio.querySelector("[data-turntable]")?.mdrTurntable?.setFrames(item.views || [item.image], item.imageAlt);
  };
  footerStudio?.querySelector("[data-footer-prev]")?.addEventListener("click", () => setFooterProduct(ids[(footerIndex - 1 + ids.length) % ids.length]));
  footerStudio?.querySelector("[data-footer-next]")?.addEventListener("click", () => setFooterProduct(ids[(footerIndex + 1) % ids.length]));
  document.addEventListener("mdr:productchange", (event) => setFooterProduct(event.detail.id));
  if (footerStudio) setFooterProduct(ids[footerIndex]);

  const slider = document.querySelector("[data-product-slider]");
  if (!slider || !ids.length) return;

  let index = Math.max(0, ids.indexOf(slider.dataset.initialModel || "ultra"));
  let swapTimer;
  let activeViewTransition;
  const stageImage = slider.querySelector("[data-hero-image]");
  const title = slider.querySelector("[data-hero-title]");
  const tagline = slider.querySelector("[data-hero-tagline]");
  const detail = slider.querySelector("[data-hero-detail]");
  const preOrder = slider.querySelector("[data-hero-buy]");
  const tabsRoot = slider.querySelector(".home-tabs");
  const turntable = slider.querySelector("[data-turntable]");
  const counter = slider.querySelector("[data-hero-counter]");

  tabsRoot.innerHTML = ids.map((id) => `<a class="home-tab" data-product-tab="${id}" href="${products[id].page}"><span>${products[id].name}</span><i>↗</i></a>`).join("");
  const tabs = [...tabsRoot.querySelectorAll("[data-product-tab]")];
  ids.forEach((id) => {
    (products[id].views || [products[id].image]).forEach((src) => {
      const preload = new Image();
      preload.src = src;
    });
  });

  const applyProduct = (item) => {
    const color = item.colors[0];
    stageImage.src = item.image;
    stageImage.alt = item.imageAlt;
    stageImage.style.setProperty("--drone-filter", color.filter);
    title.innerHTML = `${item.displayLead} <span class="title-accent">${item.displayAccent}</span>`;
    title.classList.toggle("is-long-title", `${item.displayLead} ${item.displayAccent}`.length > 16);
    tagline.textContent = item.tagline;
    detail.href = item.page;
    preOrder.href = `buy.html?model=${item.id}`;
    if (counter) counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(ids.length).padStart(2, "0")}`;
    setTheme(item, color);
    tabs.forEach((tab) => {
      const selected = tab.dataset.productTab === item.id;
      tab.classList.toggle("is-active", selected);
      if (selected) {
        tab.setAttribute("aria-current", "true");
        tab.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
      } else tab.removeAttribute("aria-current");
    });
    turntable?.mdrTurntable?.setFrames(item.views || [item.image], item.imageAlt);
    document.dispatchEvent(new CustomEvent("mdr:productchange", { detail: { id: item.id } }));
  };

  const setProduct = (next, requestedDirection) => {
    const nextIndex = (next + ids.length) % ids.length;
    if (nextIndex === index) return;
    const previousIndex = index;
    index = nextIndex;
    const item = products[ids[index]];
    const direction = requestedDirection || (index > previousIndex ? "next" : "prev");
    clearTimeout(swapTimer);
    if (!reduceMotion && supportsViewTransitions) {
      activeViewTransition?.skipTransition?.();
      document.documentElement.dataset.slideDirection = direction;
      const transition = document.startViewTransition(() => applyProduct(item));
      activeViewTransition = transition;
      transition.finished.finally(() => {
        if (activeViewTransition !== transition) return;
        delete document.documentElement.dataset.slideDirection;
        activeViewTransition = null;
      });
      return;
    }
    stageImage.classList.add("is-changing");
    swapTimer = setTimeout(() => {
      applyProduct(item);
      stageImage.classList.remove("is-changing");
    }, reduceMotion ? 0 : 150);
  };

  slider.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", () => {
    const direction = button.dataset.direction;
    setProduct(index + (direction === "next" ? 1 : -1), direction);
  }));
  applyProduct(products[ids[index]]);
})();
