// src/app.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const deviceService = require('./services/deviceService'); // z.B. für serverseitiges Rendering
const thermostatService = require('./services/thermostatService'); // für die Thermostate
const thermostatRoutes = require('./routes/thermostatRoutes');
const fensterkontaktService = require('./services/fensterkontaktService'); // für die Fenster
const fensterkontaktRoutes = require('./routes/fensterkontaktRoutes') // Fensterkontakt routen

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
app.use('/fensterkontakte', fensterkontaktRoutes);

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

app.get('/fensterkontakt', async (req, res) => {
  try {
    res.render('fensterkontakt');
  } catch (err) {
    console.error('Fehler beim Laden der Geräte:', err)
    res.status(500).send('Serverfehler')
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
// src/app.js

// src/app.js

app.post('/register', async (req, res) => {
  const { type, roomId } = req.body;
  if (!type) {
    console.log('Empfangener type:', type);
    return res.status(400).send('type ist ein Pflichtfeld');
  }

  try {
    const deviceId = await deviceService.addDevice(type, roomId); // Verwende deviceId hier
    if (type === 'thermostat') {
      await thermostatService.createThermostatContainer(deviceId, 22, roomId);
    } else if (type === 'fensterkontakt') {
      await fensterkontaktService.createFensterkontaktContainer(deviceId, 'closed', roomId);
    }

    res.redirect('/');
  } catch (err) {
    console.error('Fehler beim Hinzufügen eines Geräts:', err);
    res.status(500).send('Gerät konnte nicht angelegt werden');
  }
});


app.delete('/devices/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const rowsDeleted = await deviceService.deleteDevice(id);
    
    if (rowsDeleted > 0) {
      res.status(200).send("Gerät gelöscht");
    } else {
      res.status(404).send("Gerät nicht gefunden");
    }
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    res.status(500).send("Interner Serverfehler");
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SmartHome läuft auf http://localhost:${PORT}`);
});
