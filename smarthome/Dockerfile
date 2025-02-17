FROM node:18

# Setze das richtige Arbeitsverzeichnis
WORKDIR /app/smarthome

# Kopiere die package.json und package-lock.json für eine effiziente Installation der Abhängigkeiten
COPY smarthome/package*.json ./

# Installiere die Abhängigkeiten
RUN npm install

# Kopiere den gesamten Code ins richtige Verzeichnis
COPY smarthome/. . 

# Exponiere den Port 3000 für den Container
EXPOSE 3000

# Starte die Anwendung
CMD ["npm", "start"]
