
// Klasse zur Behandlung von Fehlermeldungen für popup.html
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
// Klasse für Warteschlange mit auszuführenden Promises
var Queue = class {

    /**
     * Copyright: ogostos
     * https://medium.com/@karenmarkosyan/how-to-manage-promises-into-dynamic-queue-with-vanilla-javascript-9d0d1f8d4df5
     */

    static queue = [];
    static pendingPromise = false;

    /**
     * Promise zur Ausführung in Warteschlange aufnehmen
     * @param {Promise} promise Promise, der in Warteschlage aufgenommen werden soll
     */
    static enqueue(promise) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                promise,
                resolve,
                reject,
            });
            this.dequeue();
        });
    }

    /**
     * Abarbeitung aller Promises in Warteschlange
     */
    static dequeue() {
        if (this.workingOnPromise) {
            return false;
        }
        const item = this.queue.shift();
        if (!item) {
            return false;
        }
        try {
            this.workingOnPromise = true;
            item.promise()
                .then((value) => {
                    this.workingOnPromise = false;
                    item.resolve(value);
                    this.dequeue();
                })
                .catch(err => {
                    this.workingOnPromise = false;
                    item.reject(err);
                    this.dequeue();
                })
        } catch (err) {
            this.workingOnPromise = false;
            item.reject(err);
            this.dequeue();
        }
        return true;
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

/**
 * Objekt als formatierten String zurückgeben
 * @param {Object} object Zu konvertierendes Objekt
 */
function objectToString(object) {
    return JSON.stringify(object, undefined, 2);
}

/***
 * Promise zur Übergabe der Log-Meldung an Host zum Schreiben in Datei
 */
const logToHost = (message) => new Promise(
    function(resolve, reject) {
        // Übermittlung an Hostanwendung
        chrome.runtime.sendNativeMessage(
            "com.github.kngp14.chromium.download.policy",
            message,
            (resp) => {
                let error = chrome.runtime.lastError;
                if(error != undefined) {
                    // Promise nicht erfolgreich abgeschlossen --> catch()
                    reject(`"${message["text"]}" konnte nicht in Datei geschrieben werden: ${error.message}`);
                } else {
                    if(resp != undefined) {
                        // Promise erfolgreich abschließen --> then()
                        resolve(resp);
                    } else {
                        // Promise nicht erfolgreich abgeschlossen --> catch()
                        reject(`Response undefined --> lastError: ${error}`)
                    }
                }
            }
        );
    }
).then(
    function(resolvedResult) {
        console.log(`Meldung erfolgreich in Datei geschrieben! Rückgabe der Hostanwendung: ${objectToString(resolvedResult)}`);
    }
).catch(
    function(rejectedError) {
        console.error(`Meldung konnte nicht erfolgreich in Datei geschrieben werden! Fehlermeldung: ${objectToString(rejectedError)}`);
    }
)

/**
 * Funktion zum Protokollieren
 * https://github.com/KNGP14/chromium-download-policy/issues/2
 * @param {string} msg Zu protokollierender String oder Objekt
 */
function log(msg) {

    // Log-Eintrag formatieren
    let message = {"text": `${getCurrentTimestamp()} ${msg}`};
    if (typeof msg == "object") {
        message = {"text": `${getCurrentTimestamp()} ${objectToString(msg)}`};
    }
    console.log(message["text"]);

    // Log-Eintrag zur Queue hinzufügen
    Queue.enqueue(() => logToHost(message));    
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
                `[Fehler] Compliance-Verstoss`,
                [`Download der Datei "${currentDownloadPath}" erfolgte nicht nach: "${value.gpoDownloadPath}"`]
            );
            log(`(${currentDownloadId}) ${errorForPopup.getTitle()}: ${errorForPopup.getMessages()[0]} Download wird abgebrochen ...`);

            // Download abbrechen
            chrome.downloads.cancel(currentDownloadId, function() {
                errorForPopup.addMessage(`Download wurde abgebrochen!`);
                pushErrorForPopupToStorage(errorForPopup);
                log(`(${currentDownloadId}) Badge aktualisiert`);
            })
        } else {
            // Downloadpfad erlaubt
            log(`(${currentDownloadId}) Download entspricht Compliance-Vorgaben`);
        }
    });
}

/**
 * Installation der Listener
 */
chrome.runtime.onInstalled.addListener(function() {

    // Registry-Werte einlesen/testen
    log("Policies werden eingelesen ...");
    chrome.storage.managed.get(function(policiesObject) {
        log(`Eingelesene Policies: ${objectToString(policiesObject)}`);
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
            ` - finalUrl:  ${item.finalUrl}`
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
                ` - filename:  ${changed.filename.current}`
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
                    ` - error:     ${changed.error.current}`
                );

            } else if (changed.state.current == 'complete') {
        
                // Protokollierung auf Konsole
                // TODO: Protokollierung in Dateisystem o.ä.
                log(
                    `(${changed.id}) Download wurde abgeschlossen ...\n` +
                    ` - endTime:   ${new Date(changed.endTime.current).toISOString()}`
                );
            }
        }
    });

});