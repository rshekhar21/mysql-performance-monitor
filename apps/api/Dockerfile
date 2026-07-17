FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/collector/package.json apps/collector/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build:packages && npm run build:api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages ./packages
CMD ["node", "apps/api/dist/server.js"]
