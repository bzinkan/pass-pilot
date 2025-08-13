# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=development

# Install deps
COPY package*.json ./
RUN npm i --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# ---- runtime image ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# copy built app (incl. node_modules)
COPY --from=build /app /app

# Railway sets PORT; your app must listen to it (your code already does)
EXPOSE 8080
CMD ["node","dist/server/index.js"]

