const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');
const app = express();


const port = process.env.PORT || 3021;

const roomId = process.env.ROOM_ID || 'none';

let windowContacts = {}; // Speichert registrierte Fensterkontakte

const windowContactId = process.env.FENSTERKONTAKT_ID || '1';

let mode = 'closed'; // Fensterzustand: 'closed', 'open'

const SMART_HOME_URL = "http://web-service-smarthome-1:3000/fensterstatus"; // URL vom Smart Home

app.use(express.json());
const OPEN_MODE = 'open';
const CLOSED_MODE = 'closed';

app.get('/status', (req, res) =>  {
    res.json({
        windowContactId,
        roomId,
        mode
    });
});

// Registrierung eines neuen Fensterkontakts
app.post('/register', (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).send({ error: 'ID erforderlich' });
    }
    
    if (windowContacts[id]) {
        return res.status(400).send({ error: 'ID bereits registriert' });
    }
    
    // Starte einen neuen Docker-Container für den Fensterkontakt
    const containerName = `fensterkontakt_${id}`;
    exec(`docker run -d --name ${containerName} fensterkontakt-image`, (err, stdout, stderr) => {
        if (err) {
            return res.status(500).send({ error: 'Fehler beim Erstellen des Containers', details: stderr });
        }
        windowContacts[id] = { id, container: containerName, status: 'geschlossen' };
        res.send({ message: 'Fensterkontakt registriert', containerId: stdout.trim() });
    });
});


// Steuerung eines Fensterkontakts
app.post('/control', (req, res) => {
    const { id, action } = req.body;
    if (!id || !action || !['open', 'close'].includes(action)) {
        return res.status(400).send({ error: 'Ungültige Anfrage' });
    }
    
    if (!windowContacts[id]) {
        return res.status(404).send({ error: 'Fensterkontakt nicht gefunden' });
    }
    
    // Simulierte Steuerung (könnte durch eine API-Kommunikation mit dem Container ersetzt werden)
    windowContacts[id].status = action;
    res.send({ message: `Fenster ${action}`, id });
});

//öffnet das Fenster
app.post('/open', async (req, res) => {
    console.log('Öffne das Fenster...');
    try {
        // Nachricht an das Smart Home senden
        await axios.post(SMART_HOME_URL, {
            deviceId: process.env.FENSTERKONTAKT_ID,
            roomId: process.env.ROOM_ID,
            status: OPEN_MODE  // 'open'
        });
        res.json({ message: `Fenster ist jetzt ${OPEN_MODE}`, success: true });
    } catch (err) {
        console.error('Fehler beim Öffnen des Fensters:', err.message);
        res.status(500).json({ error: 'Smart Home nicht erreichbar' });
    }
});

//schließt das Fenster
app.post('/close', async (req, res) => {
    console.log('Schließe das Fenster...');
    try {
        // Nachricht an das Smart Home senden
        await axios.post(SMART_HOME_URL, {
            deviceId: process.env.FENSTERKONTAKT_ID,
            roomId: process.env.ROOM_ID,
            status: CLOSED_MODE  // 'closed'
        });
        res.json({ message: `Fenster ist jetzt ${CLOSED_MODE}`, success: true });
    } catch (err) {
        console.error('Fehler beim Schließen des Fensters:', err.message);
        res.status(500).json({ error: 'Smart Home nicht erreichbar' });
    }
});
// Liste aller registrierten Fensterkontakte
app.get('/contacts', (req, res) => {
    res.send(windowContacts);
});

app.listen(port, () => {
    console.log(`Fensterkontakt (Raum: ${roomId}) läuft auf Port ${port}`);
});

