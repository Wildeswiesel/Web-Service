const { Pool } = require('pg');
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'db',
  database: process.env.PGDATABASE || 'devicesdb',
  password: process.env.PGPASSWORD || 'secret',
  port: 5432,
});


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

// ab hier startet die tabellen generierung 
// Tabelle devices für alle Geräte
async function initDb() {
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
// prüft ob die tabellen schon erstellt worden sind 
async function waitForTable(tableName, retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
      console.log(`✅ Tabelle '${tableName}' ist bereit.`);
      return;
    } catch (err) {
      console.log(`🔄 Warte auf '${tableName}'... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error(`❌ Tabelle '${tableName}' wurde nicht gefunden.`);
}
// schaut welche container schon da sind und uieht sich anhand dessen die diviceId ab und erstellt einen eintrag für das gerät
async function getContainerDeviceMappings() {
    try {
        const containers = await docker.listContainers();
        const deviceMappings = [];

        for (const container of containers) {
            const containerName = container.Names[0].replace("/", ""); // Entfernt "/"
            let matchThermostat = containerName.match(/web-service-thermostat-(\d+)/);
            let matchFensterkontakt = containerName.match(/web-service-fensterkontakt-(\d+)/);

            if (matchThermostat || matchFensterkontakt) {
                const roomId = await getRoomIdFromContainer(container.Id);

                if (!roomId) {
                    console.warn(`⚠️ ROOM_ID für Container ${containerName} nicht gefunden. Überspringe.`);
                    continue;
                }

                if (matchThermostat) {
                    const deviceId = parseInt(matchThermostat[1], 10);
                    deviceMappings.push({ deviceId, type: 'thermostat', roomId });
                }

                if (matchFensterkontakt) {
                    const deviceId = parseInt(matchFensterkontakt[1], 10);
                    deviceMappings.push({ deviceId, type: 'fensterkontakt', roomId });
                }
            }
        }

        return deviceMappings;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Container:", error);
        return [];
    }
}
// schaut in welchen raum der container ist um ihn in den richtigen raum zu speichern
async function getRoomIdFromContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        const containerInfo = await container.inspect();
        const envVars = containerInfo.Config.Env;

        const roomIdVar = envVars.find(env => env.startsWith("ROOM_ID="));
        return roomIdVar ? roomIdVar.split("=")[1] : null;
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen der ROOM_ID für Container ${containerId}:`, error);
        return null;
    }
}
// wird beim starten ausgeführt
async function start() {
    try {
        // erstellen der tabelle rooms & devices
        await initDb();
        console.log("✅ Datenbank-Initialisierung abgeschlossen.");
        // warten auf die 2 tabellen
        
        await waitForTable("devices");
        await waitForTable("rooms");
        
        // Container-IDs abrufen und Geräte hinzufügen
        const deviceMappings = await getContainerDeviceMappings();
        for (const { deviceId, type, roomId } of deviceMappings) {
            await addDevice(deviceId, type, roomId);
        }

        console.log("✅ Geräte wurden erfolgreich basierend auf Containern hinzugefügt.");
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
