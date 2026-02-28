FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=true

FROM base AS pruner
RUN npm install -g turbo@2.8.1
COPY . .
RUN turbo prune --scope=@repo/analytics-service --docker

FROM base AS deps
COPY --from=pruner /app/out/json/ ./
RUN npm ci --workspaces --include-workspace-root=false --no-audit --no-fund

FROM base AS build
COPY --from=pruner /app/out/full/ ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm run generate -w @repo/db
RUN npm run build -w packages/schemas && \
    npm run build -w packages/db && \
    npm run build -w packages/cache && \
    npm run build -w apps/analytics-service

FROM base AS prod-deps
COPY --from=pruner /app/out/json/ ./
RUN npm ci --omit=dev --workspaces --include-workspace-root=false --no-audit --no-fund

FROM base AS prune-node-modules
COPY --from=prod-deps /app/node_modules ./node_modules
RUN find /app/node_modules -type f \( -name "*.md" -o -name "*.markdown" -o -name "*.map" -o -name "*.ts" -o -name "*.tsx" -o -name "*.flow" -o -name "*.html" \) -delete && \
    find /app/node_modules -type d \( -name test -o -name tests -o -name __tests__ -o -name docs -o -name examples -o -name example \) -prune -exec rm -rf {} + && \
    rm -rf /app/node_modules/prisma /app/node_modules/typescript /app/node_modules/@esbuild /app/node_modules/effect /app/node_modules/@electric-sql /app/node_modules/react-dom /app/node_modules/.package-lock.json /app/node_modules/esbuild /app/node_modules/tsx /app/node_modules/@prisma/studio-core /app/node_modules/@prisma/engines /app/node_modules/@prisma/fetch-engine /app/node_modules/@prisma/query-plan-executor /app/node_modules/@prisma/dev /app/node_modules/@prisma/client/generator-build /app/node_modules/@prisma/client/scripts /app/node_modules/@napi-rs/*musl* && \
    find /app/node_modules/@prisma/client/runtime -type f \( -name "*cockroachdb*" -o -name "*mysql*" -o -name "*sqlite*" -o -name "*sqlserver*" \) -delete

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prune-node-modules /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

COPY --from=build /app/apps/analytics-service/package.json ./apps/analytics-service/package.json
COPY --from=build /app/apps/analytics-service/dist ./apps/analytics-service/dist

COPY --from=build /app/packages/db/package.json ./packages/db/package.json
COPY --from=build /app/packages/db/dist ./packages/db/dist

COPY --from=build /app/packages/cache/package.json ./packages/cache/package.json
COPY --from=build /app/packages/cache/dist ./packages/cache/dist

COPY --from=build /app/packages/schemas/package.json ./packages/schemas/package.json
COPY --from=build /app/packages/schemas/dist ./packages/schemas/dist

WORKDIR /app/apps/analytics-service
EXPOSE 4003

CMD ["dist/index.js"]
