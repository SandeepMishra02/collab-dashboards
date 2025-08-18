FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --legacy-peer-deps || npm i
COPY . .
EXPOSE 3000
CMD ["npm","run","dev"]
