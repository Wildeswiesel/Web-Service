FROM node:22

WORKDIR /app/fensterkontakt

COPY fensterkontakt/package*.json ./

RUN npm install

COPY fensterkontakt/. .

CMD ["npm", "start"]
