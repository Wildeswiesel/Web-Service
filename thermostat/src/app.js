const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const thermostatId = process.env.THERMOSTAT_ID || '1';
const roomId = process.env.ROOM_ID || 'none';

// Datenbankverbindung
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'devicesdb',
  password: process.env.PGPASSWORD || 'secret',
  port: process.env.PGPORT || 5432
});

// Initiale Werte; diese werden sofort aus der DB überschrieben
let currentTemperature = 22;
let roomTemperature = 22;
let reducedTemperature = 18;
let windowStatus = 'closed';  // Für den Moment immer 'closed' 
let heatingMode = 0;

// Array für sseClients = [];
let sseClients = [];
let previousError = 0;

// SSE-Endpoint: Clients verbinden sich hier, um kontinuierlich Updates zu erhalten
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// Funktion zum Senden eines Events an alle verbundenen Clients
function sendSSEEvent(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Liest die Raumwerte aus der Tabelle rooms für den gegebenen roomId
async function fetchRoomValues() {
  try {
    const res = await pool.query(
      'SELECT room_temperature, reduced_temperature, current_temperature FROM rooms WHERE roomId = $1',
      [roomId]
    );
    if (res.rows.length > 0) {
      roomTemperature = Number(res.rows[0].room_temperature);
      reducedTemperature = Number(res.rows[0].reduced_temperature);
      currentTemperature = Number(res.rows[0].current_temperature);
    }
  } catch (err) {
    console.error('Error fetching room values:', err);
  }
}

// Aktualisiert den aktuellen Temperaturwert in der Tabelle rooms
async function updateRoomCurrentTemperature() {
  try {
    await pool.query(
      'UPDATE rooms SET current_temperature = $1 WHERE roomId = $2',
      [currentTemperature, roomId]
    );
  } catch (err) {
    console.error('Error updating current temperature in DB:', err);
  }
}

// updateHeatingMode() ohne Rekursion – berechnet den heatingMode und passt currentTemperature an
function updateHeatingMode() {
  // Zielwert: Bei offenem Fenster reducedTemperature, bei geschlossenem Fenster roomTemperature (also 22°C)
  const target = (windowStatus === 'open') ? reducedTemperature : roomTemperature;
  
  // Kontinuierliche Abkühlung:
  // Bei offenem Fenster stärker, bei geschlossenem Fenster moderat
  const coolingRate = (windowStatus === 'open') ? 0.15 : 0.005;
  currentTemperature -= coolingRate;
  
  // Berechne den Fehler (Differenz zwischen Ziel und aktueller Temperatur)
  const error = target - currentTemperature;
  // Berechne die Ableitung (Änderung des Fehlers)
  const derivative = error - previousError;
  previousError = error;
  
  // Kombiniere error und derivative zu einem Steuerwert.
  // Wähle Kd so, dass auch bei kleinen Fehlern ein angemessener controlSignal-Wert herauskommt.
  const Kd = 0.5;
  const controlSignal = error + Kd * derivative;
  
  // Bestimme den heatingMode anhand des controlSignal.
  // Hier passen wir die Schwellenwerte an, sodass bereits ein kleiner positiver Fehler (z. B. ca. 0,1–0,3) zu heatingMode 2 führt.
  if (controlSignal <= 0) {
    heatingMode = 0;
  } else if (controlSignal <= 0.1) {
    heatingMode = 1;
  } else if (controlSignal <= 0.3) {
    heatingMode = 2;  // gewünschter Bereich
  } else if (controlSignal <= 0.6) {
    heatingMode = 3;
  } else if (controlSignal <= 1.0) {
    heatingMode = 4;
  } else {
    heatingMode = 5;
  }
  
  // Dynamischer Faktor: Je höher currentTemperature im Vergleich zu roomTemperature, desto weniger effektiv ist das Heizen.
  const maxDelta = 10; // Bei einem Unterschied von 10°C soll der Faktor mindestens 0.1 betragen
  let reductionFactor = 1;
  if (currentTemperature > roomTemperature) {
    reductionFactor = Math.max(0.1, 1 - ((currentTemperature - roomTemperature) / maxDelta));
  }
  
  // Basis-Heiz-Inkremente abhängig vom heatingMode
  let baseIncrement = 0;
  switch (heatingMode) {
    case 1: baseIncrement = 0.01; break;
    case 2: baseIncrement = 0.05; break;
    case 3: baseIncrement = 0.1; break;
    case 4: baseIncrement = 0.15; break;
    case 5: baseIncrement = 0.5; break;
    default: baseIncrement = 0;
  }
  
  // Effektives Heiz-Inkrement:
  const heatingIncrement = baseIncrement * reductionFactor;
  currentTemperature += heatingIncrement;
  
  // Sende das Update per SSE an alle verbundenen Clients:
  sendSSEEvent({ thermostatId, roomId, currentTemperature, roomTemperature, reducedTemperature, heatingMode, windowStatus });
}

// Diese Funktion wird alle 1000ms asynchron aufgerufen:
setInterval(async () => {
  await fetchRoomValues();      // Lese aktuelle Werte aus der DB
  updateHeatingMode();          // Berechne heatingMode und passe currentTemperature an
  await updateRoomCurrentTemperature(); // Schreibe den neuen currentTemperature-Wert in die DB
}, 1000);

// Endpunkt, um den Status abzurufen
app.get('/status', (req, res) => {
  res.json({
    thermostatId,
    roomId,
    currentTemperature,
    roomTemperature,
    reducedTemperature,
    heatingMode,
    windowStatus
  });
});

// Mit /update kann man manuell Werte setzen und dadurch den heatingMode neu berechnen
app.post('/update', async (req, res) => {
  const { currentTemp, roomTemp, reducedTemp, window } = req.body;
  if (currentTemp !== undefined) {
    currentTemperature = Number(currentTemp);
  }
  if (roomTemp !== undefined) {
    roomTemperature = Number(roomTemp);
  }
  if (reducedTemp !== undefined) {
    reducedTemperature = Number(reducedTemp);
  }
  if (window !== undefined) {
    // Hier könntest Du später auch den Fensterstatus aktualisieren (open/closed)
    windowStatus = window;
  }
  updateHeatingMode();
  await updateRoomCurrentTemperature();
  res.json({
    thermostatId,
    roomId,
    currentTemperature,
    roomTemperature,
    reducedTemperature,
    heatingMode,
    windowStatus,
    message: "Thermostat updated"
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Thermostat ${thermostatId} (room: ${roomId}) running on port ${port}`);
});



