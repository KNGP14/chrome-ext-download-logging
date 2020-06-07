
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
        let bg = chrome.extension.getBackgroundPage();
        let errors = localStorage[bg.Error.LOCALSTORAGEIDENTIFIER]
        if (errors != undefined) {

            errors.forEach(error => {
                var divMsgTitle = document.createElement('div');
                divMsgTitle.innerText = `\u26A0 ${error.getTitle()}`
                divMsgTitle.setAttribute('class', 'popup-message-title');
                divMessages.appendChild(divMsgTitle);
        
                var divMsgText = document.createElement('div');
                error.getMessages.forEach(line => {
                    if(divMsgText.innerText == "") {
                        divMsgText.innerText = `${line}`
                    } else {
                        divMsgText.innerText += `\n${line}`
                    }
                    divMsgText.setAttribute('class', 'popup-message-text');
                    divMessages.appendChild(divMsgText);
                });
            });
        
            chrome.browserAction.setBadgeText({text: ""});
            localStorage["Errors"] = [];
        }
    }
});