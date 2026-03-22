FROM node:20-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json tsconfig.json tsconfig.build.json ./
RUN npm install

FROM deps AS build
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
