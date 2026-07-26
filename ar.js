(() => {
  const products = window.MDR_PRODUCTS || {};
  const params = new URLSearchParams(window.location.search);
  const model = products[params.get("model")] || products.ultra || Object.values(products)[0];
  const color = model.colors.find((item) => item.id === params.get("color")) || model.colors[0];
  const video = document.querySelector("[data-ar-video]");
  const object = document.querySelector("[data-ar-object]");
  const image = document.querySelector("[data-ar-image]");
  const status = document.querySelector("[data-ar-status]");
  let stream = null;
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;

  document.documentElement.style.setProperty("--accent", color.ui || model.accent);
  document.querySelector("[data-ar-model]").textContent = model.name;
  document.querySelector("[data-ar-back]").href = `buy.html?model=${model.id}&color=${color.id}`;
  image.src = model.image;
  image.alt = `${model.imageAlt} в цвете ${color.name}`;
  image.style.setProperty("--drone-filter", color.filter);

  const setPosition = (clientX, clientY) => {
    const x = Math.max(8, Math.min(92, ((clientX - offsetX) / innerWidth) * 100));
    const y = Math.max(18, Math.min(82, ((clientY - offsetY) / innerHeight) * 100));
    object.style.setProperty("--ar-x", `${x}%`);
    object.style.setProperty("--ar-y", `${y}%`);
  };

  object.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    const bounds = object.getBoundingClientRect();
    offsetX = event.clientX - (bounds.left + bounds.width / 2);
    offsetY = event.clientY - (bounds.top + bounds.height / 2);
    object.setPointerCapture?.(pointerId);
  });
  object.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    setPosition(event.clientX, event.clientY);
  });
  const stopDrag = (event) => {
    if (pointerId === event.pointerId) pointerId = null;
  };
  object.addEventListener("pointerup", stopDrag);
  object.addEventListener("pointercancel", stopDrag);

  document.querySelector("[data-ar-scale]").addEventListener("input", (event) => {
    object.style.setProperty("--ar-scale", String(Number(event.target.value) / 100));
  });
  document.querySelector("[data-ar-rotation]").addEventListener("input", (event) => {
    object.style.setProperty("--ar-rotation", `${event.target.value}deg`);
  });
  document.querySelector("[data-ar-reset]").addEventListener("click", () => {
    object.style.setProperty("--ar-x", "50%");
    object.style.setProperty("--ar-y", "58%");
    object.style.setProperty("--ar-scale", "1");
    object.style.setProperty("--ar-rotation", "0deg");
    document.querySelector("[data-ar-scale]").value = "100";
    document.querySelector("[data-ar-rotation]").value = "0";
  });

  document.querySelector("[data-ar-start]").addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = "Камера AR не поддерживается этим браузером. Откройте страницу в Safari или Chrome на телефоне.";
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      video.srcObject = stream;
      document.body.classList.add("is-ar-active");
      status.textContent = "Перетащите дрон на поверхность, настройте размер и поворот.";
    } catch (error) {
      status.textContent = error.name === "NotAllowedError"
        ? "Доступ к камере не разрешён. Разрешите камеру в настройках браузера и повторите."
        : "Не удалось открыть камеру на этом устройстве.";
    }
  });

  document.querySelector("[data-ar-capture]").addEventListener("click", () => {
    if (!stream || video.videoWidth === 0) {
      status.textContent = "Сначала запустите камеру.";
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const objectBounds = object.getBoundingClientRect();
    const scaleX = canvas.width / innerWidth;
    const scaleY = canvas.height / innerHeight;
    context.filter = color.filter || "none";
    context.drawImage(image, objectBounds.left * scaleX, objectBounds.top * scaleY, objectBounds.width * scaleX, objectBounds.height * scaleY);
    context.filter = "none";
    const link = document.createElement("a");
    link.download = `MDR-AR-${model.id}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", .9);
    link.click();
    status.textContent = "Кадр MDR AR сохранён.";
  });

  window.addEventListener("pagehide", () => {
    stream?.getTracks().forEach((track) => track.stop());
  }, { once: true });
})();
