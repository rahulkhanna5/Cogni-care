# CogniCare API — production image.
#
# Two stages: compile TypeScript with dev dependencies, then ship only the
# compiled JS, production dependencies and the SQL migrations (the server runs
# them itself on start, from src/db/migrations — see server.ts/migrate.ts).
# Debian slim, not Alpine: argon2's prebuilt binary is for glibc.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./src/db/migrations
# Never run as root inside the container.
USER node
EXPOSE 8080
CMD ["node", "dist/src/server.js"]
