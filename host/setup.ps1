$ErrorActionPreference = "Stop"

Write-Host "`nInstallation: Hostanwendung der Chromium-Download-Policy Erweiterung"
Write-Host "--------------------------------------------------------------------`n"


# Pfade einlesen
Write-Host "JSON-Datei wird aus Vorlage eingelesen und verarbeitet ..."

$jsonTemplateFile = [System.IO.Path]::Combine($PSScriptRoot, "chromium-download-policy_template.json")
$jsonFile = [System.IO.Path]::Combine($PSScriptRoot, "chromium-download-policy.json")
$hostBatFile = [System.IO.Path]::Combine($PSScriptRoot, "chromium-download-policy.bat")

# Vorlage chromium-download-policy_template.json aktualisieren
$hostBatFile = $hostBatFile.Replace("\", "\\")
Write-Host " > $jsonFile"
try {
    ((Get-Content -path $jsonTemplateFile -Raw) -replace "SETUP_PATH","$hostBatFile") | Set-Content -Path $jsonFile
    Write-Host " > Erfolgreich angelegt! `n"
} Catch {
    Write-Host " > Fehler beim Anlegen der neuen JSON-Datei!`n"
}

# Registry-Eintrag für Host-Verbindung konfigurieren
Write-Host "Registry-Werte werden angelegt ..."
$registryPath = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts"
$registryKey = "com.github.kngp14.chromium.download.policy"
Write-Host " > $registryPath\$registryKey"
try {
    $result = New-Item -Path "$registryPath" -Name "$registryKey" -Value "$jsonFile" -Force
    Write-Host " > Erfolgeich angelegt!`n"
} Catch {
    Write-Host " > Fehler (ggf. keine Berechtigung)!`n"
}