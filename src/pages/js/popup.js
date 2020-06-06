
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

        var msgTitle = document.createElement('div');
        msgTitle.innerText = `\u26A0 ${bg.sharedData.lastError.title}`
        msgTitle.setAttribute('class', 'popup-message-title');
        divMessages.appendChild(msgTitle);

        var msgText = document.createElement('div');
        msgText.innerText = `${bg.sharedData.lastError.msg}`
        msgText.setAttribute('class', 'popup-message-text');
        divMessages.appendChild(msgText);

        chrome.browserAction.setBadgeText({text: ""});
        bg.sharedData.lastError.title = "";
        bg.sharedData.lastError.msg = "";
    }
});