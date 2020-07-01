/**
 * Download- und Protokoll-Pfad aus Registry auslesen
 */
let downloadPath = document.getElementById('downloadPath');
chrome.storage.managed.get(['gpoDownloadPath'], function (value) {
    let gpoDownloadPath = "undefined";
    if(!chrome.runtime.lastError) {
        if (value.gpoDownloadPath != "") {
            gpoDownloadPath = value.gpoDownloadPath;
        }
    }
    downloadPath.value = gpoDownloadPath;
});
let logPath = document.getElementById('logPath');
chrome.storage.managed.get(['gpoLogPath'], function (value) {
    let gpoLogPath = "undefined";
    if(!chrome.runtime.lastError) {
        if (value.gpoLogPath != "") {
            gpoLogPath = value.gpoLogPath;
        }
    }
    logPath.value = gpoLogPath;
});

/**
 * Regsitry-Pfad für Gruppenrichtlinie zusammensetzen
 */
let regPath = document.getElementById('regPath');
regPath.innerText = `HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Edge\\3rdparty\\extensions\\${chrome.runtime.id}\\policy`;


/**
 * Registry-Einträge ausgeben
 */
let regValueList = document.getElementById('regValues');
chrome.storage.managed.get(null, function(items) {
    let regValues = Object.keys(items);
    regValues.forEach(element => {
        let regValue = document.createElement("li");
        let textnode = document.createTextNode(element);
        regValue.appendChild(textnode);
        regValueList.appendChild(regValue);
    });
});

/**
 * Host-Kommunikation testen
 */
let hostStatus = document.getElementById('hostStatus');
let bg = chrome.extension.getBackgroundPage();
bg.log("Verbindungstest zur Hostanwendung", (status, result) => {
    hostStatus.value = `${status}`;
});