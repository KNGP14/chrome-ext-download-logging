/**
 * Klasse zur Behandlung von Fehlermeldungen für popup.html
 */
var ErrorForPopup = class {

    // Fehlertypen
    static TYPES = {
        BLOCKEDDOWNLOAD: 1
    }

    // Konstante für Identifier der Fehlermeldungen in localStorage
    static STORAGEIDENTIFIER = "ErrorsForPopup";

    /**
     * Neuen Fehler für Popup anlegen
     * @param {int} type Wert aus ErrorForPopup.TYPES
     * @param {string} title Titel der Fehlermeldung
     * @param {array} msgLines Zeilen der Fehlermeldung als Array aus Strings
     */
    constructor(type, timestamp, title, msgLines) {
        this.type = type;
        this.title = title;
        this.timestamp = timestamp;
        this.msgLines = msgLines;
    }

    /**
     * Gibt Typ der Fehlermeldung zurück
     */
    getType() {
        return this.type;
    }

    /**
     * Gibt Zeitstempel als YYYY-MM-DD HH:mm:ss der Fehlermeldung zurück
     */
    getTimestamp() {
        return this.timestamp;
    }

    /**
     * Gibt Titel der Fehlermeldung zurück
     */
    getTitle() {
        return this.title;
    }

    /**
     * Gibt Array mit Zeilen der Fehlermeldungen zurück
     */
    getMessages() {
        return this.msgLines;
    }

    /**
     * Neue Zeile zu Fehlermeldung hinzufügen
     * @param {string} msgLine Weitere Information zum Fehler
     */
    addMessage(msgLine) {
        this.msgLines.push(msgLine);
    }
}

/**
 * Speichern eines neuen Fehlers via Storage-API
 * @param {ErrorForPopup} newError Fehler vom Typ ErrorForPopup
 */
function pushErrorForPopupToStorage(newError) {

    // Zuerst aktuell gespeicherte Fehler abrufen
    chrome.storage.local.get([ErrorForPopup.STORAGEIDENTIFIER], function(currentStorage) {

        let currentErrorList = currentStorage[ErrorForPopup.STORAGEIDENTIFIER];

        if (currentErrorList == undefined) {
            // Keine Fehler vorhanden --> neu anlegen
            currentErrorList = [newError]
        } else {
            // Bereits Fehler vorhanden --> hinzufügen
            currentErrorList.push(newError);
        }

        // Ojekt zum Speichern in Storage zusammenstellen und speichern
        let updatedErrorStorageObject = new Object;
        updatedErrorStorageObject[ErrorForPopup.STORAGEIDENTIFIER] = currentErrorList;
        chrome.storage.local.set(updatedErrorStorageObject, () => {   

            // Speichern erfolgreich -> Badge als Hinweis für Nutzer an Icon platzieren
            // https://github.com/KNGP14/chromium-download-policy/issues/1
            chrome.browserAction.setBadgeText({text: "!"});
            chrome.browserAction.setBadgeBackgroundColor({ color: [171, 42, 7, 255] });

        });

    });
}

/**
 * Funktion zum Löschen aller Fehlermeldungen via Storage-API und Badge entfernen
 */
function deleteAllErrorsForPopup() {
    chrome.storage.local.remove([ErrorForPopup.STORAGEIDENTIFIER], function(storage) {
        log("Alle Fehlermeldungen für Popup gelöscht");

        // Badge nach Löschen aller Meldungen entfernen
        // https://github.com/KNGP14/chromium-download-policy/issues/1
        chrome.browserAction.setBadgeText({text: ""});
    });
}

/**
 * Zeitstempel zurückgeben
 */
