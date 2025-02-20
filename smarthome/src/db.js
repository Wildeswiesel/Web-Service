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
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      deviceId INT NOT NULL,
      type TEXT NOT NULL,
      roomId TEXT
    )
  `;
  try {
    await pool.query(createTableSQL);
    console.log('Tabelle "devices" ist bereit (ggf. gerade erstellt).');
  } catch (err) {
    console.error('Fehler beim Erstellen der Tabelle:', err);
  }
}
//wird benötigt damit die ersten beiden container in der datenbank sind
async function addDevice(deviceId, type, roomId) {
  try {
    const query = `
      INSERT INTO devices (deviceId, type, roomId) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `;

    const values = [deviceId, type, roomId];
    const result = await pool.query(query, values);

    console.log('Gerät erfolgreich hinzugefügt:', result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error('Fehler beim Einfügen des Geräts:', err.message);
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
  query: (text, params) => pool.query(text, params),
};
