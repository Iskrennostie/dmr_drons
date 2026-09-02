# MDR Drone Studio

MDR is a full-stack catalogue and configurator for ten drone platforms. The live
application is intentionally small and has one runtime path: Express serves the
static storefront, PostgreSQL saves customer data, and Resend delivers owner
notifications by email.

## Active architecture

```text
src/web/                 The only published storefront source
  ├─ *.html              Pages: catalogue, model, configurator, company, contacts, reviews, admin
  ├─ js/catalog.js       Ten-model product data and configuration options
  ├─ js/main.js          Page rendering, one order dialog, form/API client
  ├─ js/viewer.js        Dependency-free interactive 3D canvas model
  └─ styles/app.css      The only active stylesheet
server/
  ├─ app.js              HTTP security, liveness/readiness, static files and API routes
  ├─ routes/             Orders, reviews and protected admin API
  ├─ email.js            Transactional email outbox via Resend
  └─ migrations/         PostgreSQL schema migrations
build/sync-static.mjs    Publishes only src/web/ into public/
```

Legacy design experiments can remain in the repository for reference, but they
are not copied to `public/` and cannot be loaded by the running site. There is
no React, Next, Vite, Cloudflare worker, Telegram process or second visual
runtime in the active application.

## What works

- One product route and one purchase flow for all ten models.
- Configurator changes the product model, material colour, package, options and
  calculated final price in one state object.
- The studio canvas is a real interactive geometric renderer: drag or use the
  arrows to turn it, turn on X-Ray, Night LEDs or weather conditions. It does
  not claim to be a manufacturer CAD/photorealistic digital twin.
- One native `<dialog>` order form. Standard system pointer/text cursors stay
  visible and the form gets focus when it opens.
- A submitted order is validated, stored in PostgreSQL first, and then queued
  for email. Repeating a request does not create a duplicate.
- `/admin.html` has password/JWT-protected access to saved orders and pending
  reviews.
- `/api/health` is a liveness probe and always returns `200` for a running Node
  process. `/api/readiness` reports database connectivity separately, so an
  idle database cannot cause Render to repeatedly restart the web process.

## Environment variables

Copy `.env.example` to `.env` for local development. Never commit a real key.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `DATABASE_SSL` | Render: `true` | Enables TLS for PostgreSQL |
| `RESEND_API_KEY` | for email | Resend server-side key |
| `ORDER_NOTIFICATION_EMAIL` | yes | Owner inbox (`itaci3367@gmail.com`) |
| `ORDER_EMAIL_FROM` | yes | Verified Resend sender address |
| `JWT_SECRET` | yes | 32+ character admin-token secret |
| `ADMIN_PASSWORD` | yes | Password for `/admin.html` |

Without `RESEND_API_KEY` an order is still stored in PostgreSQL and visible in
the admin panel; its email status is marked `unconfigured` instead of falsely
claiming delivery.

## Local run

Use Node.js 22 or newer and a PostgreSQL database.

```bash
cp .env.example .env
npm install
npm run build
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Check process liveness at
`http://localhost:3000/api/health` and database readiness at
`http://localhost:3000/api/readiness`.

## Checks

```bash
npm run check
npm test
```

The tests verify that only `src/web` gets published, the active build has one
order dialog and no hidden cursor, API saving stays idempotent, and liveness is
separate from database readiness.

## Render deployment

`render.yaml` defines one Node web service plus PostgreSQL:

1. Push this folder to a GitHub repository.
2. In Render choose **New → Blueprint** and select that repository.
3. Set `RESEND_API_KEY` and `ADMIN_PASSWORD` as secrets. Replace
   `ORDER_EMAIL_FROM` with a sender domain verified in Resend before production.
4. Render runs `npm install --omit=dev && npm run build`, migrations, and then
   `npm start`. Its health check uses `/api/health`.
5. Send one test request, check the record at `/admin.html`, and confirm the
   email in `itaci3367@gmail.com`.

Do not use the old Vite/Cloudflare configuration or a static hosting service
for this version: orders, reviews and email need the Express API and PostgreSQL.
