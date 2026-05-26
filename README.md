# RaidReminder

Next.js MVP для World of Warcraft:
- вход через Battle.net OAuth;
- ручная синхронизация всех персонажей аккаунта;
- конструктор PNG-баннера для Mythic+ группы;
- хранение пользователей, персонажей и баннеров в Postgres через Prisma.

## Стек

- Next.js 15 App Router
- TypeScript
- Tailwind CSS 4
- Auth.js / NextAuth
- Prisma + PostgreSQL
- Vitest

## Что умеет MVP

- логин через Battle.net;
- загрузка персонажей из WoW Profile API;
- ручное обновление данных по кнопке `Обновить персонажей`;
- список персонажей с `ilvl`, классом, миром и временем sync;
- создание баннера под Mythic+ ключ;
- выбор занятых ролей: `tank`, `healer`, `0-3 dps`;
- серверная генерация итогового PNG по маршруту `/banners/[id]/image`;
- копирование PNG в буфер обмена и скачивание.

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните значения:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/raidreminder?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
BATTLENET_CLIENT_ID="your-battlenet-client-id"
BATTLENET_CLIENT_SECRET="your-battlenet-client-secret"
```

## Локальный запуск

```bash
npm install
npm run prisma:generate
npm run dev
```

Если база уже готова, примените свою обычную миграцию Prisma. В репозитории есть `schema.prisma`, но миграции автоматически не запускались, потому что в среде разработки не была подключена живая Postgres-база.

## Полезные команды

```bash
npm run dev
npm run build
npm run lint
npm test
npm run prisma:generate
```

## Battle.net OAuth

Для приложения Battle.net нужен redirect URI на ваш auth callback:

```text
http://localhost:3000/api/auth/callback/battlenet
```

Первый релиз собран под:
- регион `EU`;
- текущий пул Mythic+ подземелий;
- локальные фоновые арты из `public/dungeons`.
