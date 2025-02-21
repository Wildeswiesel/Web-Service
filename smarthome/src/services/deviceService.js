// src/services/deviceService.js
const db = require('../db');
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Liefert alle Geräte als Array zurück
 */
function getAllDevices() {
  return db
    .query('SELECT * FROM devices')
    .then((result) => result.rows);
}

function getWohnzimmerDevices() {
  return db
    .query("SELECT * FROM devices WHERE roomId ILIKE 'wohnzimmer'")
    .then((result) => result.rows);
}

function getThermostate() {
  return db
    .query("SELECT * FROM devices WHERE type='thermostat'")
    .then((result) => result.rows);
}

function getFensterkontakte() {
  return db
    .query("SELECT * FROM devices WHERE type='fensterkontakt'")
    .then((result) => result.rows);
}

/**
 * Fügt ein neues Gerät hinzu und gibt die generierte ID zurück
 */
async function addDevice(deviceId, type, roomId) {
  // "RETURNING id" gibt die neue ID gleich zurück
  const sql = `
    INSERT INTO devices (deviceId, type, roomId)
    VALUES ($1, $2, $3)
    RETURNING id
  `;
  const params = [deviceId, type, roomId || null];
  const result = await db.query(sql, params);
  const newDeviceId = result.rows[0].id;

  if (roomId) {
    const checkSql = 'SELECT * FROM rooms WHERE roomId = $1';
    const checkResult = await db.query(checkSql, [roomId]);
    if (checkResult.rows.length === 0) {
      // Lege den Raum mit Standardwerten an:
      // room_temperature: 22, reduced_temperature: 18, current_temperature: 20
      const insertRoomSql = `
        INSERT INTO rooms (roomId, room_temperature, reduced_temperature, current_temperature)
        VALUES ($1, $2, $3, $4)
      `;
      const defaults = [roomId, 22, 18, 20];
      await db.query(insertRoomSql, defaults);
      console.log(`Room '${roomId}' created with default values.`);
    }
  }
  
  return newDeviceId;
}

/**
 * Suche Gerät nach deviceId
 */
function getDeviceByDeviceId(deviceId) {
  const sql = 'SELECT * FROM devices WHERE deviceId = $1';
  return db.query(sql, [deviceId])
    .then((result) => result.rows[0]);
}

/**
 * Löschen eines Geräts anhand seiner internen ID
 */
async function deleteDevice(id) {
  try {
    // 1️⃣ Gerät aus der DB holen, um die `deviceid` und den Typ zu bekommen
    const result = await db.query('SELECT * FROM devices WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return 0; // Gerät nicht gefunden
    }

    const device = result.rows[0];
    let containerName;

    // 🔍 2️⃣ Container-Name je nach Gerätetyp setzen
    if (device.type === 'thermostat') {
      containerName = `web-service-thermostat-${device.deviceid}`;
    } else if (device.type === 'fensterkontakt') {
      containerName = `web-service-fensterkontakt-${device.deviceid}`;
    } else {
      console.warn(`Gerätetyp ${device.type} hat keinen zugehörigen Container.`);
      containerName = null;
    }

    // 🚀 3️⃣ Docker-Container stoppen und löschen (falls vorhanden)
    if (containerName) {
      try {
        const container = await docker.getContainer(containerName);
        await container.kill(); 
        await container.remove();
        console.log(`Container ${containerName} gestoppt und entfernt.`);
      } catch (err) {
        console.warn(`Container ${containerName} nicht gefunden oder Fehler beim Entfernen:`, err.message);
      }
    }

    // 🗑️ 4️⃣ Gerät aus der DB löschen
    const deleteResult = await db.query('DELETE FROM devices WHERE id = $1', [id]);
    return deleteResult.rowCount;
  } catch (error) {
    console.error("Fehler beim Löschen des Geräts:", error);
    throw error;
  }
}


module.exports = {
  getAllDevices,
  getWohnzimmerDevices,
  getThermostate,
  getFensterkontakte,
  addDevice,
  getDeviceByDeviceId,
  deleteDevice,
};
