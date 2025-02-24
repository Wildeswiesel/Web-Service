const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const deviceService = require('./services/deviceService');
const thermostatService = require('./services/thermostatService');
const thermostatRoutes = require('./routes/thermostatRoutes');
const fensterkontaktService = require('./services/fensterkontaktService');
const fensterkontaktRoutes = require('./routes/fensterkontaktRoutes');

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
app.use(async (req, res, next) => {
  try {
    const rooms = await deviceService.getAllRooms(); // Räume aus dem Service laden
    res.locals.rooms = rooms; // Räume global verfügbar machen
    next();
  } catch (err) {
    console.error('Fehler beim Laden der Räume:', err);
    res.locals.rooms = []; // Falls Fehler, leere Liste setzen
    next();
  }
});



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

// GET Room Status (z.B. /room/Wohnzimmer/status)
app.get('/room/:roomId/status', async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await deviceService.getRoomValues(roomId);
    res.json(result);
  } catch (err) {
    console.error('Error fetching room status:', err);
    res.status(500).send('Server error');
  }
});

// POST Room Update: Aktualisiere die Raumtemperatur
app.post('/room/:roomId/updateRoomTemperature', async (req, res) => {
  const { roomId } = req.params;
  const { room_temperature } = req.body;
  try {
    await deviceService.updateRoomTemperature(roomId, room_temperature);
    res.send('Room temperature updated');
  } catch (err) {
    console.error('Error updating room temperature:', err);
    res.status(500).send('Server error');
  }
});

// POST Room Update: Aktualisiere die Absenktemperatur
app.post('/room/:roomId/updateReducedTemperature', async (req, res) => {
  const { roomId } = req.params;
  const { reduced_temperature } = req.body;
  try {
    await deviceService.updateReducedTemperature(roomId, reduced_temperature);
    res.send('Reduced temperature updated');
  } catch (err) {
    console.error('Error updating reduced temperature:', err);
    res.status(500).send('Server error');
  }
});

// POST Registrierung eines neuen Geräts
app.post('/register', async (req, res) => {
  const { type, roomId } = req.body;
  if (!type) {
    return res.status(400).send('type ist ein Pflichtfeld');
  }
  try {
    const deviceId = await deviceService.addDevice(type, roomId);
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
