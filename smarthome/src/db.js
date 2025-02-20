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



initDb();


module.exports = {
  query: (text, params) => pool.query(text, params),
};
