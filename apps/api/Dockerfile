FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --include=dev --legacy-peer-deps

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force
COPY db ./db
COPY scripts ./scripts
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["sh", "-c", "npm run db:apply-schema && npm run start"]
