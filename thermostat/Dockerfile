FROM node:22

WORKDIR /app/thermostat

COPY thermostat/package*.json ./
RUN npm install

COPY thermostat/. .

EXPOSE 3001

CMD ["npm", "start"]
