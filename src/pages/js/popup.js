
// Verlinkungen zu Erweiterungsoptionen
var aOptionsPage = document.getElementById("popup-link-options");
aOptionsPage.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

// App-Version aus Manifest einlesen
let divAppVer = document.getElementById('popup-app-version');
divAppVer.innerText = `Version: ${chrome.runtime.getManifest().version}`;

// App-Name aus Manifest einlesen
let divAppTitle = document.getElementById('popup-app-header-title');
divAppTitle.innerText = `${chrome.runtime.getManifest().name}`;

// Download- und Protokoll-Pfad aus Registry auslesen
let downloadPath = document.getElementById('downloadPath');
chrome.storage.managed.get(['gpoDownloadPath'], function (value) {
    downloadPath.value = value.gpoDownloadPath;
});

// Meldungen anzeigen und Badge löschen
let divMessages = document.getElementById('popup-messages');
chrome.browserAction.getBadgeText({}, (badgeText) => {

    if (badgeText == "") {

        divMessages.innerText = `Derzeit liegen keine aktuellen Meldungen vor. ${badgeText}`;

    } else {

        // Kontext der backgound.js importieren
        let bg = chrome.extension.getBackgroundPage();

        // Auslesen aller Fehlermeldungen für Popup
        chrome.storage.local.get([bg.ErrorForPopup.STORAGEIDENTIFIER], (currentStorage) => {
            let currentErrorList = currentStorage[bg.ErrorForPopup.STORAGEIDENTIFIER];

            if (currentErrorList == undefined) {

                // Keine Fehler ausgelesen trotz Badge --> Fehler
                divMessages.innerText = `Fehler beim Abrufen der aktuellen Meldungen!`;

            } else {

                // Templates aus popup.html importieren
                let htmlTemplates = document.getElementById("templates").children;
                for (let htmlTemplate of htmlTemplates) {
                    if(htmlTemplate.className.startsWith("popup-message")) {

                        // Fehler ausgelesen
                        currentErrorList.forEach(error => {
                            if(error != null) {
        
                                // Template für Popup-Message clonen
                                let divPopupMessage = htmlTemplate.cloneNode(true);
        
                                // Icon und Titel der 
                                divPopupMessage.getElementsByClassName("popup-message-title-icon")[0].innerText = `\u26A0`;
                                divPopupMessage.getElementsByClassName("popup-message-title")[0].innerText = `${error.timestamp} ${error.title}`;
        
                                error.msgLines.forEach(line => {
                                    if(divPopupMessage.getElementsByClassName("popup-message-text")[0].innerText == "") {
                                        divPopupMessage.getElementsByClassName("popup-message-text")[0].innerText = `${line}`
                                    } else {
                                        divPopupMessage.getElementsByClassName("popup-message-text")[0].innerText += `\n${line}`
                                    }
                                });
        
                                // Fehlermeldung in DOM einfügen
                                divMessages.appendChild(divPopupMessage);
        
                            }
                        });

                        break;
                    }
                }

            }

            // Fehlermeldungen löschen und Badge entfernen
            bg.deleteAllErrorsForPopup();
        });
    }
});