# Chromium-Erweiterung: Download-Richtlinie

:warning: **Hinweis**: Erweiterung befindet sich noch in der Entwicklung!

Chromium bietet die Möglichkeit, über Gruppenrichtlinien den Download-Pfad zu erzwingen.<br>Problem: Downloads über die Kontextmenü-Funktion `(Bild|Link|...) Speichern unter` können nicht kontrolliert werden.

Bei der Nutzung eines Chromium-Browsers als zentrale Downloadlösung sind weitere Dateioperationen, wie die Prüfung durch mehrere Antiviruslösungen oder eine Bereitstellung auf Austauschlaufwerken erforderlich.<br>Dadurch ist es zwingend erforderlich, dass Downloads stets in fest definierten Pfaden abgelegt werden.

Mithilfe dieser Erweiterung soll der Download auch über das Konktextmenü auf ein bestimmtes Verzeichnis beschränkt werden.<br>Zusätzlich soll eine umfangreiche Protokollierung der Downloads erfolgen.

## Implementierte Funktionen
 - Blockierung aller Downloads, die nicht nach `gpoDownloadPath` gespeichert werden
 - Darstellung von Meldungen in Popup inkl. Badge
 - Protokollierung aller Downloads erfolgt derzeit in Logdatei auf Dateisystem mittels Hostanwendung

## Registry-Einträge
Für die Definition des erlaubten Downloadverzeichnisses und des Protokollpfades ist jeweils ein Registry-Einträg zu erstellen.<br>
`HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\${browserVendor}\\${browserName}\\3rdparty\\extensions\\${chrome.runtime.id}\\policy`
 - `gpoDownloadPath (REG_SZ)`
 - `gpoLogPath (REG_SZ)`
 
## Installation der Hostanwendung
Für die Protokollierung in eine Logdatei auf dem Dateisystem ist eine Host-Anwendung in Form von einem Powershell-Skript erforderlich.
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
