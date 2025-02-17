// src/routes/deviceRoutes.js
const express = require('express');
const router = express.Router();
const deviceService = require('../services/deviceService');

router.get('/', async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.json(devices);
  } catch (error) {
    console.error('Fehler beim Abrufen der Geräte:', error);
    res.status(500).send('Serverfehler');
  }
});

router.post('/', async (req, res) => {
  const { deviceId, type, roomId } = req.body;
  if (!deviceId || !type) {
    return res.status(400).send('deviceId und type sind Pflichtfelder');
  }

  try {
    const newId = await deviceService.addDevice(deviceId, type, roomId);
    res.status(201).json({ id: newId, message: 'Gerät angelegt' });
  } catch (error) {
    console.error('Fehler beim Hinzufügen eines Geräts:', error);
    res.status(500).send('Gerät konnte nicht angelegt werden');
  }
});

// etc...
module.exports = router;
