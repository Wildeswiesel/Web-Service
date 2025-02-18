# Web-Services Projekt

<h3>Technologien:</h3>

+ Node
+ Docker


<h3>System starten:</h3>

+ Mit Docker starten: </br>
    + Docker-Image neu bauen: ``` docker-compose up --build ```

+ Außerhalb von Docker starten: </br>
    + PostgreSQL installieren, in pgAdmin anmelden & Datenbank "devicesdb" erstellen
    + In entsprechendem Ordner [z.B.: smarhome/src] : </br>
        ``` $env:PGHOST = "localhost" ``` </br>
        ``` $env:PGPASSWORD = "deinPasswort"  ```     
        ``` node app.js ```     
 


