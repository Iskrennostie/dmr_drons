(() => {
  const loginSection = document.querySelector("[data-admin-login]");
  const inboxSection = document.querySelector("[data-admin-inbox]");
  const loginForm = document.querySelector("[data-admin-login-form]");
  const loginMessage = document.querySelector("[data-admin-login-message]");
  const list = document.querySelector("[data-admin-order-list]");
  const status = document.querySelector("[data-admin-status]");
  const signout = document.querySelector("[data-admin-signout]");
  const filters = [...document.querySelectorAll("[data-admin-filter]")];
  let token = sessionStorage.getItem("mdr-admin-token") || "";
  let activeFilter = "";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const request = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      const error = new Error(result.error || "Не удалось выполнить запрос.");
      error.status = response.status;
      throw error;
    }
    return result;
  };

  const setAuthenticated = (authenticated) => {
    loginSection.hidden = authenticated;
    inboxSection.hidden = !authenticated;
    signout.hidden = !authenticated;
  };

  const emailLabel = (order) => ({
    sent: "Письмо отправлено",
    sending: "Письмо отправляется",
    pending: "Письмо в очереди",
    failed: "Ошибка почты",
    unconfigured: "Почта не подключена"
  }[order.email_status] || "Статус почты неизвестен");

  const renderOrders = (orders) => {
    if (!orders.length) {
      list.innerHTML = `<div class="admin-empty"><span>/00</span><h2>Заявок пока нет.</h2><p>Новые обращения появятся здесь сразу после отправки формы на сайте.</p></div>`;
      return;
    }
    list.innerHTML = orders.map((order) => {
      const created = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at));
      return `<article class="admin-order" data-order-id="${order.id}">
        <header>
          <div><span>Заявка №${order.id}</span><time datetime="${order.created_at}">${created}</time></div>
          <i class="status-${order.status}">${order.status === "new" ? "Новая" : order.status === "processed" ? "Обработана" : "Удалена"}</i>
        </header>
        <div class="admin-order__grid">
          <div><small>Клиент</small><h2>${escapeHtml(order.name)}</h2><a href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)} ↗</a></div>
          <div><small>Конфигурация</small><p>${escapeHtml(order.configuration)}</p></div>
          <div><small>Комментарий</small><p>${escapeHtml(order.comment || "Без комментария")}</p></div>
        </div>
        <footer>
          <span class="email-${order.email_status || "pending"}">${emailLabel(order)}</span>
          <div>
            ${order.status !== "processed" ? `<button type="button" data-order-action="processed">Отметить обработанной</button>` : ""}
            ${order.status !== "deleted" ? `<button type="button" data-order-action="deleted">Удалить</button>` : ""}
          </div>
        </footer>
      </article>`;
    }).join("");
  };

  const loadOrders = async () => {
    status.textContent = "Загружаем заявки…";
    try {
      const query = activeFilter ? `?status=${encodeURIComponent(activeFilter)}` : "";
      const result = await request(`/api/admin/orders${query}`);
      renderOrders(result.orders);
      status.textContent = `Найдено: ${result.orders.length}`;
    } catch (error) {
      if (error.status === 401) {
        token = "";
        sessionStorage.removeItem("mdr-admin-token");
        setAuthenticated(false);
        loginMessage.textContent = "Сессия завершена. Войдите снова.";
        return;
      }
      status.textContent = error.message;
    }
  };

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector("button");
    submit.disabled = true;
    loginMessage.textContent = "Проверяем доступ…";
    try {
      const result = await request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: loginForm.elements.password.value })
      });
      token = result.token;
      sessionStorage.setItem("mdr-admin-token", token);
      loginMessage.textContent = "";
      loginForm.reset();
      setAuthenticated(true);
      await loadOrders();
    } catch (error) {
      loginMessage.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  signout?.addEventListener("click", () => {
    token = "";
    sessionStorage.removeItem("mdr-admin-token");
    setAuthenticated(false);
  });
  document.querySelector("[data-admin-refresh]")?.addEventListener("click", loadOrders);
  filters.forEach((filter) => filter.addEventListener("click", () => {
    activeFilter = filter.dataset.adminFilter;
    filters.forEach((item) => item.classList.toggle("is-active", item === filter));
    void loadOrders();
  }));
  list?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-order-action]");
    const article = button?.closest("[data-order-id]");
    if (!button || !article) return;
    button.disabled = true;
    status.textContent = "Обновляем заявку…";
    try {
      await request(`/api/admin/orders/${article.dataset.orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: button.dataset.orderAction })
      });
      await loadOrders();
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  });

  setAuthenticated(Boolean(token));
  if (token) void loadOrders();
})();
