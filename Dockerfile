FROM node:lts
WORKDIR /app
COPY . .
RUN yarn --prod
ENTRYPOINT ["node", "index.js"] 