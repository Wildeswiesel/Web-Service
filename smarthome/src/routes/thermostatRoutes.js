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
  const device = await deviceService.getThermostatByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat not found' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Device is not a thermostat' });
  }
  // WICHTIG: Verwende 3000 + deviceId, da das in thermostatService so definiert ist
  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 6000 + Number(deviceId);
  try {
    const response = await axios.get(`http://${containerName}:${port}/status`);
    res.json(response.data);
  } catch (err) {
    console.error('Error fetching thermostat status:', err.message);
    res.status(500).json({ error: 'Thermostat unreachable' });
  }
});

module.exports = router;