function getCurrentTimestamp() {
    let now = new Date();

    const yyyy = now.getFullYear();
    let mm = now.getMonth()+1; 
    let dd = now.getDate();
    let HH = now.getHours();
    let MM = now.getMinutes();
    let ss = now.getSeconds();

    if(dd < 10) { dd = `0${dd}`; }
    if(mm < 10) { mm = `0${mm}`; }
    if(HH < 10) { HH = `0${HH}`; }
    if(MM < 10) { MM = `0${MM}`; }
    if(ss < 10) { ss = `0${ss}`; }

    return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${ss}`;
}

var port = null;
/**
 * Funktion zum Protokollieren
 * https://github.com/KNGP14/chromium-download-policy/issues/2
 * @param {string} msg Zu protokollierender String oder Objekt
 */
function log(msg) {
    if (typeof msg == "string") {
        console.log(`${getCurrentTimestamp()} ${msg}`);
    } else {
        console.log(msg);
    }

    // Verbindung mit Host aufbauen
    port = chrome.runtime.connectNative("com.github.kngp14.chromium.download.policy");

    // Listener für Rückmeldungen
    port.onMessage.addListener((message) => {
      console.log(`${getCurrentTimestamp()} Rückmeldung von Hostanwendung: \n ${JSON.stringify(message)}`);
    });

    // Verbindung schließen
    port.onDisconnect.addListener(() => {
      console.log(`${getCurrentTimestamp()} Verbindung zu Host getrennt (${chrome.runtime.lastError.message})`);
      port = null;
    });

    // Log-Eintrag
    message = {"text": `${getCurrentTimestamp()} ${msg}`};
    
    // Log-Eintrag an Host zum Schreiben in Datei übergeben
    port.postMessage(message);
}

function debugPrintErrorStorage() {
    chrome.storage.local.get([ErrorForPopup.STORAGEIDENTIFIER], function(storage) {
        log("debugPrintErrorStorage():");
        log(storage[ErrorForPopup.STORAGEIDENTIFIER]);
    });
}

function debugClearStorage() {
    chrome.storage.local.clear(() => { log("Kompletten Storage der Erweiterung gelöscht"); });

}

/**
 * Anderen Zielpfad für Download als in Registry hinterlegt verbieten
 * @param {int} currentDownloadId ID des Downloads
 * @param {string} currentDownloadPath Speicherort/Pfad des Downloads
 */
function blockForbiddenDownloadLocation(currentDownloadId, currentDownloadPath) {
    chrome.storage.managed.get(['gpoDownloadPath'], function (value) {
        if (currentDownloadPath != "" && !currentDownloadPath.startsWith(value.gpoDownloadPath)) {
            // Downloadpfad nicht erlaubt
            
            let errorForPopup = new ErrorForPopup(
                ErrorForPopup.TYPES.BLOCKEDDOWNLOAD,
                getCurrentTimestamp(),
                `[Fehler] Compliance-Verstoß`,
                [`Download der Datei "${currentDownloadPath}" erfolgte nicht nach: "${value.gpoDownloadPath}"`]
            );
            log(`${errorForPopup.getTitle()}: ${errorForPopup.getMessages()[0]} Download wird abgebrochen ...`);

            // Download abbrechen
            chrome.downloads.cancel(currentDownloadId, function() {
                errorForPopup.addMessage(`Download wurde abgebrochen!`);
                pushErrorForPopupToStorage(errorForPopup);
                log("Download wurde abgebrochen und Badge aktualisiert");
            })
        } else {
            // Downloadpfad erlaubt
            log(`Download entspricht Compliance-Vorgaben`);
        }
    });
}

/**
 * Installation der Listener
 */
chrome.runtime.onInstalled.addListener(function() {

    // Registry-Werte einlesen/testen
    log("Policies werden eingelesen ...");
    chrome.storage.managed.get(function(value) {
        log(value);
    });

    /**
     * Erkennung eines Dateidownloads
     * Hinweis: beinhaltet NICHT Kontextmenüfunktion "(Bild|Link|...) Speichern unter"
     */
    chrome.downloads.onCreated.addListener(function(item) {

        // Protokollierung auf Konsole
        // TODO: Protokollierung in Dateisystem o.ä.
        log(
            `(${item.id}) Download wurde gestartet ...\n` +
            ` - id:        ${item.id} \n` +
            ` - mime:      ${item.mime} \n` +
            ` - filename:  ${item.filename} \n` +
            ` - startTime: ${new Date(item.startTime).toISOString()} \n` +
            ` - finalUrl:  ${item.finalUrl} \n`
        );

        // Speicherort für Download prüfen und ggf. blockieren
        blockForbiddenDownloadLocation(item.id, item.filename);
        
    });

    /**
     * Erkennung einer Statusänderung in Folge von Downloadbeginn, -abschluss oder -abbruch
     * Hinweis: beinhaltet auch Kontextmenüfunktion "Speichern unter" (nutzt nicht eingebaute Policy für Download-Pfad)
     */
    chrome.downloads.onChanged.addListener(function(changed) {

        if (changed.filename) {
            // Dateiname für Download wurde festgelegt (insbesondere bei Nutzung des Kontextmenüs "Speichern unter")

            // Protokollierung auf Konsole
            // TODO: Protokollierung in Dateisystem o.ä.
            log(
                `(${changed.id}) Dateiname wurde festgelegt ...\n` +
                ` - filename:  ${changed.filename.current} \n`
            );
            
            // Speicherort für Download prüfen und ggf. blockieren
            blockForbiddenDownloadLocation(changed.id, changed.filename.current);
            
        } else if (changed.state) {

            // Status eines Downloads hat sich verändert (Start, Abbruch, Abgeschlossen)

            if (changed.state.current == 'interrupted') {

                // Protokollierung auf Konsole
                // TODO: Protokollierung in Dateisystem o.ä.
                log(
                    `(${changed.id}) Download wurde abgebrochen ...\n` +
                    ` - error:     ${changed.error.current} \n`
                );

            } else if (changed.state.current == 'complete') {
        
                // Protokollierung auf Konsole
                // TODO: Protokollierung in Dateisystem o.ä.
                log(
                    `(${changed.id}) Download wurde abgeschlossen ...\n` +
                    ` - endTime:   ${new Date(changed.endTime.current).toISOString()} \n`
                );
            }
        }
    });

});