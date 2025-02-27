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

// kann aktuell noch weg (glaub ich zumindest) ----------------------
router.get('/:deviceId/status', async (req, res) => {
    const { deviceId } = req.params;
    const device = await deviceService.getFensterByDeviceId(deviceId);
    if (!device) {
        return res.status(404).json({ error: 'Fensterkontakt nicht gefunden.'});
    }
    if (device.type !== 'fensterkontakt') {
        return res.status(400).json({ error: 'Gerät ist kein Fensterkontakt.'})
    }

    const containerName = `web-service-fensterkontakt-${deviceId}`;
    const port = startPort+Number(deviceId); //muss man noch schauen wie das geändert werden soll

    try {
      const response = await axios.get(`http://${containerName}:${port}/status`);
      res.json(response.data); 
    } catch (err) {
      console.error('Fehler beim Abfragen des Fensterkontakt-Status:', err.message);
      res.status(500).json({ error: 'Fensterkontakt nicht erreichbar' });
    }
})
// bis hier -------------------------------  


 //POST /fensterkontakt/:deviceId/closed
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
  const port = startPort+Number(deviceId); //ggf noch Port umändern

  // "Geschlossener Modus" an Fensterkontakt schicken
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


 //POST /fensterkontakt/:deviceId/open
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
  const port = startPort+Number(deviceId); //ggf noch Port umändern falls nicht passt
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