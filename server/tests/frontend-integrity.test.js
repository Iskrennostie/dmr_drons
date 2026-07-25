import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

test("every turntable frame referenced by the catalog exists in source and build", async () => {
  const products = await readFile(path.join(root, "products.js"), "utf8");
  const references = [...new Set(
    [...products.matchAll(/["'](assets\/turntable\/[^"']+\.png)["']/g)].map((match) => match[1])
  )];

  assert.equal(references.length, 40);
  for (const reference of references) {
    await access(path.join(root, reference));
    await access(path.join(root, "public", reference));
  }
});

test("all HTML pages use the current asset version and email contact", async () => {
  const htmlFiles = (await readdir(root)).filter((file) => file.endsWith(".html"));
  assert.ok(htmlFiles.length >= 9);
  for (const filename of htmlFiles) {
    const html = await readFile(path.join(root, filename), "utf8");
    assert.doesNotMatch(html, /\?v=(?:1[236])/);
    assert.match(html, /\?v=18/);
  }
  const contacts = await readFile(path.join(root, "contacts.html"), "utf8");
  assert.match(contacts, /itaci3367@gmail\.com/);
});

test("orders are sent to the server instead of local browser storage", async () => {
  const app = await readFile(path.join(root, "app.js"), "utf8");
  assert.match(app, /fetch\("\/api\/orders"/);
  assert.doesNotMatch(app, /localStorage\.setItem\("mdr:requests"/);
});

test("admin inbox and studio motion assets are present", async () => {
  await access(path.join(root, "admin.html"));
  await access(path.join(root, "admin.js"));
  await access(path.join(root, "studio.css"));
  await access(path.join(root, "studio.js"));
  await access(path.join(root, "reviews.html"));
  await access(path.join(root, "reviews.js"));
  await access(path.join(root, "assets", "mdr-supply-director-v1.png"));
  await access(path.join(root, "assets", "mdr-owner-director-v3.jpg"));
});

test("purchase form keeps structured buyer and configuration fields", async () => {
  const buy = await readFile(path.join(root, "buy.html"), "utf8");
  for (const field of ["email", "address", "productId", "productName", "colorName", "packageName", "selectedOptions", "totalPrice", "clientRequestId"]) {
    assert.match(buy, new RegExp(`name="${field}"`));
  }
  const app = await readFile(path.join(root, "app.js"), "utf8");
  assert.match(app, /ORDER_MAX_ATTEMPTS = 3/);
  assert.match(app, /ORDER_FIRST_TIMEOUT_MS = 90_000/);
  assert.doesNotMatch(app, /message\.innerHTML = `\$\{reason\}/);
  const studio = await readFile(path.join(root, "studio.js"), "utf8");
  const studioCss = await readFile(path.join(root, "studio.css"), "utf8");
  assert.match(studio, /dialog\[open\]/);
  assert.match(studio, /has-native-dialog-cursor/);
  assert.match(studio, /is-suspended/);
  assert.doesNotMatch(studio, /host\.append\(cursor\)/);
  assert.match(studioCss, /body\.has-studio-cursor:has\(dialog\[open\]\)/);
  assert.match(studioCss, /cursor: text !important/);
  assert.match(studioCss, /cursor: pointer !important/);
});

test("email provider calls have a bounded timeout", async () => {
  const email = await readFile(path.join(root, "server", "email.js"), "utf8");
  assert.match(email, /EMAIL_TIMEOUT_MS = 20_000/);
  assert.match(email, /AbortSignal\.timeout\(EMAIL_TIMEOUT_MS\)/);
});

test("vinext and Cloudflare use one synchronous App Router configuration", async () => {
  const viteConfig = await readFile(path.join(root, "vite.config.ts"), "utf8");
  assert.match(viteConfig, /import vinext from "vinext"/);
  assert.match(viteConfig, /import \{ cloudflare \} from "@cloudflare\/vite-plugin"/);
  assert.match(viteConfig, /vinext\(\)/);
  assert.match(viteConfig, /name: "rsc"/);
  assert.match(viteConfig, /childEnvironments: \["ssr"\]/);
  assert.match(viteConfig, /name: "mdr-drone-studio"/);
  assert.match(viteConfig, /compatibility_date: "2026-07-25"/);
  assert.doesNotMatch(viteConfig, /defineConfig\(async/);
  assert.doesNotMatch(viteConfig, /import\s+rsc\s+from/);
});

test("order retries stay idempotent on the server", async () => {
  const route = await readFile(path.join(root, "server", "routes", "orders.js"), "utf8");
  assert.match(route, /WHERE client_request_id = \$1 LIMIT 1/);
  assert.match(route, /ON CONFLICT \(client_request_id\)/);
  assert.match(route, /duplicate: true/);
});

test("demo review cards are explicitly labelled and never mixed with verified reviews", async () => {
  const reviewsHtml = await readFile(path.join(root, "reviews.html"), "utf8");
  const reviewsJs = await readFile(path.join(root, "reviews.js"), "utf8");
  const expectedNames = [
    "Исмаилова Юлиана",
    "Мамедов Теймур",
    "Нуруллаев Абу-Суфен",
    "Собиржонов Умид",
    "Султанова Шахзода",
    "Тен Виктория",
    "Чаплыгина Варвара",
    "Югай Анастасия",
    "Ташпулатова Самира",
    "Рузимахов Абдулрауф",
    "Джураев Данияр",
    "Губайдулин Таймас"
  ];
  assert.match(reviewsHtml, /демонстрационные примеры/i);
  assert.match(reviewsHtml, /data-demo-review-list/);
  assert.match(reviewsJs, /review-card--demo/);
  for (const name of expectedNames) assert.match(reviewsJs, new RegExp(name));
});
