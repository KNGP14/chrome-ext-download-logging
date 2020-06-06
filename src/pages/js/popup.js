
// Verlinkungen zu Erweiterungsoptionen
var aOptionsPage = document.getElementById("popup-link-options");
aOptionsPage.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

// App-Version aus Manifest einlesen
let divAppVer = document.getElementById('popup-app-version');
divAppVer.innerText = `Version: ${chrome.runtime.getManifest().version}`;