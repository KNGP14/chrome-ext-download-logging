# Chromium-Erweiterung: Download-Richtlinie

:warning: **Hinweis**: Erweiterung befindet sich noch in der Entwicklung!

Chromium bietet die Möglichkeit, über Gruppenrichtlinien das Downloadverzeichnis zu erzwingen.<br>Problem: Downloads über die Kontextmenü-Funktion `(Bild|Link|...) Speichern unter` können nicht kontrolliert werden.

Bei der Nutzung eines Chromium-Browsers als zentrale Downloadlösung sind weitere Dateioperationen, wie die Prüfung durch mehrere Antiviruslösungen oder eine Bereitstellung auf Austauschlaufwerken erforderlich.<br>Dadurch ist es zwingend erforderlich, dass alle Downloads stets in fest definierten Pfaden abgelegt werden.

Mithilfe dieser Erweiterung wird der Download auch über das Konktextmenü auf ein bestimmtes Verzeichnis beschränkt.<br>Zusätzlich wird eine umfangreiche Protokollierung der Downloads.

## Implementierte Funktionen
 - Blockierung aller Downloads, die nicht in das per Registry-Eintrag definierte Verzeichnis gespeichert werden
 - Darstellung von Meldungen in Popup inkl. Badge
 - Protokollierung aller Downloads in eine Logdatei `USERNAME_download.log` in dem per Registry-Eintrag definierten Verzeichnis

## Registry-Einträge
Für die Definition des erlaubten Downloadverzeichnisses und des Protokollverzeichnisses ist jeweils ein Registry-Einträg zu erstellen.<br>
`HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\${browserVendor}\\${browserName}\\3rdparty\\extensions\\${chrome.runtime.id}\\policy`
 - `gpoDownloadPath (REG_SZ)`
 - `gpoLogPath (REG_SZ)`
 Hinweis: Sofern `gpoLogPath` nicht definiert (oder leer), erfolgt die Protokollierung in einen `logs`-Unterordner im Verzeichnis der Host-Anwendung
 
## Installation der Hostanwendung
Für die Protokollierung in eine Logdatei auf dem Dateisystem ist eine Host-Anwendung in Form von einem Powershell-Skript (Windows) erforderlich.
- Repository herunterladen und entpacken
- Kommandozeile mit erhöten Rechten in Unterordner `host` öffnen
- Installation der Host-Anwendung ausführen: `powershell -ExecutionPolicy RemoteSigned -File setup.ps1`
- Zur Deinstallation der Host-Anwendung: `powershell -ExecutionPolicy RemoteSigned -File uninstall.ps1`

## Screenshots
### Popup ohne Meldungen und Erweiterungsoptionen
<p align="center">
 <img src="https://github.com/KNGP14/chromium-download-policy/blob/master/media/prev_no-messages.png" height="300px">
 <img src="https://github.com/KNGP14/chromium-download-policy/blob/master/media/prev_options-page.png" height="300px">
</p>

### Abgebrochener Download mit Benachrichtigungspunkt und angezeigte Fehlermeldung
<p align="center">
 <img src="https://github.com/KNGP14/chromium-download-policy/blob/master/media/prev_cancled-download-and-badge.png" height="300px">
 <img src="https://github.com/KNGP14/chromium-download-policy/blob/master/media/prev_cancled-download-message.png" height="300px">
</p>
