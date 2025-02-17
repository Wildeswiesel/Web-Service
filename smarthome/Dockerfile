FROM node:18-alpine

WORKDIR /app

# package.json + package-lock.json ins Image kopieren
COPY package*.json ./

# Abhängigkeiten installieren
RUN npm install

# Restliche Dateien kopieren
COPY . .

# (optional) Node-Port
EXPOSE 3000

# Start-Befehl
CMD ["npm", "start"]
