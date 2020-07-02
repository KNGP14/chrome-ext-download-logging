
// App-Name aus Manifest einlesen
let divAppTitle = document.getElementById('options-header-title');
divAppTitle.innerText = `${chrome.runtime.getManifest().name}`;

// Download- und Protokoll-Pfad aus Registry auslesen
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

// Host-Kommunikation testen
let hostStatus = document.getElementById('hostStatus');
hostStatus.value = `⚫ WIRD GELADEN`;
let currentLogFile = document.getElementById('currentLogFile');
let bg = chrome.extension.getBackgroundPage();
bg.log("TEST_HOST_COMMUNICATION", (status, result) => {
    if (status == "SUCCESS") {
        hostStatus.value = `🟢 VERBUNDEN`;
    } else {
        hostStatus.value = `🔴 FEHLER (SIEHE KONSOLENAUSGABE)`;
    }
    currentLogFile.value = `${result.logFile}`;
});

// Regsitry-Pfad für Gruppenrichtlinie zusammensetzen
let regPath = document.getElementById('regPath');
let browserPath = `Google\\Chrome`;
if(window.navigator.userAgent.toLowerCase().indexOf("edg") > -1){
    browserPath = `Microsoft\\Edge`;
}
regPath.innerText = `HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\${browserPath}\\3rdparty\\extensions\\${chrome.runtime.id}\\policy`;


// Registry-Einträge ausgeben
let regValueList = document.getElementById('regValues');
chrome.storage.managed.get(null, function(items) {
    let regValues = Object.keys(items);
    regValues.forEach(element => {
        let regValue = document.createElement("li");
        regValue.innerHTML = `<code>${element}</code>`;
        regValueList.appendChild(regValue);
    });
});

// App-Details abrufen
let appDetails = document.getElementById('appDetails');
let version = document.createElement("li");
version.innerHTML = `<div>Version: ${chrome.runtime.getManifest().version}</div>`;
appDetails.appendChild(version);
let developer = document.createElement("li");
developer.innerHTML = `<div>Entwickler: ${chrome.runtime.getManifest().author}</div>`;
appDetails.appendChild(developer);
let repository = document.createElement("li");
repository.innerHTML = `<div>Quellcode: <a href="https://github.com/KNGP14/chromium-download-policy">https://github.com/KNGP14/chromium-download-policy</a></div>`;
appDetails.appendChild(repository);