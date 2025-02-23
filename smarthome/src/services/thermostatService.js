const Docker = require('dockerode');          //für die Thermostate
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

 // Erstellt einen neuen Thermostat-Container mit der übergebenen numerischen ID, einer Starttemperatur (Standard: 22°C) und optionaler Raumzuordnung.
// src/services/thermostatService.js

async function createThermostatContainer(thermostatId, defaultTemperature = 22, roomId = '') {
  const hostPort = 3000 + thermostatId;
  try {
    const container = await docker.createContainer({
      Image: 'thermostat-image',
      name: `web-service-thermostat-${thermostatId}`,
      Env: [
        `THERMOSTAT_ID=${thermostatId}`,
        `DEFAULT_TEMPERATURE=${defaultTemperature}`,
        `ROOM_ID=${roomId}`,   // Hier wird roomId aus dem Registrierungsprozess verwendet.
        `ROOM_TEMPERATURE=22`,
        `REDUCED_TEMPERATURE=18`,
        `PORT=${hostPort}`
      ],
      ExposedPorts: {
        [`${hostPort}/tcp`]: {}
      },
      HostConfig: {
        NetworkMode: "web-service_smarthome-nw",
        PortBindings: {
          [`${hostPort}/tcp`]: [{ "HostPort": hostPort.toString() }]
        }
      }
    });
    await container.start();
    console.log(`Thermostat-Container ${thermostatId} gestartet. Host Port: ${hostPort}`);
  } catch (err) {
    console.error(`Fehler beim Starten des Containers für Thermostat ${thermostatId}:`, err);
    throw err;
  }
}

module.exports = { createThermostatContainer };

