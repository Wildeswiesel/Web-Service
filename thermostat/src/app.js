const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'devicesdb',
  password: process.env.PGPASSWORD || 'secret',
  port: process.env.PGPORT || 5432
});

const thermostatId = process.env.THERMOSTAT_ID || '1';
const roomId = process.env.ROOM_ID || 'none';

let currentTemperature = 20;
let roomTemperature = 22;
let reducedTemperature = 18;
let windowStatus = 'closed'; 
let heatingMode = 0;
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

function sendSSEEvent(data) {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

async function fetchRoomValues() {
  try {
    const { rows: [row] } = await pool.query(
      'SELECT room_temperature, reduced_temperature, current_temperature FROM rooms WHERE roomId = $1',
      [roomId]
    );
    roomTemperature = Number(row.room_temperature);
    reducedTemperature = Number(row.reduced_temperature);
    currentTemperature = Number(row.current_temperature);
  } catch (err) {
    console.error('Error fetching room values:', err);
  }
}

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

function updateHeatingMode() {
  let target = (windowStatus === 'open') ? reducedTemperature : roomTemperature;
  let coolingRate = (windowStatus === 'open') ? 0.13 : 0.015;
  currentTemperature -= coolingRate;

  let error = target - currentTemperature;
  let errorRate = error - previousError;
  previousError = error;
  let controlSignal;
  if(windowStatus === 'open') {controlSignal = error + 2.0 * previousError; 
  } else {controlSignal = error + 0.5 * errorRate;}

  if (controlSignal <= 0) {
    heatingMode = 0;
  } else if (controlSignal <= 0.01) {
    heatingMode = 1;
  } else if (controlSignal <= 0.3) {
    heatingMode = 2;
  } else if (controlSignal <= 0.6) {
    heatingMode = 3;
  } else if (controlSignal <= 1.0) {
    heatingMode = 4;
  } else {
    heatingMode = 5;
  }

  let baseIncrement = 0;
  switch (heatingMode) {
    case 1: baseIncrement = 0.01; break;
    case 2: baseIncrement = 0.05; break;
    case 3: baseIncrement = 0.1; break;
    case 4: baseIncrement = 0.15; break;
    case 5: baseIncrement = 0.5; break;
    default: baseIncrement = 0;
  }
  
  let reductionFactor = 0.1 * currentTemperature;
  let heatingIncrement = baseIncrement / reductionFactor;
  currentTemperature += heatingIncrement;
  
  sendSSEEvent({ thermostatId, roomId, currentTemperature, roomTemperature, reducedTemperature, heatingMode, windowStatus });
}

setInterval(async () => {
  await fetchRoomValues();
  updateHeatingMode();
  await updateRoomCurrentTemperature();
}, 1000);

app.get('/status', (req, res) => {
  res.json({ heatingMode });
});

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
    windowStatus =windowStatus = String(window).toLowerCase();
  }

  console.log(`Empfangener Fensterstatus: ${windowStatus}`);

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

const port = process.env.PORT || 6001;
app.listen(port, () => {
  console.log(`Thermostat (Raum: ${roomId}) läuft auf Port ${port}`);
});