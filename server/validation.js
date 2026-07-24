const cleanText = (value, maxLength) => String(value ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength);

const cleanMultiline = (value, maxLength) => String(value ?? "")
  .replace(/\r\n?/g, "\n")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  .trim()
  .slice(0, maxLength);

const normalizePhone = (value) => {
  const raw = cleanText(value, 40);
  const leadingPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return `${leadingPlus ? "+" : ""}${digits}`;
};

const cleanEmail = (value) => cleanText(value, 320).toLowerCase();

const cleanOptions = (value) => {
  let options = value;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = options.split(",").map((name) => ({ name }));
    }
  }
  if (!Array.isArray(options)) return [];
  return options.slice(0, 20).map((option) => ({
    id: cleanText(option?.id, 64),
    name: cleanText(option?.name ?? option, 160),
    add: Math.max(0, Math.min(100_000_000, Number.parseInt(option?.add, 10) || 0))
  })).filter((option) => option.name);
};

export const validateOrder = (body = {}) => {
  const name = cleanText(body.name, 120);
  const phone = normalizePhone(body.phone);
  const email = cleanEmail(body.email);
  const address = cleanMultiline(body.address, 700);
  const comment = cleanMultiline(body.comment, 1_500);
  const configuration = cleanMultiline(body.configuration, 3_000) || "Консультация по линейке MDR";
  const sourceUrl = cleanText(body.sourceUrl, 1_000);
  const orderType = cleanText(body.orderType, 24) === "purchase" ? "purchase" : "inquiry";
  const productId = cleanText(body.productId, 64);
  const productName = cleanText(body.productName, 160);
  const colorName = cleanText(body.colorName, 160);
  const packageName = cleanText(body.packageName, 160);
  const selectedOptions = cleanOptions(body.selectedOptions);
  const parsedTotal = Number.parseInt(body.totalPrice, 10);
  const totalPrice = Number.isSafeInteger(parsedTotal) && parsedTotal >= 0 && parsedTotal <= 100_000_000
    ? parsedTotal
    : null;
  const clientRequestId = cleanText(body.clientRequestId, 100);
  const errors = {};

  if (name.length < 2) errors.name = "Укажите имя (минимум 2 символа).";
  const digitCount = phone.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 18) errors.phone = "Укажите корректный номер телефона.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Укажите корректную почту.";
  if (orderType === "purchase" && address.length < 5) errors.address = "Укажите адрес или город доставки.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: {
      name,
      phone,
      email,
      address,
      comment,
      configuration,
      sourceUrl,
      orderType,
      productId,
      productName,
      colorName,
      packageName,
      selectedOptions,
      totalPrice,
      clientRequestId
    }
  };
};

export const normalizeStatus = (value) => {
  const status = cleanText(value, 24).toLowerCase();
  return ["new", "processed", "deleted"].includes(status) ? status : null;
};

export const validateReview = (body = {}) => {
  const name = cleanText(body.name, 120);
  const productId = cleanText(body.productId, 64);
  const productName = cleanText(body.productName, 160);
  const rating = Number.parseInt(body.rating, 10);
  const comment = cleanMultiline(body.comment, 1_500);
  const sourceUrl = cleanText(body.sourceUrl, 1_000);
  const errors = {};

  if (name.length < 2) errors.name = "Укажите имя (минимум 2 символа).";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Поставьте оценку от 1 до 5.";
  if (comment.length < 10) errors.comment = "Напишите отзыв длиной не менее 10 символов.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { name, productId, productName, rating, comment, sourceUrl }
  };
};

export const normalizeReviewStatus = (value) => {
  const status = cleanText(value, 24).toLowerCase();
  return ["pending", "approved", "rejected"].includes(status) ? status : null;
};
