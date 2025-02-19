// src/app.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const deviceService = require('./services/deviceService'); // z.B. für serverseitiges Rendering
const thermostatService = require('./services/thermostatService'); // für die Thermostate
const thermostatRoutes = require('./routes/thermostatRoutes');
const fensterkontaktService = require('./services/fensterkontaktService'); // für die Fenster


const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Statische Dateien
app.use(express.static(path.join(__dirname, '..', 'public')));

// EJS einrichten
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routen
app.use('/thermostats', thermostatRoutes);

app.get('/', async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.render('index', { devices });
  } catch (err) {
    console.error('Fehler beim Laden der Geräte:', err);
    res.status(500).send('Serverfehler');
  }
});

app.get('/thermostat', async (req, res) => {
  try {
    res.render('thermostat');
  } catch (err) {
    console.error('Fehler beim Laden der Geräte:', err);
    res.status(500).send('Serverfehler');
  }
});

app.get('/wohnzimmer', async (req, res) => {
  try {
    const devices = await deviceService.getWohnzimmerDevices();
    res.render('wohnzimmer', { devices });
  } catch (err) {
    console.error('Fehler beim Laden der Geräte:', err);
    res.status(500).send('Serverfehler');
  }
});

// POST-Formular (aus index.ejs)
app.post('/register', async (req, res) => {
  const { deviceId, type, roomId } = req.body;
  if (!deviceId || !type) {
    return res.status(400).send('deviceId und type sind Pflichtfelder');
  }

  try {
    const newId = await deviceService.addDevice(deviceId, type, roomId);  //für die Thermostate
    if (type === 'thermostat') {
      await thermostatService.createThermostatContainer(Number(deviceId), 22, roomId);
    }
    else if (type === 'fensterkontakt') {
      await fensterkontaktService.createFensterkontaktContainer(Number(deviceId), 'closed', roomId);
    }

    res.redirect('/');
  } catch (err) {
    console.error('Fehler beim Hinzufügen eines Geräts:', err);
    res.status(500).send('Gerät konnte nicht angelegt werden');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SmartHome läuft auf http://localhost:${PORT}`);
});
