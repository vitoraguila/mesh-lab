FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY . .
ARG SOURCE_REVISION=unknown
RUN printf "%s" "$SOURCE_REVISION" > source-revision.txt
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/proto ./proto
COPY --from=build --chown=node:node /app/server.cjs ./server.cjs
COPY --from=build --chown=node:node /app/node_modules/ws ./node_modules/ws
COPY --from=build --chown=node:node /app/source-revision.txt ./source-revision.txt
USER node
EXPOSE 3000
CMD ["node", "server.cjs"]
