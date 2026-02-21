FROM node:22-alpine

WORKDIR /app

# Copy everything (node_modules excluded via .dockerignore)
COPY . .

# Install all workspace dependencies
RUN npm ci

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
