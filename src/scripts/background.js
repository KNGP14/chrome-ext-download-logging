/**
 * Klasse zur Behandlung von Fehlermeldungen für popup.html
 */
class ErrorForPopup {

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
    constructor(type, title, msgLines) {
        this.type = type;
        this.title = title;
        this.msgLines = msgLines;
    }

    /**
     * Gibt Typ der Fehlermeldung zurück
     */
    getType() {
        return this.type;
    }

    /**
     * Gibt Titel der Fehlermeldung
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
 * Speichern eines neuen Fehlers in Storage
 * @param {ErrorForPopup} newError Fehler vom Typ ErrorForPopup
 */
function pushErrorForPopupToStorage(newError) {

    // Zuerst aktuell gespeicherte Fehler abrufen
    chrome.storage.sync.get([ErrorForPopup.STORAGEIDENTIFIER], function(currentStorage) {

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
        chrome.storage.sync.set(updatedErrorStorageObject, () => {   

            // Speichern erfolgreich -> Badge als Hinweis für Nutzer an Icon platzieren
            // https://github.com/KNGP14/chromium-download-policy/issues/1
            chrome.browserAction.setBadgeText({text: "!"});
            chrome.browserAction.setBadgeBackgroundColor({ color: [171, 42, 7, 255] });

        });

    });
}

function deleteAllErrorsForPopupFromStorage() {
    chrome.storage.sync.remove([ErrorForPopup.STORAGEIDENTIFIER], function(storage) {
        console.log("Alle Fehlermeldungen für Popup gelöscht");
    });
}

function debugPrintErrorStorage() {
    chrome.storage.sync.get([ErrorForPopup.STORAGEIDENTIFIER], function(storage) {
        console.log("debugPrintErrorStorage():");
        console.log(storage[ErrorForPopup.STORAGEIDENTIFIER]);
    });
}

function debugClearStorage() {
    chrome.storage.sync.clear(() => { console.log("Kompletten Storage der Erweiterung gelöscht"); });

}

/**
 * Anderen Zielpfad für Download als in Registry hinterlegt verbieten
 * @param {int} currentDownloadId ID des Downloads
 * @param {string} currentDownloadPath Speicherort/Pfad des Downloads
 */
function blockForbiddenDownloadLocation(currentDownloadId, currentDownloadPath) {
    chrome.storage.managed.get(['gpoDownloadPath'], function (value) {
        let gpoDownloadPath = value.gpoDownloadPath;
        if (currentDownloadPath != "" && !currentDownloadPath.startsWith(gpoDownloadPath)) {
            // Downloadpfad nicht erlaubt
            let errorForPopup = new ErrorForPopup(ErrorForPopup.TYPES.BLOCKEDDOWNLOAD, `Compliance-Verstoß`, [`Download erfolgte nicht nach: "${gpoDownloadPath}"`]);
            console.log(`${errorForPopup.getTitle()}: ${errorForPopup.getMessages()[0]} Download wird abgebrochen ...`);

            // Download abbrechen
            chrome.downloads.cancel(currentDownloadId, function() {
                errorForPopup.addMessage(`Download wurde abgebrochen!`);
                pushErrorForPopupToStorage(errorForPopup);
                console.log("Download wurde abgebrochen und Badge aktualisiert");
            })
        } else {
            // Downloadpfad nicht erlaubt
            console.log(`blockForbiddenDownloadLocation: Erlaubter Download`);
        }
    });
}

/**
 * Installation der Listener
 */
chrome.runtime.onInstalled.addListener(function() {

    // Registry-Werte einlesen/testen
    console.log("Policies werden eingelesen ...");
    chrome.storage.managed.get(function(value) {
        console.log(value);
    });

    /**
     * Erkennung eines Dateidownloads
     * Hinweis: beinhaltet NICHT Kontextmenüfunktion "(Bild|Link|...) Speichern unter"
     */
    chrome.downloads.onCreated.addListener(function(item) {

        // Protokollierung auf Konsole
        // TODO: Protokollierung in Dateisystem o.ä.
        let now = new Date();
        console.log(
            `${now.toISOString()} (${item.id}) Download wurde gestartet ...\n` +
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

        let now = new Date();

        if (changed.filename) {
            // Dateiname für Download wurde festgelegt (insbesondere bei Nutzung des Kontextmenüs "Speichern unter")

            // Protokollierung auf Konsole
            // TODO: Protokollierung in Dateisystem o.ä.
            console.log(
                `${now.toISOString()} (${changed.id}) Dateiname wurde festgelegt ...\n` +
                ` - filename:  ${changed.filename.current} \n`
            );
            
            // Speicherort für Download prüfen und ggf. blockieren
            blockForbiddenDownloadLocation(changed.id, changed.filename.current);
            
        } else if (changed.state) {

            // Status eines Downloads hat sich verändert (Start, Abbruch, Abgeschlossen)

            if (changed.state.current == 'interrupted') {

                // Protokollierung auf Konsole
                // TODO: Protokollierung in Dateisystem o.ä.
                console.log(
                    `${now.toISOString()} (${changed.id}) Download wurde abgebrochen ...\n` +
                    ` - error:     ${changed.error.current} \n`
                );

            } else if (changed.state.current == 'complete') {
        
                // Protokollierung auf Konsole
                // TODO: Protokollierung in Dateisystem o.ä.
                console.log(
                    `${now.toISOString()} (${changed.id}) Download wurde abgeschlossen ...\n` +
                    ` - endTime:   ${new Date(changed.endTime.current).toISOString()} \n`
                );
            }
        }
    });

});