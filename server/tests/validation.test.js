import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReviewStatus, normalizeStatus, validateOrder, validateReview } from "../validation.js";

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

test("preserves a complete purchase configuration", () => {
  const result = validateOrder({
    name: "Иван",
    phone: "+998 91 123 45 67",
    email: "IVAN@example.com",
    address: "Ташкент, Юнусабад",
    orderType: "purchase",
    productId: "ultra",
    productName: "MDR Ultra Light",
    colorName: "Ледяной синий",
    packageName: "Creator Kit",
    selectedOptions: JSON.stringify([{ id: "care", name: "MDR Care 24", add: 690 }]),
    totalPrice: "10970",
    clientRequestId: "b8d40aa4-c59c-4c32-8af1-404f14e37b45"
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.email, "ivan@example.com");
  assert.equal(result.data.address, "Ташкент, Юнусабад");
  assert.equal(result.data.selectedOptions[0].name, "MDR Care 24");
  assert.equal(result.data.totalPrice, 10970);
});

test("purchase requires delivery location", () => {
  const result = validateOrder({
    name: "Иван",
    phone: "+998911234567",
    orderType: "purchase"
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.address, /адрес|город/i);
});

test("validates and moderates reviews", () => {
  const review = validateReview({
    name: "Оператор",
    productId: "heavy",
    productName: "MDR Heavy",
    rating: 5,
    comment: "Уверенно отработал промышленную инспекцию."
  });
  assert.equal(review.ok, true);
  assert.equal(normalizeReviewStatus("approved"), "approved");
  assert.equal(normalizeReviewStatus("published"), null);
});
