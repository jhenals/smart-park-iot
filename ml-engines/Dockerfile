FROM node:20-alpine

WORKDIR /usr/src/app

COPY ml-engines/package*.json ./
RUN npm ci

COPY ml-engines/ ./
COPY firebase-config/ ./firebase-config/

CMD ["node", "server.js"]