//Schließen eines Fensters
async function setClosed(deviceId) {
    try {
      const res = await fetch(`/fensterkontakte/${deviceId}/closed`, { method: 'POST' });
      const data = await res.json();
      alert(`Fenster ist geschlossen`);
    } catch (err) {
      alert('Fehler beim Schließen des Fensters');
    }
  }
  //Öffnen eines Fensters
  async function setOpen(deviceId) {
    try {
      const res = await fetch(`/fensterkontakte/${deviceId}/open`, { method: 'POST' });
      const data = await res.json();
      alert(`Fenster ist geöffnet:`);
    } catch (err) {
      alert('Fehler beim Öffnen des Fensters');
    }
  }

  //Status eines Fensters abrufen
  async function getStatus(deviceId) {
    try {
      const res = await fetch(`/fensterkontakte/${deviceId}/status`);
      const data = await res.json();
      document.getElementById(`status_${deviceId}`).textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      alert('Fehler beim Abfragen des Status');
    }
  }
