const Docker = require('dockerode');          
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function createThermostatContainer(thermostatId, roomId = '') {
  const hostPort = 6000 + thermostatId;
  try {
    const container = await docker.createContainer({
      Image: 'thermostat-image',
      name: `web-service-thermostat-${thermostatId}`,
      Env: [
        `THERMOSTAT_ID=${thermostatId}`,
        `ROOM_ID=${roomId}`,   
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