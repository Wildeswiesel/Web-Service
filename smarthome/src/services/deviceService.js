// src/services/deviceService.js
const db = require('../db');

/**
 * Liefert alle Geräte als Array zurück
 */
function getAllDevices() {
  return db
    .query('SELECT * FROM devices')
    .then((result) => result.rows);
}

/**
 * Fügt ein neues Gerät hinzu und gibt die generierte ID zurück
 */
function addDevice(deviceId, type, roomId) {
  // "RETURNING id" gibt die neue ID gleich zurück
  const sql = `
    INSERT INTO devices (deviceId, type, roomId)
    VALUES ($1, $2, $3)
    RETURNING id
  `;
  const params = [deviceId, type, roomId || null];

  return db.query(sql, params)
    .then((result) => {
      // result.rows[0] enthält das eingefügte Objekt
      // z.B. { id: 123 }
      return result.rows[0].id;
    });
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
function deleteDevice(id) {
  const sql = 'DELETE FROM devices WHERE id = $1';
  return db.query(sql, [id])
    .then((result) => {
      // result.rowCount -> Anzahl gelöschter Zeilen
      return result.rowCount;
    });
}

module.exports = {
  getAllDevices,
  addDevice,
  getDeviceByDeviceId,
  deleteDevice,
};
