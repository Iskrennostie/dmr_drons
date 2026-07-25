(() => {
  const products = window.MDR_PRODUCTS || {};
  const ids = window.MDR_MODEL_ORDER || Object.keys(products);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  const categoryLabels = {
    industrial: "Промышленная платформа",
    creative: "Аэросъёмка",
    speed: "Скоростная система",
    security: "Наблюдение",
    mapping: "Картография",
    rescue: "Спасательные миссии",
    marine: "Морская инспекция",
    agri: "Агротехнологии"
  };

  const reveal = (scope = document) => {
    const items = [...scope.querySelectorAll("[data-studio-reveal], .model-chapter")];
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-inview"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -7%" });
    items.forEach((item) => observer.observe(item));
  };

  const sequence = document.querySelector("[data-model-sequence]");
  if (sequence && ids.length) {
    sequence.innerHTML = ids.map((id, index) => {
      const item = products[id];
      const stats = (item.stats || []).slice(0, 3);
      const number = String(index + 1).padStart(2, "0");
      const category = categoryLabels[item.category] || item.eyebrow || "Профессиональная система";
      const finish = item.colors?.[0];
      return `
        <article class="model-chapter" style="--model-accent:${finish?.ui || item.accent}; --model-filter:${finish?.filter || "none"}" data-model-chapter="${id}">
          <div class="model-chapter__wash" aria-hidden="true"></div>
          <div class="model-chapter__inner wrap">
            <header class="model-chapter__head" data-studio-reveal>
              <span>/${number}</span>
              <p>${category}</p>
              <small>MDR / ${String(ids.length).padStart(2, "0")}</small>
            </header>
            <a class="model-chapter__visual" href="${item.page}" data-cursor="СМОТРЕТЬ" aria-label="${item.name}: открыть характеристики">
              <span class="model-chapter__halo" aria-hidden="true"></span>
              <img src="${item.image}" alt="${item.imageAlt}" loading="lazy" />
            </a>
            <div class="model-chapter__content" data-studio-reveal>
              <div>
                <p>${item.eyebrow || category}</p>
                <h3>${item.name}</h3>
                <strong>${item.tagline}</strong>
              </div>
              <dl>
                ${stats.map(([value, label]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
              </dl>
              <div class="model-chapter__links">
                <a href="${item.page}" data-cursor="ОТКРЫТЬ">Характеристики <span>↗</span></a>
                <a href="buy.html?model=${id}" data-cursor="СОБРАТЬ">Настроить <span>↗</span></a>
              </div>
            </div>
          </div>
        </article>`;
    }).join("");
    reveal(sequence);
  }

  const progress = document.querySelector("[data-reading-progress]");
  if (progress) {
    let progressFrame = 0;
    const updateProgress = () => {
      progressFrame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / max))})`;
    };
    addEventListener("scroll", () => {
      if (progressFrame) return;
      progressFrame = requestAnimationFrame(updateProgress);
    }, { passive: true });
    updateProgress();
  }

  if (finePointer && !reduceMotion) {
    const cursor = document.createElement("div");
    cursor.className = "studio-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = "<i></i><span></span>";
    document.body.append(cursor);
    document.body.classList.add("has-studio-cursor");

    const syncCursorLayer = () => {
      const dialogs = [...document.querySelectorAll("dialog[open]")];
      const host = dialogs.at(-1) || document.body;
      if (cursor.parentElement !== host) host.append(cursor);
    };
    const dialogObserver = new MutationObserver(syncCursorLayer);
    document.querySelectorAll("dialog").forEach((dialog) => {
      dialogObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });
      dialog.addEventListener("close", syncCursorLayer);
      dialog.addEventListener("cancel", () => requestAnimationFrame(syncCursorLayer));
    });

    let targetX = 0;
    let targetY = 0;
    let cursorFrame = 0;
    let visible = false;
    const paintCursor = () => {
      cursorFrame = 0;
      cursor.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    };

    addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!cursorFrame) cursorFrame = requestAnimationFrame(paintCursor);
      if (!visible) {
        visible = true;
        cursor.classList.add("is-visible");
      }
    }, { passive: true });
    addEventListener("pointerleave", () => {
      visible = false;
      cursor.classList.remove("is-visible");
    });
    addEventListener("pointerdown", () => cursor.classList.add("is-pressed"));
    addEventListener("pointerup", () => cursor.classList.remove("is-pressed"));

    document.addEventListener("pointerover", (event) => {
      const interactive = event.target.closest("[data-cursor], [data-turntable-zone], a, button, input, textarea, select");
      if (!interactive) return;
      const label = interactive.dataset.cursor
        || (interactive.hasAttribute("data-turntable-zone") ? "ВРАЩАТЬ" : "")
        || (interactive.matches("input,textarea,select") ? "ВВОД" : "");
      cursor.querySelector("span").textContent = label;
      cursor.classList.toggle("has-label", Boolean(label));
      cursor.classList.add("is-active");
    });
    document.addEventListener("pointerout", (event) => {
      const interactive = event.target.closest("[data-cursor], [data-turntable-zone], a, button, input, textarea, select");
      if (!interactive || interactive.contains(event.relatedTarget)) return;
      cursor.classList.remove("is-active", "has-label");
      cursor.querySelector("span").textContent = "";
    });
    syncCursorLayer();
  }

  reveal();
})();
