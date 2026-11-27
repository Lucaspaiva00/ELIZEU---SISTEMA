FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN apk add --no-cache --virtual .build-deps python3 make g++ linux-headers && npm_config_nodedir=/usr/local npm ci && apk del .build-deps

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
