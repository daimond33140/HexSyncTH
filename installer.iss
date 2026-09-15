; Inno Setup Script for HexSyncTH v9.1.2
; Auto-Installer for Commercial Distribution

#define MyAppName "HexSyncTH"
#define MyAppVersion "9.1.2"
#define MyAppPublisher "HexSyncTH"
#define MyAppURL "https://hexsyncth.site"
#define MyAppExeName "HexSyncTH_Control.exe"

[Setup]
AppId={{D37E6F89-4A1C-4B6A-9F02-98C3F5E7B1A2}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=HexSyncTH_Setup_v9.1.2
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
OutputDir=d:\wee\setup_output

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "d:\wee\HexSyncTH_Control.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\wee\serve_dist.cjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\wee\start_tunnel.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\wee\bin\*"; DestDir: "{app}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "d:\wee\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "d:\wee\server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "server\node_modules\.cache\*,server\*.bak"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName} Control Panel"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
