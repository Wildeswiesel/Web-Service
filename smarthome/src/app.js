const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
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

app.use(session({
  secret: 'geheimerschlüssel',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 5000 } // Optional: Ablaufzeit der Session
}));

app.use((req, res, next) => {
  res.locals.message = req.session.message || null;
  res.locals.messageType = req.session.messageType || null;
  delete req.session.message;
  delete req.session.messageType;
  next();
});


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

app.get('/register', async (req, res) => {
  try {
    res.render('register');
  } catch (err) {
    console.error('Fehler beim Laden der Geräte:', err);
    res.status(500).send('Serverfehler');
  }
});

app.get('/:roomid', async (req, res) => {
  const roomid = req.params.roomid;
  if (!roomid) {
    return res.status(404).send('Raum nicht gefunden');
  }

  try {
    const devices = await deviceService.getDevicesByRoomId(roomid);
    res.render('room', { roomid, devices });
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
    req.session.message = "Gerätetyp ist erforderlich!";
    req.session.messageType = "error";
    return res.redirect('/register');
  }
  try {
    const deviceId = await deviceService.addDevice(type, roomId);
    if (type === 'thermostat') {
      await thermostatService.createThermostatContainer(deviceId, roomId);
    } else if (type === 'fensterkontakt') {
      await fensterkontaktService.createFensterkontaktContainer(deviceId, 'closed', roomId);
    }
    req.session.message = "Gerät erfolgreich registriert!";
    req.session.messageType = "success";
  } catch (err) {
    console.error('Fehler beim Hinzufügen eines Geräts:', err);
    req.session.message = "Gerät konnte nicht angelegt werden.";
    req.session.messageType = "error";
  }
  res.redirect('/register');
});


app.post('/registerRoom', async (req, res) => {
    try {
        const { roomId } = req.body;

        if (!roomId || roomId.trim() === '') {
          req.session.message = "Raum-ID darf nicht leer sein!";
          req.session.messageType = "error";
          return res.redirect('/register');        }

        await deviceService.addRoom(roomId.trim());

        req.session.message = "Raum erfolgreich hinzugefügt!";
        req.session.messageType = "success";
      } catch (error) {
        console.error('Fehler beim Hinzufügen des Raums:', error);
        req.session.message = "Interner Serverfehler.";
        req.session.messageType = "error";    
      }
      res.redirect('/register');
});


app.post('/fensterstatus', async (req, res) => {
  const { deviceId, roomId, status } = req.body;
  console.log(`Fensterstatus erhalten: Fenster ${deviceId} ist jetzt ${status}`);

  try {
      // Finde alle Thermostate im gleichen Raum
      const thermostate = await deviceService.getThermostateByRoom(roomId);
      console.log("Gefundene Thermostate:", thermostate);      

      if (thermostate.length === 0) {
          return res.status(404).json({ error: 'Kein Thermostat für diesen Raum gefunden' });
      }
    

      // Informiere jedes Thermostat
      for (const thermostat of thermostate) {
          const deviceId = thermostat.deviceid;

          const thermoContainerName = `web-service-thermostat-${deviceId}`;
          const thermoPort = 6000 + Number(deviceId);

try {
        await axios.post(`http://${thermoContainerName}:${thermoPort}/update`, {
            window: status
        });
        console.log(`Thermostat ${deviceId} erfolgreich informiert.`);
    } catch (err) {
        console.error(`Fehler beim Senden an Thermostat ${deviceId}:`, err.message);
    }
      }

      res.json({ success: true, message: `Thermostate über Fensterstatus informiert: ${status}` });
  } catch (err) {
      console.error('Fehler beim Senden an das Thermostat:', err.message);
      res.status(500).json({ error: 'Thermostat nicht erreichbar' });
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
