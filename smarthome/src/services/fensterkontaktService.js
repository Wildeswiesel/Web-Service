const Docker = require('dockerode');      
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

 // Erstellt einen neuen Fenstekontakt-Container mit der übergebenen numerischen ID, einem Startzustand (Standard: 'closed') und optionaler Raumzuordnung.
async function createFensterkontaktContainer(fensterkontaktId, defaultMode = 'closed', roomId = '') {
  //dynamischer Host-Port:
  const hostPort = 3020 + fensterkontaktId;

  try {
    const container = await docker.createContainer({
      Image: 'fensterkontakt-image', // Dieses Image muss vorher gebaut werden 
      name: `web-service-fensterkontakt-${fensterkontaktId}`,    
      Env: [
        `FENSTERKONTAKT_ID=${fensterkontaktId}`,
        `DEFAULT_MODE=${defaultMode}`,
        `ROOM_ID=${roomId}`
      ],
      ExposedPorts: {
        [`${hostPort}/tcp`]: {}  
      },


      HostConfig: {
        NetworkMode: "web-service_smarthome-nw",
        PortBindings: {
          [`${hostPort}/tcp`]:  [
            {
              "HostPort": hostPort.toString()  //Dynamischer HostPort nach Id   --> erreichbar z.B.: über http://localhost:3022/update   für Fensterkontakt mit der Id = 2
            }
          ]
        }
      }
    });
    await container.start();
    console.log(`Fensterkontakt-Container ${fensterkontaktId} gestartet. Host Port: ${hostPort}`);
  } catch (err) {
    console.error(`Fehler beim Starten des Containers für Fensterkontakt ${fensterkontaktId}:`, err);
    throw err;
  }
}

module.exports = { createFensterkontaktContainer };