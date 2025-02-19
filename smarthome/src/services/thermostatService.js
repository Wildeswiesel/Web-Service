const Docker = require('dockerode');          //für die Thermostate
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Erstellt einen neuen Thermostat-Container mit der übergebenen numerischen ID,
 * einer Starttemperatur und optionaler Raumzuordnung.
 * @param {number} thermostatId - Numerische ID, z.B. 1, 2, 3,...
 * @param {number} defaultTemperature - Starttemperatur (Standard: 22°C).
 * @param {string} roomId - Raumzuordnung (optional).
 */
async function createThermostatContainer(thermostatId, defaultTemperature = 22, roomId = '') {
  try {
    const container = await docker.createContainer({
      Image: 'thermostat-image', // Dieses Image muss vorher gebaut werden 
      name: `thermostat_${thermostatId}`,    //Könnte man vermutlich noch anpassen zu thermostat-
      Env: [
        `THERMOSTAT_ID=${thermostatId}`,
        `DEFAULT_TEMPERATURE=${defaultTemperature}`,
        `ROOM_ID=${roomId}`
      ]
    });
    await container.start();
    console.log(`Thermostat-Container ${thermostatId} gestartet.`);
  } catch (err) {
    console.error(`Fehler beim Starten des Containers für Thermostat ${thermostatId}:`, err);
    throw err;
  }
}

module.exports = { createThermostatContainer };

