// src/app.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const deviceRoutes = require('./routes/deviceRoutes');
const deviceService = require('./services/deviceService'); // z.B. für serverseitiges Rendering
//const roomRoutes = require('./routes/roomRoutes');

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
app.use('/devices', deviceRoutes);
//app.use('/rooms', roomRoutes);

app.get('/', async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.render('index', { devices });
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
    await deviceService.addDevice(deviceId, type, roomId);
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
