const Docker = require('dockerode');          //für die Thermostate
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

 // Erstellt einen neuen Thermostat-Container mit der übergebenen numerischen ID, einer Starttemperatur (Standard: 22°C) und optionaler Raumzuordnung.
async function createThermostatContainer(thermostatId, defaultTemperature = 22, roomId = '') {
  //dynamischer Host-Port:
  const hostPort = 3002 + thermostatId;

  try {
    const container = await docker.createContainer({
      Image: 'thermostat-image', // Dieses Image muss vorher gebaut werden 
      name: `thermostat_${thermostatId}`,    //Könnte man vermutlich noch anpassen zu thermostat-
      Env: [
        `THERMOSTAT_ID=${thermostatId}`,
        `DEFAULT_TEMPERATURE=${defaultTemperature}`,
        `ROOM_ID=${roomId}`
      ],
      ExposedPorts: {
        "3001/tcp": {}  //Der Container hört intern auf Port 3001
      },


      HostConfig: {
        PortBindings: {
          "3001/tcp": [
            {
              "HostPort": hostPort.toString()  //Dynamischer HostPort nach Id   --> erreichbar z.B.: über http://localhost:3003/update   für Thermostat mit der Id = 1
            }
          ]
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

