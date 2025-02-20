const express = require('express');
const axios = require('axios');
const router = express.Router();
const deviceService = require('../services/deviceService');

// "Fest" definierte Temperaturen (kannst du flexibel machen, z.B. in DB ablegen)
const DEFAULT_NORMAL_TEMP = 22;
const DEFAULT_REDUCED_TEMP = 18;

/**
 * GET /thermostats
 * Gibt alle Geräte vom Typ "thermostat" zurück (JSON).
 */
router.get('/', async (req, res) => {
  try {
    // Alle Geräte holen und filtern
    const thermostats = await deviceService.getThermostate();
    res.json(thermostats);
  } catch (error) {
    console.error('Fehler beim Abrufen der Thermostate:', error);
    res.status(500).send('Serverfehler');
  }
});

/**
 * GET /thermostats/:deviceId/status
 * Fragt den laufenden Thermostat-Container über HTTP an (z.B. http://thermostat_1:3001/status).
 */
router.get('/:deviceId/status', async (req, res) => {
  const { deviceId } = req.params;

  // 1) Prüfen, ob Device existiert und Thermostat ist
  const device = await deviceService.getDeviceByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat nicht gefunden' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Gerät ist kein Thermostat' });
  }

  // 2) Container-Hostname und Port
  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 3000+deviceId; // Hardcodiert, falls Thermostat immer auf 3001 läuft

  // 3) Versuch, den Container per HTTP GET /status abzufragen
  try {
    const response = await axios.get(`http://${containerName}:${port}/status`);
    res.json(response.data); 
    // z.B. { thermostatId, roomId, currentTemperature, mode }
  } catch (err) {
    console.error('Fehler beim Abfragen des Thermostat-Status:', err.message);
    res.status(500).json({ error: 'Thermostat nicht erreichbar' });
  }
});

/**
 * POST /thermostats/:deviceId/normal
 * Setzt den Thermostat auf Normaltemperatur (z.B. 22°C).
 */
router.post('/:deviceId/normal', async (req, res) => {
  const { deviceId } = req.params;

  const device = await deviceService.getDeviceByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat nicht gefunden' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Gerät ist kein Thermostat' });
  }

  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 3001;

  // "Normaltemperatur" an den Thermostat schicken
  try {
    const body = {
      targetTemperature: DEFAULT_NORMAL_TEMP,
      mode: 'normal'
    };
    const updateRes = await axios.post(`http://${containerName}:${port}/update`, body);
    res.json(updateRes.data);
  } catch (err) {
    console.error('Fehler beim Setzen der Normaltemperatur:', err.message);
    res.status(500).json({ error: 'Thermostat nicht erreichbar' });
  }
});

/**
 * POST /thermostats/:deviceId/reduced
 * Setzt den Thermostat auf Absenktemperatur (z.B. 18°C).
 */
router.post('/:deviceId/reduced', async (req, res) => {
  const { deviceId } = req.params;

  const device = await deviceService.getDeviceByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat nicht gefunden' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Gerät ist kein Thermostat' });
  }

  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 3001;

  // "Absenktemperatur" an den Thermostat schicken
  try {
    const body = {
      targetTemperature: DEFAULT_REDUCED_TEMP,
      mode: 'reduced'
    };
    const updateRes = await axios.post(`http://${containerName}:${port}/update`, body);
    res.json(updateRes.data);
  } catch (err) {
    console.error('Fehler beim Setzen der Absenktemperatur:', err.message);
    res.status(500).json({ error: 'Thermostat nicht erreichbar' });
  }
});

module.exports = router;
