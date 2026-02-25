FROM node:22-alpine

WORKDIR /app

# Copy everything (node_modules excluded via .dockerignore)
COPY . .

# Install all workspace dependencies
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-factor 2 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    (npm ci --no-audit --prefer-offline || npm ci --no-audit --prefer-offline || npm ci --no-audit --prefer-offline)

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build shared packages then the service
RUN npm run build -w packages/schemas && \
    npm run build -w packages/db && \
    npm run build -w packages/cache && \
    npm run build -w apps/habit-service

WORKDIR /app/apps/habit-service

ENV NODE_ENV=production

EXPOSE 4002

CMD ["node", "dist/index.js"]
