# Chromium-Erweiterung: Download-Richtlinie

:warning: **Hinweis**: Erweiterung befindet sich noch in der Entwicklung!

Chromium bietet die Möglichkeit, über Gruppenrichtlinien den Download-Pfad zu erzwingen.<br>Problem: Downloads über die Kontextmenü-Funktion `(Bild|Link|...) Speichern unter` können nicht kontrolliert werden.

Bei der Nutzung eines Chromium-Browsers als zentrale Downloadlösung sind weitere Dateioperationen, wie die Prüfung durch mehrere Antiviruslösungen oder eine Bereitstellung auf Austauschlaufwerken erforderlich.<br>Dadurch ist es zwingend erforderlich, dass Downloads stets in fest definierten Pfaden abgelegt werden.

Mithilfe dieser Erweiterung soll der Download auch über das Konktextmenü auf ein bestimmtes Verzeichnis beschränkt werden.<br>Zusätzlich soll eine umfangreiche Protokollierung der Downloads erfolgen.

### Registry-Einträge
Für die Definition des erlaubten Downloadverzeichnisses und des Protokollpfades ist jeweils ein Registry-Einträg zu erstellen.<br>Hinweis: Registry-Pfad variiert je nach Chromium-Browser<br>
`HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Edge\\3rdparty\\extensions\\${chrome.runtime.id}\\policy`
 - `gpoDownloadPath (REG_SZ)`
 - `gpoLogPath (REG_SZ)`

### Derzeitiger Stand
 - Downloads werden abgebrochen, sofern nicht Pfad aus `gpoDownloadPath` gewählt wurde
 - derzeit erfolgt nur eine Konsolenausgabe > Popup: [Issue #1](/../../issues/1)
 - Protokollierung aller Downloads erfolgt derzeit auf Konsole > Dateisystemzugriffe o.ä. [Issue #2](/../../issues/2)
 
![alt text](https://github.com/KNGP14/chromium-download-policy/blob/master/media/prev_cancled-download-and-badge.png?raw=true)
![alt text](https://github.com/KNGP14/chromium-download-policy/blob/master/media/prev_cancled-download-message.png?raw=true)
