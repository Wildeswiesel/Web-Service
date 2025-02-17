const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Statische Dateien, z.B. CSS
app.use(express.static(path.join(__dirname, '..', 'public')));

// EJS als View Engine konfigurieren
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// In-Memory-Geräteliste
let devices = [];

/**
 * GET /  -> Startseite mit Geräten
 */
app.get('/', (req, res) => {
  res.render('index', { 
    devices: devices 
  });
});

/**
 * POST /register -> Neues Gerät anlegen
 * (Body: { deviceId, type, roomId })
 */
app.post('/register', (req, res) => {
  const { deviceId, type, roomId } = req.body;
  
  // Einfacher Check, keine ausgefeilte Validierung
  if (!deviceId || !type) {
    return res.status(400).send('deviceId und type sind Pflichtfelder!');
  }

  // Neues Gerät in In-Memory-Liste
  const newDevice = { deviceId, type, roomId: roomId || '' };
  devices.push(newDevice);
  console.log('Gerät registriert:', newDevice);

  // Zurück zur Startseite
  res.redirect('/');
});

/**
 * GET /devices -> JSON-Ausgabe aller Geräte
 */
app.get('/devices', (req, res) => {
  res.json(devices);
});

/**
 * Beispiel-Endpunkt: Fenster-Event
 * (Body: { deviceId: string, status: 'open'|'closed' })
 */
app.post('/window-event', (req, res) => {
  const { deviceId, status } = req.body;
  console.log(`Fensterkontakt ${deviceId} meldet: ${status}`);
  
  // Hier Logik, um passende Thermostate zu suchen und abzusenken o.ä.
  res.json({ success: true });
});

/**
 * Beispiel-Endpunkt: Thermostat-Update
 * (Body: { deviceId: string, currentTemp: number })
 */
app.post('/temperature-update', (req, res) => {
  const { deviceId, currentTemp } = req.body;
  console.log(`Thermostat ${deviceId}: aktuelle Temperatur = ${currentTemp}°C`);
  res.json({ success: true });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SmartHome läuft auf http://localhost:${PORT}`);
});
