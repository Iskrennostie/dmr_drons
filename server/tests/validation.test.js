import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStatus, validateOrder } from "../validation.js";

test("accepts a complete MDR order and normalizes the phone", () => {
  const result = validateOrder({
    name: " Иван ",
    phone: "+998 91 123-45-67",
    comment: "Хочу заказать.",
    configuration: "MDR Ultra Light; Graphite; 10 280 у.е.",
    sourceUrl: "https://mdr.example/buy.html"
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.name, "Иван");
  assert.equal(result.data.phone, "+998911234567");
  assert.equal(result.data.comment, "Хочу заказать.");
});

test("rejects an invalid name and phone", () => {
  const result = validateOrder({ name: "A", phone: "12" });
  assert.equal(result.ok, false);
  assert.match(result.errors.name, /имя/i);
  assert.match(result.errors.phone, /номер/i);
});

test("trims untrusted long fields and supplies a default configuration", () => {
  const result = validateOrder({
    name: "Алишер",
    phone: "+99833333333",
    comment: "x".repeat(2_000)
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.comment.length, 1_500);
  assert.equal(result.data.configuration, "Консультация по линейке MDR");
});

test("allows only known order statuses", () => {
  assert.equal(normalizeStatus("processed"), "processed");
  assert.equal(normalizeStatus(" DROP TABLE orders; "), null);
});
