
// Storage-Identifier für GPOs
const GPOLOGPATH_IDENTIFIER = "gpoLogPath";
const GPODOWNLOADPTH_IDENTIFIER = "gpoDownloadPath";

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
                    recievedMessage: message["text"],
                    trace : undefined,
                    file : undefined,
                    function : resultFunction
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
                        result.recievedMessage = resp.recievedMessage;
                        result.file = resp.file;

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
            "[Fehler] Kommunikationsproblem mit Hostanwendung",
            ["Meldungen konnten nicht in Log-Datei geschrieben werden!"]
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
    let message = {"text": getCurrentTimestamp() + " "};
    if (typeof msg == "object") {
        message["text"] += objectToString(msg);
    } else {
        message["text"] += msg;
    }

    // Bestimmte Zeichen verursachen Probleme bei Übergabe an das Powershell-Skript
    /*message["text"] = message["text"].replace(/´/g, "?");
    message["text"] = message["text"].replace(/`/g, "?");
    message["text"] = message["text"].replace(/§/g, "?");
    message["text"] = message["text"].replace(/²/g, "?");
    message["text"] = message["text"].replace(/³/g, "?");
    message["text"] = message["text"].replace(/°/g, "?");
    message["text"] = message["text"].replace(/ä/g, "ae");
    message["text"] = message["text"].replace(/ö/g, "oe");
    message["text"] = message["text"].replace(/ü/g, "ue");
    message["text"] = message["text"].replace(/Ä/g, "Ae");
    message["text"] = message["text"].replace(/Ö/g, "Oe");
    message["text"] = message["text"].replace(/Ü/g, "Ue");
    message["text"] = message["text"].replace(/ß/g, "ss");*/

    // Log-Pfad aus GPO auslesen
    chrome.storage.managed.get([GPOLOGPATH_IDENTIFIER], function (value) {
        let gpoLogPath = "undefined";
        if(!chrome.runtime.lastError) {
            if (value.gpoLogPath != "") {
                gpoLogPath = value[GPOLOGPATH_IDENTIFIER];
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

/**
 * Funktion zum Aufruf des Download-Scanskripts über Hostanwendung
 * @param {integer} currentDownloadId ID des abgeschlossenen und zu scannenden Downloads
 */
function runDownloadScanner(currentDownloadId) {

    // DownloadItem anhand ID ermitteln
    let searchQuery = {
        id: currentDownloadId,
        exists: true
    };
    chrome.downloads.search(searchQuery, (results)=>{
        for (let index = 0; index < results.length; index++) {

            // Dateinamen einlesen
            const downloadedItem = results[index];

            // Message mit Dateinamen des abgeschlossenen Downloads an Host-App für Scanner
            log("(" + downloadedItem.id + ") Scan des Downloads wurde gestartet");
            let message = {
                "text": "SCANFILE",
                "file": downloadedItem.filename
            }
            Queue.enqueue(() => logToHost(message, (status, result) => {
                if(status == "SUCCESS") {
                    console.log({
                        "info": "Datei wurde zum Scannen und Bereitstellen auf Asstauschlaufwerk übergeben an nachgelagertes Skript.",
                        "info_details": result
                    });
                } else {
                    console.log({
                        "error": "Datei konnte nicht zum Scannen an nachgelagertes Skript übergeben werden!",
                        "error_details": result.lastError
                    });
                }
            }));

            // Aus Downloadhistorie entfernen
            chrome.downloads.erase({ id: downloadedItem.id }, (erasedIds)=>{
                for (let idIndex = 0; idIndex < erasedIds.length; idIndex++) {
                    log("(" + erasedIds[idIndex] + ") Download aus Historie entfernt");
                }
            });
        }

    });
}

/**
 * Nur für Debugging auf Konsole:
 * Funktion zum Löschen des lokalen Storage
 */
function debugClearStorage() {
    chrome.storage.local.clear(() => { log("Kompletten Storage der Erweiterung gelöscht"); });

}

/**
 * Anderen Zielpfad für Download als in Registry hinterlegt verbieten
 * @param {int} currentDownloadId ID des Downloads
 * @param {string} currentDownloadPath Speicherort/Pfad des Downloads
 */
function blockForbiddenDownloadLocation(currentDownloadId, currentDownloadPath) {
    chrome.storage.managed.get([GPODOWNLOADPTH_IDENTIFIER], function (value) {

        let gpoDownloadPath = "undefined";
        if(!chrome.runtime.lastError) {
            if (value.gpoDownloadPath != "") {
                gpoDownloadPath = value[GPODOWNLOADPTH_IDENTIFIER];
            }
        }

        if (gpoDownloadPath != "undefined") {

            if (currentDownloadPath != "" && !currentDownloadPath.startsWith(gpoDownloadPath)) {
                // Downloadpfad nicht erlaubt
                
                let errorForPopup = new ErrorForPopup(
                    ErrorForPopup.TYPES.BLOCKEDDOWNLOAD,
                    getCurrentTimestamp(),
                    "[Fehler] Compliance-Verstoss",
                    ["Download der Datei '" + currentDownloadPath + "' erfolgte nicht nach: '" + gpoDownloadPath + "'"]
                );
                log("(" + currentDownloadId + ") " + errorForPopup.getTitle() + ": " + errorForPopup.getMessages()[0] + " Download wird abgebrochen ...");

                // Download abbrechen
                chrome.downloads.cancel(currentDownloadId, function() {
                    errorForPopup.addMessage("Download wurde abgebrochen!");
                    pushErrorForPopupToStorage(errorForPopup);
                })
            } else {
                // Downloadpfad erlaubt
                log("(" + currentDownloadId + ") Download entspricht Compliance-Vorgaben");
            }
            
        } else {

            // Kein Download-Pfad per GPO gesetzt
            let errorForPopup = new ErrorForPopup(
                ErrorForPopup.TYPES.MISSINGGPO,
                getCurrentTimestamp(),
                "[Fehler] Fehlende Gruppenrichtlinie",
                ["Downloadverzeichnis wurde nicht per Gruppenrichtlinie definiert.",
                 "Prüfung der Downloads kann nicht erfolgen."]
            );
            log("(" + currentDownloadId + ") " + errorForPopup.getTitle() + ": " + errorForPopup.getMessages()[0] + "\n" + errorForPopup.getMessages()[0] + "\nDownload wird abgebrochen ...");

            // Download abbrechen
            chrome.downloads.cancel(currentDownloadId, function() {
                errorForPopup.addMessage("Download wurde abgebrochen!");
                pushErrorForPopupToStorage(errorForPopup);
            })

        }
    });
}

/**
 * Setup-Funktion zum Registrieren aller Listener für onInstalled und onStartup-Event
 */
function setup() {

    // Registry-Werte einlesen/testen
    log("Policies werden eingelesen ...");
    chrome.storage.managed.get(function(policiesObject) {
        log("Eingelesene Policies: " + objectToString(policiesObject));
    });

    /**
     * Erkennung eines Dateidownloads
     * Hinweis: beinhaltet NICHT Kontextmenüfunktion "(Bild|Link|...) Speichern unter"
     */
    if(!chrome.downloads.onCreated.hasListeners()) {
        chrome.downloads.onCreated.addListener(function(item) {
    
            // Protokollierung
            log(
                "(" + item.id + ") Download wurde gestartet ...\n" +
                " - id:        " + item.id + " \n" +
                " - mime:      " + item.mime + " \n" +
                " - filename:  " + item.filename + " \n" +
                " - startTime: " + new Date(item.startTime).toISOString() + " \n" +
                " - finalUrl:  " + item.finalUrl
            );
    
            // Speicherort für Download prüfen und ggf. blockieren
            blockForbiddenDownloadLocation(item.id, item.filename);
            
        });
    }

    /**
     * Erkennung einer Statusänderung in Folge von Downloadbeginn, -abschluss oder -abbruch
     * Hinweis: beinhaltet auch Kontextmenüfunktion "Speichern unter" (nutzt nicht eingebaute Policy für Download-Pfad)
     */
    if(!chrome.downloads.onChanged.hasListeners()) {
        chrome.downloads.onChanged.addListener(function(changed) {

            if (changed.filename) {
                // Dateiname für Download wurde festgelegt (insbesondere bei Nutzung des Kontextmenüs "Speichern unter")

                // Protokollierung
                log(
                    "(" + changed.id + ") Dateiname wurde festgelegt ...\n" +
                    " - filename:  " + changed.filename.current
                );
                
                // Speicherort für Download prüfen und ggf. blockieren
                blockForbiddenDownloadLocation(changed.id, changed.filename.current);
                
            } else if (changed.state) {
              
                // Status eines Downloads hat sich verändert (Start, Abbruch, Abgeschlossen)

                if (changed.state.current == "interrupted") {

                    // Protokollierung
                    log(
                        "(" + changed.id + ") Download wurde abgebrochen ...\n" +
                        " - error:     " + changed.error.current
                    );

                } else if (changed.state.current == "complete") {
                    
                    // Protokollierung
                    log(
                        "(" + changed.id + ") Download wurde abgeschlossen ...\n" +
                        " - endTime:   " + new Date(changed.endTime.current).toISOString()
                    );
            
                    // Scan der Datei starten
                    runDownloadScanner(changed.id);
                  
                }
            }
        });
    }
}

// Installation der Listener bei Installation der Erweiterung
chrome.runtime.onInstalled.addListener(setup);

// Installation der Listener bei Start des Browsers
chrome.runtime.onStartup.addListener(setup);
