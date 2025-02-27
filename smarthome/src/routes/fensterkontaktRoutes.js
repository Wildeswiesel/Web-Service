const express = require('express');
const axios = require('axios');
const router = express.Router();
const deviceService = require('../services/deviceService');

const CLOSED_MODE = 'closed'
const OPEN_MODE = 'open'

const startPort= 3020

router.get('/', async (req, res) => {
    try {
      const fensterkontakte = await deviceService.getFensterkontakte();
      res.json(fensterkontakte);
    } catch(error) {
      console.error('Fehler beim Abrufen der Fensterkontakte:', error);
      res.status(500).send('Serverfehler');
    }
});

 //Schließt das Fenster.
router.post('/:deviceId/closed', async (req, res) => {
  const { deviceId } = req.params;

  const device = await deviceService.getFensterByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Fensterkontakt nicht gefunden' });
  }
  if (device.type !== 'fensterkontakt') {
    return res.status(400).json({ error: 'Gerät ist kein Fensterkontakt' });
  }

  const containerName = `web-service-fensterkontakt-${deviceId}`;
  const port = startPort+Number(deviceId);

  // Geschlossener Modus an Fensterkontakt schicken
  try {
    const body = {
      targetMode: CLOSED_MODE,
      mode: 'close'
    };
    const updateRes = await axios.post(`http://${containerName}:${port}/close`, body);
    res.json(updateRes.data);
  } catch (err) {
    console.error('Fehler beim Schließen des Fensters:', err.message);
    res.status(500).json({ error: 'Fensterkontakt nicht erreichbar' });
  }
});

 //Öffnet das Fenster.
router.post('/:deviceId/open', async (req, res) => {
  const { deviceId } = req.params;

  const device = await deviceService.getFensterByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Fensterkontakt nicht gefunden' });
  }
  if (device.type !== 'fensterkontakt') {
    return res.status(400).json({ error: 'Gerät ist kein Fensterkontakt' });
  }

  const containerName = `web-service-fensterkontakt-${deviceId}`;
  const port = startPort+Number(deviceId);
  // Geöffneter Modus an Fensterkontakt schicken
  try {
    const body = {
      targetMode: OPEN_MODE,
      mode: 'open'
    };
    const updateRes = await axios.post(`http://${containerName}:${port}/open`, body);
    res.json(updateRes.data);
  } catch (err) {
    console.error('Fehler beim Öffnen des Fensters:', err.message);
    res.status(500).json({ error: 'Fensterkontakt nicht erreichbar' });
  }
});

module.exports = router;