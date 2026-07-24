# MDR Drone Studio

Полноценный сайт MDR: десять дронов, интерактивный конфигуратор, Node.js/Express,
PostgreSQL, email-уведомления и закрытая визуальная админка заявок.

## Что происходит после отправки формы

1. Сервер проверяет имя и телефон.
2. Заявка и вся выбранная конфигурация сохраняются в PostgreSQL.
3. Клиент сразу получает номер заявки.
4. Фоновая очередь отправляет письмо на `itaci3367@gmail.com`.
5. Заявка сразу появляется на странице `/admin.html`.
6. Если почтовый сервис временно недоступен, запись остаётся в базе, а отправка
   повторяется.

## Локальный запуск

Нужны Node.js 22+ и PostgreSQL.

```bash
cp .env.example .env
npm install
npm run build
npm run db:migrate
npm run dev
```

Сайт откроется на `http://localhost:3000`. Проверка сервера:
`http://localhost:3000/api/health`.

## Email и админка

Админка находится по адресу `/admin.html` и использует `ADMIN_PASSWORD`.
Письма отправляются через Resend. Секрет `RESEND_API_KEY` хранится только на
сервере; в код и Git он не попадает. Получатель уже задан:
`ORDER_NOTIFICATION_EMAIL=itaci3367@gmail.com`.

## Развёртывание на Render

В проекте есть `render.yaml`:

1. Загрузите проект в GitHub/GitLab.
2. В Render выберите **New → Blueprint** и подключите репозиторий.
3. Укажите секреты `RESEND_API_KEY` и `ADMIN_PASSWORD`.
4. После запуска проверьте `/api/health`, отправьте тестовую заявку и откройте
   `/admin.html`.

PostgreSQL, миграции, health check и очередь email настраиваются Blueprint-файлом.

## Развёртывание на VPS

Установите Docker и Compose, затем создайте `.env`:

```env
POSTGRES_PASSWORD=strong_database_password
PUBLIC_BASE_URL=https://mdr.example.com
RESEND_API_KEY=re_xxxxxxxxx
ORDER_NOTIFICATION_EMAIL=itaci3367@gmail.com
JWT_SECRET=another_long_random_secret
ADMIN_PASSWORD=strong_admin_password
```

Запуск:

```bash
docker compose up -d --build
```

Перед приложением следует поставить Caddy или Nginx с TLS-сертификатом.

## Закрытая админка и API

JWT не требуется покупателю. Он используется только для администрирования:

- `POST /api/admin/login` — получить токен по `ADMIN_PASSWORD`;
- `GET /api/admin/orders` — список заявок;
- `PATCH /api/admin/orders/:id` — изменить статус;
- `DELETE /api/admin/orders/:id` — мягко удалить заявку.

Передавайте токен в заголовке `Authorization: Bearer <token>`.

Telegram-модуль сохранён как необязательный дополнительный канал, но для работы
сайта и получения заявок он не требуется.

## Контакты MDR

- Телефон: `+998 91 001 81 72`
- Email: `itaci3367@gmail.com`
