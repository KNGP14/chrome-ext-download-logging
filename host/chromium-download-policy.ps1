$ErrorActionPreference = "SilentlyContinue"

# Funktion zum Senden von JSON an Erweiterung
# https://docs.jabref.org/collect/jabref-browser-extension
function Respond($response) {
    $jsonResponse = $response | ConvertTo-Json

    try {
        $writer = New-Object System.IO.BinaryWriter([System.Console]::OpenStandardOutput())
        $writer.Write([int]$jsonResponse.Length)
        $writer.Write([System.Text.Encoding]::UTF8.GetBytes($jsonResponse))
        $writer.Close()
    } finally {
        $writer.Dispose()
    }
}

# Funktion zum Zurückwandeln von ß in $SZReplacement
function getReplacedSZ($inputString) {
    return $inputString.Replace("ß", "sz")
}

try {

    # Rückgabe
    $resultStatus = "ERROR"
    $resultError = "Unerwarteter Fehler beim Schreiben der Logdatei!"
    $file = "undefined"

    # StdIn von Erweiterung lesen
    $reader = New-Object System.IO.BinaryReader([System.Console]::OpenStandardInput())
    $length = $reader.ReadInt32()
    $messageRaw = [System.Text.Encoding]::UTF8.GetString($reader.ReadBytes($length))
    $message = $messageRaw | ConvertFrom-Json

    # Umbrüche für Add-Content vorbereiten
    $recievedMessage = $message.text.Replace("\n", "`r")

    if ($recievedMessage -eq "SCANFILE") {

        # Dateinamen einlesen
        $file = $message.file

        if (Test-Path $file) {
            # TODO: Vollqualifizierten Dateipfad an Scan-Skript übergeben
            # scan.ps1 "$filePath"

            $resultStatus = "SUCCESS"
            $resultError = ""
        } else {
            $resultStatus = "ERROR_SCANNING_FILE"
            $resultError = "File not found"
        }

    } else {

        # Logpfad aus Message auslesen oder Script-Root verwenden
        $messageLogPath = $message.logpath
        if (!($messageLogPath) -or ($messageLogPath -eq "undefined") -or ($messageLogPath -eq "")) {
            $messageLogPath = "$PSScriptRoot\logs"
        }
    
        # Message in Logdatei pro User schreiben
        $user = $env:UserName
        $file = [System.IO.Path]::Combine($messageLogPath, $user + "_download.log")
        if (!(Test-Path $file)) {

            # Add-Content legt Ordner-Struktur nicht an --> mit New-Item anlegen
            New-Item -Path $file -Force | Out-Null
            if($error) {
                $resultStatus = "ERROR_CREATING_LOGFILE"
                $resultError = $error
            } else {
                $resultStatus = "SUCCESS"
                $resultError = ""
            }

        }
    
        # Sofern nur Verbindungstest keine neuen Inhalte in Datei schreiben
        if($recievedMessage -like "*TEST_HOST_COMMUNICATION*") {
            
            # Datei im Schreibmodus öffnen (keine Inhalte schreiben)
            try {
                [io.file]::OpenWrite($file).close()
                $resultStatus = "SUCCESS"
                $resultError = ""
            } catch {
                $resultStatus = "ERROR_WRITING_TO_LOGFILE"
                $resultError = "No write access for file $file"
            }
    
        } else {
    
            # Ereignis in Protokolldatei schreiben (anhängen)
            Add-Content $file "$recievedMessage" | Out-Null
            if($error) {
                $resultStatus = "ERROR_WRITING_TO_LOGFILE"
                $resultError = $error
            } else {
                $resultStatus = "SUCCESS"
                $resultError = ""
            }
    
        }
    }

    # Rückmeldung an Erweiterung senden
    # ß verursacht Absturz -> für Versand umgewandelt
    return Respond @{
        status = getReplacedSZ($resultStatus);
        lastError = getReplacedSZ($resultError);
        recievedMessage = getReplacedSZ($recievedMessage)
        file = getReplacedSZ($file)
    }

} finally {

    $reader.Dispose()

}