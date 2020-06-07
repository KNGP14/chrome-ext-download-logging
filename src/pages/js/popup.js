
// Verlinkungen zu Erweiterungsoptionen
var aOptionsPage = document.getElementById("popup-link-options");
aOptionsPage.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

// App-Version aus Manifest einlesen
let divAppVer = document.getElementById('popup-app-version');
divAppVer.innerText = `Version: ${chrome.runtime.getManifest().version}`;

// Meldungen anzeigen und Badge löschen
let divMessages = document.getElementById('popup-messages');
chrome.browserAction.getBadgeText({}, (badgeText) => {
    if (badgeText == "") {
        divMessages.innerText = `Derzeit liegen keine aktuellen Meldungen vor. ${badgeText}`;
    } else {

        // Kontext der backgound.js importieren
        let bg = chrome.extension.getBackgroundPage();

        // Auslesen aller Fehlermeldungen für Popup
        chrome.storage.sync.get([bg.ErrorForPopup.STORAGEIDENTIFIER], (currentStorage) => {
            let currentErrorList = currentStorage[bg.ErrorForPopup.STORAGEIDENTIFIER];

            if (currentErrorList == undefined) {
                // Keine Fehler ausgelesen trotz Badge --> Fehler
                divMessages.innerText = `Fehler beim Abrufen der aktuellen Meldungen!`;
            } else {
                // Fehler ausgelesen
                currentErrorList.forEach(error => {
                    if(error != null) {
                        let divMsgContainer = document.createElement('div');
                        divMsgContainer.setAttribute('class', 'popup-message');

                        let divMsgTitleContainer = document.createElement('div');
                        divMsgTitleContainer.setAttribute('class', 'popup-message-title-container');

                        let divMsgTitleIcon = document.createElement('div');
                        divMsgTitleIcon.innerText = `\u26A0`
                        divMsgTitleIcon.setAttribute('class', 'popup-message-title-icon');
                        divMsgTitleContainer.appendChild(divMsgTitleIcon);

                        let divMsgTitle = document.createElement('div');
                        divMsgTitle.innerText = `${error.title}`
                        divMsgTitle.setAttribute('class', 'popup-message-title');
                        divMsgTitleContainer.appendChild(divMsgTitle);
                        
                        divMsgContainer.appendChild(divMsgTitleContainer);

                        let divMsgTextContainer = document.createElement('div');
                        divMsgTextContainer.setAttribute('class', 'popup-message-text-container');

                        let divMsgTextIndent = document.createElement('div');
                        divMsgTextIndent.innerText = ``
                        divMsgTextIndent.setAttribute('class', 'popup-message-text-indent');
                        divMsgTextContainer.appendChild(divMsgTextIndent);
                
                        let divMsgText = document.createElement('div');
                        error.msgLines.forEach(line => {
                            if(divMsgText.innerText == "") {
                                divMsgText.innerText = `${line}`
                            } else {
                                divMsgText.innerText += `\n${line}`
                            }
                            divMsgText.setAttribute('class', 'popup-message-text');
                            divMsgTextContainer.appendChild(divMsgText);
                        });

                        divMsgContainer.appendChild(divMsgTextContainer);

                        divMessages.appendChild(divMsgContainer);
                    }
                });
            }

            // Fehlermeldungen löschen und Badge entfernen
            bg.deleteAllErrorsForPopup();
        });
    }
});