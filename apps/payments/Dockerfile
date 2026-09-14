FROM node:24.11.0-alpine AS build
WORKDIR /app
COPY apps/payments/package.json apps/payments/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
FROM node:24.11.0-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY apps/payments/package.json apps/payments/server.js apps/payments/telemetry.js ./
ARG SOURCE_REVISION=unknown
ENV SOURCE_REVISION=${SOURCE_REVISION}
USER node
EXPOSE 8080
CMD ["node", "server.js"]
