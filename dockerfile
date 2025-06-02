FROM node:20
WORKDIR /app
COPY package.json .
COPY package-lock.json . # se existir
RUN npm install
COPY . .
EXPOSE 80
CMD ["npm", "start"]
