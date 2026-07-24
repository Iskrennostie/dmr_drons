import {
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  handleImageOptimization
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1Result {
  success: boolean;
  meta?: { last_row_id?: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface Env {
  ASSETS: AssetFetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  ADMIN_PASSWORD?: string;
  ADMIN_JWT_SECRET?: string;
  RESEND_API_KEY?: string;
  ORDER_NOTIFICATION_EMAIL?: string;
  ORDER_EMAIL_FROM?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }
});

const orderSchema = `
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    comment TEXT,
    configuration TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    source_url TEXT,
    user_agent TEXT,
    email_status TEXT NOT NULL DEFAULT 'pending',
    email_provider_id TEXT,
    email_error TEXT,
    email_sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,
    deleted_at TEXT
  )`;

const ensureDatabase = async (db: D1Database) => {
  await db.batch([
    db.prepare(orderSchema),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at DESC)")
  ]);
};

const readJson = async (request: Request) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("JSON_REQUIRED");
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 32_000) throw new Error("BODY_TOO_LARGE");
  return request.json() as Promise<Record<string, unknown>>;
};

const normalizeText = (value: unknown, maxLength: number) => String(value || "").trim().slice(0, maxLength);

const validateOrder = (payload: Record<string, unknown>) => {
  const name = normalizeText(payload.name, 120);
  const phone = normalizeText(payload.phone, 40);
  const comment = normalizeText(payload.comment, 1500);
  const configuration = normalizeText(payload.configuration || "Консультация по линейке MDR", 3000);
  const sourceUrl = normalizeText(payload.sourceUrl, 1000);
  const digits = phone.replace(/\D/g, "");
  if (name.length < 2 || digits.length < 7) return null;
  return { name, phone, comment, configuration, sourceUrl };
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const sendOrderEmail = async (env: Env, order: Record<string, unknown>) => {
  if (!env.RESEND_API_KEY || !env.ORDER_NOTIFICATION_EMAIL) {
    await env.DB.prepare("UPDATE orders SET email_status = 'unconfigured' WHERE id = ?").bind(order.id).run();
    return;
  }
  try {
    await env.DB.prepare("UPDATE orders SET email_status = 'sending', email_error = NULL WHERE id = ?").bind(order.id).run();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: env.ORDER_EMAIL_FROM || "MDR <onboarding@resend.dev>",
        to: [env.ORDER_NOTIFICATION_EMAIL],
        subject: `MDR — новая заявка №${order.id} от ${order.name}`,
        html: `<div style="background:#071012;color:#edf5f5;padding:32px;font-family:Arial,sans-serif">
          <p style="color:#8ad8df;letter-spacing:2px">MDR / НОВАЯ ЗАЯВКА</p>
          <h1>Заявка №${escapeHtml(order.id)}</h1>
          <p><b>Имя:</b> ${escapeHtml(order.name)}</p>
          <p><b>Телефон:</b> <a style="color:#8ad8df" href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)}</a></p>
          <p><b>Конфигурация:</b> ${escapeHtml(order.configuration)}</p>
          <p><b>Комментарий:</b> ${escapeHtml(order.comment || "Без комментария")}</p>
          <p style="color:#879497">Заявка также сохранена в закрытой админке MDR.</p>
        </div>`
      })
    });
    const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok) throw new Error(result.message || `Email ${response.status}`);
    await env.DB.prepare(
      "UPDATE orders SET email_status = 'sent', email_provider_id = ?, email_sent_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(result.id || null, order.id).run();
  } catch (error) {
    await env.DB.prepare(
      "UPDATE orders SET email_status = 'failed', email_error = ? WHERE id = ?"
    ).bind(String(error instanceof Error ? error.message : error).slice(0, 1000), order.id).run();
  }
};

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
};

const signToken = async (secret: string) => {
  const body = encodeBase64Url(JSON.stringify({ role: "admin", exp: Date.now() + 8 * 60 * 60 * 1000 }));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  return `${body}.${encodedSignature}`;
};

const verifyToken = async (token: string, secret: string) => {
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;
  try {
    const payload = JSON.parse(decodeBase64Url(body)) as { role?: string; exp?: number };
    if (payload.role !== "admin" || !payload.exp || payload.exp < Date.now()) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const normalized = signature.replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
    return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(body));
  } catch {
    return false;
  }
};

