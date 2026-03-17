FROM node:20-alpine

WORKDIR /workspace

COPY package.json ./package.json
COPY packages ./packages
COPY samples/13-cache_redis_app ./samples/13-cache_redis_app

RUN npm install

WORKDIR /workspace/samples/13-cache_redis_app

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]