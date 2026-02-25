FROM node:20-alpine
WORKDIR /web-app
COPY . .
RUN npm install -g http-server
EXPOSE 8081
CMD ["http-server", ".", "-p", "8081"]
