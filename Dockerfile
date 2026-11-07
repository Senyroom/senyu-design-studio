FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://api:4000
RUN DATABASE_URL=mysql://build:build@127.0.0.1:3306/build pnpm build

FROM build AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 MEDIA_ROOT=/data/media
RUN mkdir -p /data/media && chown -R node:node /app /data
USER node
EXPOSE 3000 4000
CMD ["node", "apps/api/dist/main.js"]

FROM nginx:1.28-alpine AS gateway
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html/admin
EXPOSE 80
