
/**
 * Installation der Listener
 */
chrome.runtime.onInstalled.addListener(function() {

    // Registry-Werte einlesen/testen
    console.log("Policies werden eingelesen ...");
    chrome.storage.managed.get(function(value) {
        console.log(value);
    });

    /**
     * Erkennung eines Dateidownloads
     * Hinweis: beinhaltet NICHT Kontextmenüfunktion "(Bild|Link|...) Speichern unter"
     */
    chrome.downloads.onCreated.addListener(function(item) {

        // Protokollierung auf Konsole
        // TODO: Protokollierung in Dateisystem o.ä.
        let now = new Date();
        console.log(
            `${now.toISOString()} (${item.id}) Download wurde gestartet ...\n` +
            ` - id:        ${item.id} \n` +
            ` - mime:      ${item.mime} \n` +
            ` - filename:  ${item.filename} \n` +
            ` - startTime: ${new Date(item.startTime).toISOString()} \n` +
            ` - finalUrl:  ${item.finalUrl} \n`
        );

        // Anderen Zielpfad für Download als in Registry hinterlegt verbieten
        // TODO: Popup.html für Information an Nutzer
        chrome.storage.managed.get(['gpoDownloadPath'], function (value) {
            downloadPath = value.gpoDownloadPath;
            if (item.filename != "" && !item.filename.startsWith(downloadPath)) {
                console.log(`Compliance-Verstoß: Download erfolgt nicht nach ${downloadPath} ! Download wird abgebrochen ...`);

                // Download abbrechen
                chrome.downloads.cancel(item.id, function() {
                    console.log("Download wurde abgebrochen.");
                })
            }
        });
        
    });

    /**
     * Erkennung einer Statusänderung in Folge von Downloadbeginn, -abschluss oder -abbruch
     * Hinweis: beinhaltet auch Kontextmenüfunktion "Speichern unter" (nutzt nicht eingebaute Policy für Download-Pfad)
     */
    chrome.downloads.onChanged.addListener(function(changed) {

        let now = new Date();

        if (changed.filename) {
            // Dateiname für Download wurde festgelegt (insbesondere bei Nutzung des Kontextmenüs "Speichern unter")

            // Protokollierung auf Konsole
            // TODO: Protokollierung in Dateisystem o.ä.
            console.log(
                `${now.toISOString()} (${changed.id}) Dateiname wurde festgelegt ...\n` +
                ` - filename:  ${changed.filename.current} \n`
            );
            
            // Download erfolgt über Kontextmenü
            chrome.storage.managed.get(['gpoDownloadPath'], function (value) {
                downloadPath = value.gpoDownloadPath;
                if (!changed.filename.current.startsWith(downloadPath)) {
                    console.log(`Compliance-Verstoß: Download erfolgt nicht nach ${downloadPath} ! Download wird abgebrochen ...`);

                    // Download abbrechen
                    chrome.downloads.cancel(changed.id, function() {
                        console.log("Download wurde abgebrochen");
                    });
                }
            });
            
        } else if (changed.state) {

            // Status eines Downloads hat sich verändert (Start, Abbruch, Abgeschlossen)

            if (changed.state.current == 'interrupted') {

                // Protokollierung auf Konsole
                // TODO: Protokollierung in Dateisystem o.ä.
                console.log(
                    `${now.toISOString()} (${changed.id}) Download wurde abgebrochen ...\n` +
                    ` - error:     ${changed.error.current} \n`
                );

            } else if (changed.state.current == 'complete') {
        
                // Protokollierung auf Konsole
                // TODO: Protokollierung in Dateisystem o.ä.
                console.log(
                    `${now.toISOString()} (${changed.id}) Download wurde abgeschlossen ...\n` +
                    ` - endTime:   ${new Date(changed.endTime.current).toISOString()} \n`
                );
            }
        }
    });



});

