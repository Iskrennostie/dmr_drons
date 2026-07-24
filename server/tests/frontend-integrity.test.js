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
    assert.doesNotMatch(html, /\?v=1[23]/);
    assert.match(html, /\?v=16/);
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
});

test("purchase form keeps structured buyer and configuration fields", async () => {
  const buy = await readFile(path.join(root, "buy.html"), "utf8");
  for (const field of ["email", "address", "productId", "productName", "colorName", "packageName", "selectedOptions", "totalPrice", "clientRequestId"]) {
    assert.match(buy, new RegExp(`name="${field}"`));
  }
  const app = await readFile(path.join(root, "app.js"), "utf8");
  assert.match(app, /90_000/);
});
