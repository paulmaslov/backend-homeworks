# syntax=docker/dockerfile:1

FROM node:24.22.0-alpine3.24 AS base
WORKDIR /app

# все зависимости, включая dev: typescript и nest cli нужны для сборки.
# --ignore-scripts: не запускать скрипты пакетов, после установки
# husky (для гит хука) не нужен, а нативные модули грузят готовые бинарники
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

FROM deps AS build
COPY . .
RUN npx nest build user-service && npx nest build notification-service

# только то, что нужно приложению при работе
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

# общая часть двух образов
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
# argon2 и sharp ищут бинарник под musl только при require - проверяем при сборке
RUN node -e "require('argon2'); require('sharp')"
USER node

FROM runtime AS user-service
COPY --from=build /app/dist/apps/user-service ./dist
EXPOSE 3000
CMD ["node", "dist/apps/user-service/src/main.js"]

FROM runtime AS notification-service
COPY --from=build /app/dist/apps/notification-service ./dist
EXPOSE 3001
CMD ["node", "dist/apps/notification-service/src/main.js"]