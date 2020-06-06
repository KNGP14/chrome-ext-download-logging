/**
 * Download- und Protokoll-Pfad aus Registry auslesen
 */
let downloadPath = document.getElementById('downloadPath');
chrome.storage.managed.get(['gpoDownloadPath'], function (value) {
    downloadPath.value = value.gpoDownloadPath;
});
let logPath = document.getElementById('logPath');
chrome.storage.managed.get(['gpoLogPath'], function (value) {
    logPath.value = value.gpoLogPath;
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