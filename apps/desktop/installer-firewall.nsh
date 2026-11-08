; Installer script for Windows Firewall rule
; Adds inbound rule for TCP port 3210 on Private profile only
; Removed automatically on uninstall

!macro customInstall
  ; Add firewall rule for Private networks only (not Public)
  ; netsh requires admin, but we run as user - use PowerShell with hidden window
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "New-NetFirewallRule -DisplayName ''Termómetro de Equipo - LAN'' -Direction Inbound -Protocol TCP -LocalPort 3210 -Profile Private -Action Allow -ErrorAction SilentlyContinue"'
!macroend

!macro customUnInstall
  ; Remove firewall rule on uninstall
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Remove-NetFirewallRule -DisplayName ''Termómetro de Equipo - LAN'' -ErrorAction SilentlyContinue"'
!macroend
