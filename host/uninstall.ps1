$ErrorActionPreference = "Stop"

Write-Host "`nDeinstallation: Hostanwendung der Chromium-Download-Policy Erweiterung"
Write-Host "----------------------------------------------------------------------`n"

# Registry-Einträge werden gelöscht
Write-Host "Registry-Werte werden entfernt ..."

$registryPath = "Software\Microsoft\Edge\NativeMessagingHosts"
$registryKey = "com.github.kngp14.chromium.download.policy"

Write-Host " > HKCU:\$registryPath\$registryKey"
try {
    Remove-Item -Path "HKCU:\$registryPath\$registryKey" -Recurse
    Write-Host " > Erfolgreich entfernt! `n"
} Catch {
    Write-Host " > Fehler: Eintrag konnte nicht entfernt werden (ggf. bereits entfernt)! `n"
}

# Installation unter KHLM derzeit noch nicht durchgeführt
#Write-Host " > HKLM:\$registryPath\$registryKey"
#$result = (Get-ItemProperty "HKLM:\$registryPath\$registryKey").test -eq $null 
#If ($result -eq $False) {
#    Remove-ItemProperty -path HKLM:\SOFTWARE\Testkey -name test
#    Write-Host " > Erfolgreich!"
#} Else {
#    Write-Host " > Fehler: Eintrag wurde nicht gefunden!"
#}