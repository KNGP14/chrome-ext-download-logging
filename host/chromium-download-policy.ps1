
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

try {

    # StdIn von Erweiterung lesen
    $reader = New-Object System.IO.BinaryReader([System.Console]::OpenStandardInput())
    $length = $reader.ReadInt32()
    $messageRaw = [System.Text.Encoding]::UTF8.GetString($reader.ReadBytes($length))
    $message = $messageRaw | ConvertFrom-Json

    # Umbrüche für Add-Content vorbereiten
    $messageText = $message.text.Replace("\n", "`r")

    # Message in Logdatei schreiben
    $logFile = [System.IO.Path]::Combine($PSScriptRoot, "log.txt")
    Add-Content $logFile "$messageText"

    # Rückmeldung an Erweiterung senden
    return Respond @{message="ok";output="$messageText"}

} finally {

    $reader.Dispose()

}