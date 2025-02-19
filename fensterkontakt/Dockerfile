FROM node:18

WORKDIR /app/fensterkontakt

COPY fensterkontakt/package*.json ./

RUN npm install

COPY fensterkontakt/. .

EXPOSE 3002

CMD ["npm", "start"]
