const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'devicesdb',
  password: process.env.PGPASSWORD || 'secret',
  port: 5432,
});

// Tabelle devices für alle Geräte
async function initDb() {
  const createDevicesTableSQL = `
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      deviceId INT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      roomId TEXT
    )
  `;
  // Tabelle rooms für raumbezogene Werte
  const createRoomsTableSQL = `
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      roomId TEXT UNIQUE NOT NULL,
      room_temperature NUMERIC DEFAULT 22,
      reduced_temperature NUMERIC DEFAULT 18,
      current_temperature NUMERIC DEFAULT 22
    )
  `;
  
  try {
    await pool.query(createDevicesTableSQL);
    console.log('Tabelle "devices" ist bereit (ggf. gerade erstellt).');
    await pool.query(createRoomsTableSQL);
    console.log('Tabelle "rooms" ist bereit (ggf. gerade erstellt).');
  } catch (err) {
    console.error('Fehler beim Erstellen der Tabellen:', err);
  }
}

// Fügt ein neues Gerät hinzu und legt (falls nötig) den Raum an
async function addDevice(deviceId, type, roomId) {
  // Falls ein Raum angegeben wurde, prüfen und ggf. anlegen:
  if (roomId) {
    const checkRoomSql = 'SELECT * FROM rooms WHERE roomId = $1';
    const checkRoomResult = await pool.query(checkRoomSql, [roomId]);
    if (checkRoomResult.rows.length === 0) {
      const insertRoomSql = `
        INSERT INTO rooms (roomId, room_temperature, reduced_temperature, current_temperature)
        VALUES ($1, 22, 18, 22)
      `;
      await pool.query(insertRoomSql, [roomId]);
      console.log(`Room '${roomId}' created with default values.`);
    }
  }

  try {
    // Prüfen, ob bereits ein Gerät mit diesem Typ und Raum existiert
    const checkQuery = `
      SELECT * FROM devices WHERE type = $1 AND roomId = $2;
    `;
    const checkResult = await pool.query(checkQuery, [type, roomId]);
    if (checkResult.rows.length > 0) {
      console.log(`⚠️ Gerät (${type}, ${roomId}) existiert bereits.`);
      // Gebe deviceId des bereits existierenden Geräts zurück
      return checkResult.rows[0].deviceid;
    }
    // Falls nicht vorhanden, füge das Gerät hinzu – deviceId wird automatisch generiert.
    const insertQuery = `
      INSERT INTO devices (deviceId, type, roomId) 
      VALUES ($1, $2, $3) 
      RETURNING deviceId;
    `;
    const result = await pool.query(insertQuery, [deviceId, type, roomId]);
    console.log('✅ Gerät erfolgreich hinzugefügt:', result.rows[0]);
    return result.rows[0].deviceid;
  } catch (err) {
    console.error('❌ Fehler beim Einfügen des Geräts:', err.message);
    throw err;
  }
}

async function getAllDevices() {
  const result = await pool.query('SELECT * FROM devices');
  return result.rows;
}

async function getWohnzimmerDevices() {
  const result = await pool.query("SELECT * FROM devices WHERE roomId ILIKE 'wohnzimmer'");
  return result.rows;
}

async function getThermostate() {
  const result = await pool.query("SELECT * FROM devices WHERE type='thermostat'");
  return result.rows;
}

async function getFensterkontakte() {
  const result = await pool.query("SELECT * FROM devices WHERE type='fensterkontakt'");
  return result.rows;
}

async function getDeviceByDeviceId(deviceId) {
  const sql = 'SELECT * FROM devices WHERE deviceId = $1';
  const result = await pool.query(sql, [deviceId]);
  return result.rows[0];
}

async function deleteDevice(id) {
  const sql = 'DELETE FROM devices WHERE id = $1';
  const result = await pool.query(sql, [id]);
  return result.rowCount;
}

async function getRoomValues(roomId) {
  const sql = 'SELECT room_temperature, reduced_temperature, current_temperature FROM rooms WHERE roomId = $1';
  const result = await pool.query(sql, [roomId]);
  return result.rows[0];
}

async function updateRoomTemperature(roomId, room_temperature) {
  const sql = 'UPDATE rooms SET room_temperature = $1 WHERE roomId = $2';
  await pool.query(sql, [Number(room_temperature), roomId]);
}

async function updateReducedTemperature(roomId, reduced_temperature) {
  const sql = 'UPDATE rooms SET reduced_temperature = $1 WHERE roomId = $2';
  await pool.query(sql, [Number(reduced_temperature), roomId]);
}

async function start() {
  try {
    await initDb();
    console.log("✅ Datenbank-Initialisierung abgeschlossen.");
    // Initial-Geräte hinzufügen (falls noch nicht vorhanden)
    await addDevice(1,'thermostat', 'Wohnzimmer');
    await addDevice(2,'fensterkontakt', 'Wohnzimmer');
    console.log("✅ Geräte wurden erfolgreich hinzugefügt.");
  } catch (err) {
    console.error("❌ Fehler während der Initialisierung:", err);
  }
}

start();

module.exports = {
  query: (text, params) => pool.query(text, params),
  addDevice,
  getAllDevices,
  getWohnzimmerDevices,
  getThermostate,
  getFensterkontakte,
  getDeviceByDeviceId,
  deleteDevice,
  getRoomValues,
  updateRoomTemperature,
  updateReducedTemperature
};
