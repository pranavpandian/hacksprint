!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to BridgeUX"
  !define MUI_WELCOMEPAGE_TEXT "Private accessibility tools, set up in one place.$\r$\n$\r$\nInstall BridgeUX, then let the guided setup add its local AI when you're ready."
  !insertmacro MUI_PAGE_WELCOME
!macroend
!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE "BridgeUX is ready"
  !define MUI_FINISHPAGE_TEXT "Your workspace is installed. The first launch will guide you through accessibility preferences and local AI setup."
  !define MUI_FINISHPAGE_RUN "$INSTDIR\BridgeUX.exe"
  !insertmacro MUI_PAGE_FINISH
!macroend
