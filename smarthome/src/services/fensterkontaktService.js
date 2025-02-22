const Docker = require('dockerode');      
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

 // Erstellt einen neuen Fenstekontakt-Container mit der übergebenen numerischen ID, einem Startzustand (Standard: 'closed') und optionaler Raumzuordnung.
// src/services/fensterkontaktService.js

async function createFensterkontaktContainer(deviceId, defaultMode = 'closed', roomId = '') {
  const hostPort = 3020 + deviceId; // Dynamischer Port

  try {
    const container = await docker.createContainer({
      Image: 'fensterkontakt-image',
      name: `web-service-fensterkontakt-${deviceId}`,
      Env: [
        `FENSTERKONTAKT_ID=${deviceId}`,
        `DEFAULT_MODE=${defaultMode}`,
        `ROOM_ID=${roomId}`
      ],
      ExposedPorts: {
        [`${hostPort}/tcp`]: {}
      },
      HostConfig: {
        NetworkMode: "web-service_smarthome-nw",
        PortBindings: {
          [`${hostPort}/tcp`]: [
            {
              "HostPort": hostPort.toString()
            }
          ]
        }
      }
    });

    await container.start();
    console.log(`Fensterkontakt-Container ${deviceId} gestartet. Host Port: ${hostPort}`);
  } catch (err) {
    console.error(`Fehler beim Starten des Containers für Fensterkontakt ${deviceId}:`, err);
    throw err;
  }
}


module.exports = { createFensterkontaktContainer };