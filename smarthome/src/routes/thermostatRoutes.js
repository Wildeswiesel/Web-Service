const express = require('express');
const axios = require('axios');
const router = express.Router();
const deviceService = require('../services/deviceService');

router.get('/:deviceId/status', async (req, res) => {
  const { deviceId } = req.params;
  const device = await deviceService.getThermostatByDeviceId(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Thermostat not found' });
  }
  if (device.type !== 'thermostat') {
    return res.status(400).json({ error: 'Device is not a thermostat' });
  }
  const containerName = `web-service-thermostat-${deviceId}`;
  const port = 6000 + Number(deviceId);
  try {
    const response = await axios.get(`http://${containerName}:${port}/status`);
    const { heatingMode } = response.data;
    res.json({ heatingMode });
  } catch (err) {
    console.error('Error fetching thermostat status:', err.message);
    res.status(500).json({ error: 'Thermostat unreachable' });
  }
});

module.exports = router;
