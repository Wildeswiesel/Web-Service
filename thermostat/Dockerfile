FROM node:22

WORKDIR /app/thermostat

COPY thermostat/package*.json ./
RUN npm install

COPY thermostat/. .

CMD ["npm", "start"]
