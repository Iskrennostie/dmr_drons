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

export const validateOrder = (body = {}) => {
  const name = cleanText(body.name, 120);
  const phone = normalizePhone(body.phone);
  const comment = cleanMultiline(body.comment, 1_500);
  const configuration = cleanMultiline(body.configuration, 3_000) || "Консультация по линейке MDR";
  const sourceUrl = cleanText(body.sourceUrl, 1_000);
  const errors = {};

  if (name.length < 2) errors.name = "Укажите имя (минимум 2 символа).";
  const digitCount = phone.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 18) errors.phone = "Укажите корректный номер телефона.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { name, phone, comment, configuration, sourceUrl }
  };
};

export const normalizeStatus = (value) => {
  const status = cleanText(value, 24).toLowerCase();
  return ["new", "processed", "deleted"].includes(status) ? status : null;
};
