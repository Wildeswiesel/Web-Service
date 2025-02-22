const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 3021;

const roomId = process.env.ROOM_ID || 'none';

let windowContacts = {}; // Speichert registrierte Fensterkontakte

const windowContactId = process.env.FENSTERKONTAKT_ID || '1';

let mode = 'closed'; // Fensterzustand: 'closed', 'open'

app.use(express.json());

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

// Umschalten des Fensterzustands
app.post('/toggle', (req, res) => {
    mode = mode === 'closed' ? 'open' : 'closed';
    res.send({ message: `Fenster ist jetzt ${mode}` });
});

// Liste aller registrierten Fensterkontakte
app.get('/contacts', (req, res) => {
    res.send(windowContacts);
});


// UI für Fenstersteuerung
//app.get('/', (req, res) => {
//    res.sendFile(path.join(__dirname, 'src', 'index.ejs'));
//}); 

app.listen(port, () => {
    console.log(`Fensterkontakt (Raum: ${roomId}) läuft auf Port ${port}`);
});

