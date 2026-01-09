!macro customInstall
  # Close the application if it's running during installation
  DetailPrint "Ensuring application is closed..."
  
  # Try multiple process name variations using nsExec
  nsExec::ExecToStack 'taskkill /fi "IMAGENAME eq Unique Academy App V6.1.exe" /t /f'
  Pop $0
  nsExec::ExecToStack 'taskkill /fi "IMAGENAME eq unique-academy-app.exe" /t /f'
  Pop $0
  
  # Wait for processes to terminate
  Sleep 1000
!macroend

!macro customUnInstall
  # Close the application if it's running before uninstalling
  DetailPrint "Closing application before uninstall..."
  
  # Try to gracefully close first
  nsExec::ExecToStack '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --quit'
  Pop $0
  Sleep 1000
  
  # Force kill if still running
  nsExec::ExecToStack 'taskkill /fi "IMAGENAME eq Unique Academy App V6.1.exe" /t /f'
  Pop $0
  nsExec::ExecToStack 'taskkill /fi "IMAGENAME eq unique-academy-app.exe" /t /f'
  Pop $0
  
  Sleep 1000
!macroend

!macro customInit
  # Kill any running instances before installation starts
  DetailPrint "Checking for running application instances..."
  
  # Use nsExec to run taskkill commands silently
  nsExec::ExecToStack 'taskkill /fi "IMAGENAME eq Unique Academy App V6.1.exe" /t /f'
  Pop $0
  nsExec::ExecToStack 'taskkill /fi "IMAGENAME eq unique-academy-app.exe" /t /f'
  Pop $0
  
  # Wait a bit for processes to terminate
  Sleep 1000
!macroend
