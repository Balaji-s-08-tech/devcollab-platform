
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini
COPY package*.json ./

FROM base AS deps
ENV NODE_ENV=development
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3443
ENTRYPOINT ["tini", "--"]
CMD ["npm", "run", "dev"]

FROM base AS prod-deps
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 3443
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3443}/health" || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
