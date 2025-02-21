const express = require('express');
const axios = require('axios');
const router = express.Router();
const deviceService = require('../services/deviceService');

// GET /thermostats – List all thermostats
router.get('/', async (req, res) => {
  try {
    const thermostats = await deviceService.getThermostate();
    res.json(thermostats);
  } catch (err) {
    console.error('Error fetching thermostats:', err);
    res.status(500).send('Server error');
  }
});

// GET /thermostats/:deviceId/status – Query the running thermostat container
router.get('/:deviceId/status', async (req, res) => {
  const { deviceId } = req.params;
  const device = await deviceService.getDeviceByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat not found' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Device is not a thermostat' });
  }
  // WICHTIG: Verwende 3000 + deviceId, da das in thermostatService so definiert ist
  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 3000 + Number(deviceId);
  try {
    const response = await axios.get(`http://${containerName}:${port}/status`);
    res.json(response.data);
  } catch (err) {
    console.error('Error fetching thermostat status:', err.message);
    res.status(500).json({ error: 'Thermostat unreachable' });
  }
});

// POST /thermostats/:deviceId/normal – Set thermostat to normal mode  
// (hier wird kein Temperaturwert übergeben, da der Thermostat die Raumwerte selbst aus der DB abruft)
router.post('/:deviceId/normal', async (req, res) => {
  const { deviceId } = req.params;
  const device = await deviceService.getDeviceByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat not found' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Device is not a thermostat' });
  }
  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 300 + Number(deviceId);
  try {
    const body = {
      // Es wird kein Temperaturwert übergeben – der Thermostat holt seinen ROOM_TEMP selbst
      mode: 'normal'
    };
    const updateRes = await axios.post(`http://${containerName}:${port}/update`, body);
    res.json(updateRes.data);
  } catch (err) {
    console.error('Error setting normal mode:', err.message);
    res.status(500).json({ error: 'Thermostat unreachable' });
  }
});

// POST /thermostats/:deviceId/reduced – Set thermostat to reduced mode
router.post('/:deviceId/reduced', async (req, res) => {
  const { deviceId } = req.params;
  const device = await deviceService.getDeviceByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat not found' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Device is not a thermostat' });
  }
  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 300 + Number(deviceId);
  try {
    const body = {
      mode: 'reduced'
    };
    const updateRes = await axios.post(`http://${containerName}:${port}/update`, body);
    res.json(updateRes.data);
  } catch (err) {
    console.error('Error setting reduced mode:', err.message);
    res.status(500).json({ error: 'Thermostat unreachable' });
  }
});

module.exports = router;
