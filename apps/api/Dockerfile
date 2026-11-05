# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY shared/ shared/
COPY apps/api/ apps/api/
# npm checks every workspace against the lockfile, so the web manifest has to be present too.
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=apps/api --include-workspace-root=false
RUN npm run build --workspace=apps/api

FROM node:24-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DB_PATH=/data/pomodoro.db
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace=apps/api --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
