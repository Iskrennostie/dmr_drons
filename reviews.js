(() => {
  const products = window.MDR_PRODUCTS || {};
  const ids = window.MDR_MODEL_ORDER || Object.keys(products);
  const list = document.querySelector("[data-review-list]");
  const count = document.querySelector("[data-review-count]");
  const form = document.querySelector("[data-review-form]");
  const message = document.querySelector("[data-review-message]");
  const productSelect = document.querySelector("[data-review-product]");
  const stars = [...document.querySelectorAll("[data-rating]")];

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  productSelect.innerHTML = ids.map((id) => (
    `<option value="${id}">${escapeHtml(products[id].name)}</option>`
  )).join("");

  const setRating = (rating) => {
    form.elements.rating.value = String(rating);
    stars.forEach((star) => {
      const active = Number(star.dataset.rating) <= rating;
      star.classList.toggle("is-active", active);
      star.setAttribute("aria-pressed", String(Number(star.dataset.rating) === rating));
    });
  };
  stars.forEach((star) => star.addEventListener("click", () => setRating(Number(star.dataset.rating))));
  setRating(5);

  const renderReviews = (reviews) => {
    count.textContent = String(reviews.length).padStart(2, "0");
    if (!reviews.length) {
      list.innerHTML = `<div class="reviews-empty"><span>/00</span><h3>Первый отзыв ещё впереди.</h3><p>Оставьте комментарий — после проверки он появится здесь.</p></div>`;
      return;
    }
    list.innerHTML = reviews.map((review, index) => {
      const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(review.created_at));
      const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
      return `<article class="review-card">
        <header><span>/${String(index + 1).padStart(2, "0")}</span><time datetime="${review.created_at}">${date}</time></header>
        <div class="review-card__stars" aria-label="${rating} из 5">${"★".repeat(rating)}<i>${"★".repeat(5 - rating)}</i></div>
        <blockquote>${escapeHtml(review.comment)}</blockquote>
        <footer><strong>${escapeHtml(review.name)}</strong><span>${escapeHtml(review.product_name || products[review.product_id]?.name || "MDR")}</span></footer>
      </article>`;
    }).join("");
  };

  const loadReviews = async () => {
    try {
      const response = await fetch("/api/reviews", { headers: { accept: "application/json" } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось загрузить отзывы.");
      renderReviews(result.reviews);
    } catch (error) {
      count.textContent = "—";
      list.innerHTML = `<div class="reviews-empty"><span>/!</span><h3>Отзывы временно недоступны.</h3><p>${escapeHtml(error.message)} Обновите страницу через минуту.</p></div>`;
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || form.getAttribute("aria-busy") === "true") return;
    const submit = form.querySelector("button[type=submit]");
    const productId = form.elements.productId.value;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.productName = products[productId]?.name || "MDR";
    payload.sourceUrl = location.href;
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submit.textContent = "Сохраняем…";
    message.textContent = "Отправляем отзыв в закрытую админку.";
    message.className = "is-pending";
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        const fieldMessage = result.fields ? Object.values(result.fields)[0] : "";
        throw new Error(fieldMessage || result.error || "Не удалось отправить отзыв.");
      }
      form.reset();
      setRating(5);
      message.textContent = `Отзыв №${result.review.id} сохранён и отправлен на модерацию. Спасибо!`;
      message.className = "is-success";
    } catch (error) {
      message.textContent = error.message;
      message.className = "is-error";
    } finally {
      form.removeAttribute("aria-busy");
      submit.disabled = false;
      submit.textContent = "Отправить на модерацию";
    }
  });

  void loadReviews();
})();
