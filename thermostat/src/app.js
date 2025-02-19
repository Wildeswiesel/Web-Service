const express = require('express');
const app = express();
app.use(express.json());

// Lese die numerische ID aus der ENV-Variable, falls gesetzt; ansonsten als Fallback "0"
const thermostatId = process.env.THERMOSTAT_ID || '1';

// Lese die Starttemperatur (als Zahl) aus der ENV-Variable
let currentTemperature = Number(process.env.DEFAULT_TEMPERATURE) || 22;

// Raumzuordnung (optional)
const roomId = process.env.ROOM_ID || 'none';

// Heizmodus: 'strong', 'light', 'hold', 'off'
let mode = "off";

// Endpunkt, um den Status abzurufen
app.get('/status', (req, res) => {
  res.json({
    thermostatId,
    roomId,
    currentTemperature,
    mode
  });
});

// Endpunkt, um den Thermostat zu aktualisieren
app.post('/update', (req, res) => {
  const { targetTemperature, mode: newMode } = req.body;
  if (targetTemperature !== undefined) {
    currentTemperature = targetTemperature;
  }
  if (newMode) {
    mode = newMode;
  }
  res.json({
    thermostatId,
    currentTemperature,
    mode,
    message: "Thermostat aktualisiert"
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Thermostat ${thermostatId} (Raum: ${roomId}) läuft auf Port ${port}`);
});

