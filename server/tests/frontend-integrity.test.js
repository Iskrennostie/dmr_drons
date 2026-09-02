import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const web = path.join(root, "src", "web");
const publicWeb = path.join(root, "public");

const read = (file) => readFile(file, "utf8");

test("only the clean v22 storefront source is published", async () => {
  const build = await read(path.join(root, "build", "sync-static.mjs"));
  assert.match(build, /src\/web/);
  assert.doesNotMatch(build, /rootHtml/);

  const pages = ["index.html", "buy.html", "model.html", "about.html", "contacts.html", "reviews.html", "admin.html"];
  for (const page of pages) {
    await access(path.join(web, page));
    const html = await read(path.join(web, page));
    assert.match(html, /styles\/app\.css\?v=22/);
    assert.match(html, /js\/main\.js\?v=22/);
    assert.doesNotMatch(html, /(?:studio|cockpit|mission-control|overrides|evolution)\.js/);
    assert.doesNotMatch(html, /(?:studio|cockpit|mission-control|overrides|evolution)\.css/);
  }

  const publishedFiles = await readdir(publicWeb);
  assert.ok(publishedFiles.includes("index.html"));
  assert.ok(!publishedFiles.includes("studio.js"));
  assert.ok(!publishedFiles.includes("cockpit.js"));
  assert.ok(!publishedFiles.includes("mission-control.js"));
});

test("the purchase flow uses one accessible native dialog and never hides the cursor", async () => {
  const script = await read(path.join(web, "js", "main.js"));
  const styles = await read(path.join(web, "styles", "app.css"));
  assert.match(script, /dialog\.id = "order-dialog"/);
  assert.equal((script.match(/id = "order-dialog"/g) || []).length, 1);
  assert.match(script, /dialog\.showModal\(\)/);
  assert.match(script, /fetch\("\/api\/orders"/);
  assert.doesNotMatch(script, /warmOrderService|\/api\/health\?wake|has-studio-cursor/);
  assert.doesNotMatch(styles, /cursor\s*:\s*none/i);
  assert.match(styles, /button,a,input,textarea,select\{cursor:pointer\}/);
  assert.match(styles, /input,textarea,select\{cursor:text\}/);
});

test("the active configurator is interactive geometry, not a competing frame carousel", async () => {
  const viewer = await read(path.join(web, "js", "viewer.js"));
  const main = await read(path.join(web, "js", "main.js"));
  assert.match(viewer, /class DroneViewer/);
  assert.match(viewer, /pointerdown/);
  assert.match(viewer, /rotateY/);
  assert.match(viewer, /mode === "xray"/);
  assert.match(main, /data-select-color/);
  assert.match(main, /state\.viewer\.setProduct/);
  assert.doesNotMatch(main, /turntable/);
});

test("Render liveness stays healthy while database readiness is checked separately", async () => {
  const server = await read(path.join(root, "server", "app.js"));
  assert.match(server, /app\.get\("\/api\/health"/);
  assert.match(server, /response\.status\(200\)\.json/);
  assert.match(server, /app\.get\("\/api\/readiness"/);
  assert.match(server, /database\.connected \? 200 : 503/);
  assert.match(server, /styleSrc: \["'self'", "'unsafe-inline'"\]/);
});

test("order route remains idempotent and email delivery is separated from saving", async () => {
  const route = await read(path.join(root, "server", "routes", "orders.js"));
  const email = await read(path.join(root, "server", "email.js"));
  const database = await read(path.join(root, "server", "db.js"));
  assert.match(route, /WHERE client_request_id = \$1 LIMIT 1/);
  assert.match(route, /ON CONFLICT \(client_request_id\)/);
  assert.match(route, /void notifyOrderByEmail/);
  assert.match(email, /AbortSignal\.timeout\(EMAIL_TIMEOUT_MS\)/);
  assert.match(email, /email_status = 'unconfigured'/);
  assert.match(database, /ETIMEDOUT/);
  assert.match(database, /57P03/);
});
