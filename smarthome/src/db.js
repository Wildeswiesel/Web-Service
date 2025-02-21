//anmelde Funktion
const { Pool } = require('pg');
//anmelde Daten
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'devicesdb',
  password: process.env.PGPASSWORD || 'secret',
  port: 5432,
});
//Erstellt Tabelle devices falls diese nicht vorhanden ist
async function initDb() {
  // Tabelle devices für alle Geräte
  const createDevicesTableSQL = `
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      deviceId INT NOT NULL,
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
      current_temperature NUMERIC DEFAULT 20
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
//wird benötigt damit die ersten beiden container in der datenbank sind
async function addDevice(deviceId, type, roomId) {
  try {
    // 1️⃣ Prüfen, ob das Gerät bereits existiert
    const checkQuery = `
      SELECT * FROM devices WHERE deviceId = $1 AND type = $2 AND roomId = $3;
    `;
    const checkResult = await pool.query(checkQuery, [deviceId, type, roomId]);

    if (checkResult.rows.length > 0) {
      console.log(`⚠️ Gerät (${deviceId}, ${type}, ${roomId}) existiert bereits.`);
      return checkResult.rows[0]; // Bestehendes Gerät zurückgeben
    }

    // 2️⃣ Falls nicht vorhanden, füge das Gerät hinzu
    const insertQuery = `
      INSERT INTO devices (deviceId, type, roomId) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [deviceId, type, roomId]);
    console.log('✅ Gerät erfolgreich hinzugefügt:', result.rows[0]);

    return result.rows[0];

  } catch (err) {
    console.error('❌ Fehler beim Einfügen des Geräts:', err.message);
    throw err;
  }
}

async function start() {
  try {
    await initDb();  // Stellt sicher, dass die Tabelle erstellt wird, bevor Geräte eingefügt werden
    console.log("✅ Datenbank-Initialisierung abgeschlossen.");

    await addDevice(1, 'thermostat', 'Wohnzimmer');
    await addDevice(1, 'fensterkontakt', 'Wohnzimmer'); // Achte darauf, dass deviceId nicht doppelt ist
    console.log("✅ Geräte wurden erfolgreich hinzugefügt.");
  } catch (err) {
    console.error("❌ Fehler während der Initialisierung:", err);
  }
}

start()
module.exports = {
  query: (text, params) => pool.query(text, params)
};
