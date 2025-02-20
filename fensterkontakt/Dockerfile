FROM node:22

WORKDIR /app/fensterkontakt

COPY fensterkontakt/package*.json ./

RUN npm install

COPY fensterkontakt/. .

EXPOSE 3021

CMD ["npm", "start"]