const isAdmin = async (request: Request, env: Env) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const secret = env.ADMIN_JWT_SECRET || env.ADMIN_PASSWORD || "";
  return Boolean(token && secret && await verifyToken(token, secret));
};

const handleApi = async (request: Request, env: Env, ctx: ExecutionContext) => {
  const url = new URL(request.url);
  await ensureDatabase(env.DB);

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      service: "mdr-sites-api",
      database: { configured: true, connected: true },
      email: {
        configured: Boolean(env.RESEND_API_KEY && env.ORDER_NOTIFICATION_EMAIL),
        recipient: env.ORDER_NOTIFICATION_EMAIL || "itaci3367@gmail.com"
      }
    });
  }

  if (url.pathname === "/api/orders" && request.method === "POST") {
    try {
      const validated = validateOrder(await readJson(request));
      if (!validated) return json({ ok: false, error: "Проверьте имя и телефон." }, 422);
      const result = await env.DB.prepare(
        `INSERT INTO orders (name, phone, comment, configuration, source_url, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *`
      ).bind(
        validated.name,
        validated.phone,
        validated.comment || null,
        validated.configuration,
        validated.sourceUrl || null,
        normalizeText(request.headers.get("user-agent"), 500) || null
      ).first<Record<string, unknown>>();
      if (!result) throw new Error("ORDER_NOT_CREATED");
      ctx.waitUntil(sendOrderEmail(env, result));
      return json({
        ok: true,
        order: { id: result.id, status: result.status, createdAt: result.created_at }
      }, 201);
    } catch {
      return json({ ok: false, error: "Не удалось сохранить заявку. Попробуйте ещё раз." }, 500);
    }
  }

  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    if (!env.ADMIN_PASSWORD) return json({ ok: false, error: "Пароль администратора ещё не настроен." }, 503);
    const payload: Record<string, unknown> = await readJson(request).catch(() => ({}));
    if (String(payload.password || "") !== env.ADMIN_PASSWORD) {
      return json({ ok: false, error: "Неверный пароль." }, 401);
    }
    return json({
      ok: true,
      token: await signToken(env.ADMIN_JWT_SECRET || env.ADMIN_PASSWORD),
      expiresIn: 28_800
    });
  }

  if (url.pathname.startsWith("/api/admin/")) {
    if (!await isAdmin(request, env)) return json({ ok: false, error: "Требуется вход." }, 401);

    if (url.pathname === "/api/admin/orders" && request.method === "GET") {
      const status = url.searchParams.get("status");
      const allowed = new Set(["new", "processed", "deleted"]);
      const statement = status && allowed.has(status)
        ? env.DB.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status)
        : env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");
      const result = await statement.all<Record<string, unknown>>();
      return json({ ok: true, orders: result.results });
    }

    const match = url.pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
    if (match && (request.method === "PATCH" || request.method === "DELETE")) {
      const payload: Record<string, unknown> = request.method === "PATCH" ? await readJson(request).catch(() => ({})) : {};
      const nextStatus = request.method === "DELETE" ? "deleted" : String(payload.status || "");
      if (!["new", "processed", "deleted"].includes(nextStatus)) {
        return json({ ok: false, error: "Недопустимый статус." }, 422);
      }
      const result = await env.DB.prepare(
        `UPDATE orders
            SET status = ?,
                processed_at = CASE WHEN ? = 'processed' THEN COALESCE(processed_at, CURRENT_TIMESTAMP) ELSE processed_at END,
                deleted_at = CASE WHEN ? = 'deleted' THEN COALESCE(deleted_at, CURRENT_TIMESTAMP) ELSE deleted_at END
          WHERE id = ?
          RETURNING *`
      ).bind(nextStatus, nextStatus, nextStatus, Number(match[1])).first<Record<string, unknown>>();
      if (!result) return json({ ok: false, error: "Заявка не найдена." }, 404);
      return json({ ok: true, order: result });
    }
  }

  return json({ ok: false, error: "API route not found." }, 404);
};

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.DB) return json({ ok: false, error: "База заявок ещё не подключена." }, 503);
      return handleApi(request, env, ctx);
    }
    if (url.pathname === "/_vinext/image") {
      const widths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        }
      }, widths);
    }
    return handler.fetch(request, env, ctx);
  }
};

export default worker;
