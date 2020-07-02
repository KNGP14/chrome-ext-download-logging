
// Klasse zur Behandlung von Fehlermeldungen für popup.html
var ErrorForPopup = class {

    // Fehlertypen
    static TYPES = {
        BLOCKEDDOWNLOAD: 1,
        FAILEDHOSTCOMMUNICATION: 2,
        MISSINGGPO: 3
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
        console.log({
            "info": "Alle Fehlermeldungen für Popup gelöscht"
        });

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
const logToHost = (message, resultFunction) => new Promise(
    function(resolve, reject) {
        // Übermittlung an Hostanwendung
        chrome.runtime.sendNativeMessage(
            "com.github.kngp14.chromium.download.policy",
            message,
            (resp) => {
                // Ergebnisobjekt für catch und then
                let result = {
                    info : "Unbekannter Fehler aufgetreten",
                    messageToLog: message["text"],
                    trace : undefined,
                    logFile: "Unbekannt",
                    function: resultFunction
                }

                // Fehler auslesen
                let error = chrome.runtime.lastError;

                if(error != undefined) {

                    // Promise nicht erfolgreich abschließen --> catch()
                    result.info = "Fehler bei Kommunikation mit Hostanwendung";
                    result.trace = error.message;
                    reject(result);

                } else {
                    if(resp != undefined) {

                        // Rückgabe auswerten
                        result.info = resp.status;
                        result.messageToLog = resp.recievedMessageText;
                        result.logFile = resp.logFile;

                        if(resp.status == "SUCCESS") {
                            // Promise erfolgreich abschließen --> then()
                            resolve(result);
                        } else {
                            // Promise nicht erfolgreich abschließen --> catch()
                            result.trace = resp.lastError;
                            reject(result);
                        }

                    } else {

                        // Promise nicht erfolgreich abschließen --> catch()
                        result.info = "Keine Rückgabe von Hostanwendung erhalten";
                        result.trace = error;
                        reject(result);

                    }
                }
            }
        );
    }
).then(
    function(result) {
        console.log({
            "info" : "Meldung erfolgreich in Datei geschrieben.",
            "info_details" : result
        });

        // Optionale Ergebnisfunktion ausführen
        if (typeof result.function == "function") {
            result.function("SUCCESS", result);
        }
    }
).catch(
    function(result) {
        console.error({
            "error" : "Meldung konnte nicht erfolgreich in Datei geschrieben werden!",
            "error_details": result
        });
        
        // Fehlermeldung in Popup anzeigen
        let errorForPopup = new ErrorForPopup(
            ErrorForPopup.TYPES.FAILEDHOSTCOMMUNICATION,
            getCurrentTimestamp(),
            `[Fehler] Kommunikationsproblem mit Hostanwendung`,
            [`Meldungen konnten nicht in Log-Datei geschrieben werden!`]
        );
        pushErrorForPopupToStorage(errorForPopup);

        // Optionale Ergebnisfunktion ausführen
        if (typeof result.function == "function") {
            result.function("FAILURE", result);
        }
    }
)

/**
 * Funktion zum Protokollieren
 * https://github.com/KNGP14/chromium-download-policy/issues/2
 * @param {string} msg Zu protokollierender String oder Objekt
 * @param {function} resultFunction Optionale Funktion mit 2 Argumenten (status:"SUCCESS"|"FAILURE", resultObject), die nach erfolgreicher oder fehlerhaften Protokollierung ausgeführt wird
 */
function log(msg, resultFunction) {

    // Log-Eintrag formatieren
    let message = {"text": `${getCurrentTimestamp()} ${msg}`};
    if (typeof msg == "object") {
        message = {"text": `${getCurrentTimestamp()} ${objectToString(msg)}`};
    }

    // Log-Pfad aus GPO auslesen
    chrome.storage.managed.get(['gpoLogPath'], function (value) {
        let gpoLogPath = "undefined";
        if(!chrome.runtime.lastError) {
            if (value.gpoLogPath != "") {
                gpoLogPath = value.gpoLogPath;
            }
        }
        message["logpath"] = gpoLogPath;

        // Log-Eintrag zur Queue hinzufügen
        console.log({
            "info": "Zu protokollierendes Ereignis:",
            "info_details": message
        });
        Queue.enqueue(() => logToHost(message, resultFunction));
    });

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

        let gpoDownloadPath = "undefined";
        if(!chrome.runtime.lastError) {
            if (value.gpoDownloadPath != "") {
                gpoDownloadPath = value.gpoDownloadPath;
            }
        }

        if (gpoDownloadPath != "undefined") {

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
                })
            } else {
                // Downloadpfad erlaubt
                log(`(${currentDownloadId}) Download entspricht Compliance-Vorgaben`);
            }
            
        } else {

            // Kein Download-Pfad per GPO gesetzt
            let errorForPopup = new ErrorForPopup(
                ErrorForPopup.TYPES.MISSINGGPO,
                getCurrentTimestamp(),
                `[Fehler] Fehlende Gruppenrichtlinie`,
                [`Downloadverzeichnis wurde nicht per Gruppenrichtlinie definiert.`,
                 `Prüfung der Downloads kann nicht erfolgen.`]
            );
            log(`(${currentDownloadId}) ${errorForPopup.getTitle()}: ${errorForPopup.getMessages()[0]}\n${errorForPopup.getMessages()[0]}\nDownload wird abgebrochen ...`);

            // Download abbrechen
            chrome.downloads.cancel(currentDownloadId, function() {
                errorForPopup.addMessage(`Download wurde abgebrochen!`);
                pushErrorForPopupToStorage(errorForPopup);
            })

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