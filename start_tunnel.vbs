Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

cloudflaredPath = scriptDir & "\bin\cloudflared.exe"
If Not fso.FileExists(cloudflaredPath) Then
    cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
End If

token = "eyJhIjoiMzk2MmRhMTY4YjAwZmZhNDM3ZjY1NjkyNTY3ODU0MDYiLCJ0IjoiYTM4YTE4NzUtZmUzZS00Mjc2LTlmZWYtMTRkMzVhMmIyMmE2IiwicyI6Ik9UQXlZbVl6WVRNdE5EQTFNQzAwTWpnd0xUZzVORFV0TmpFNU5URTBObVl5TW1WaiJ9"

WshShell.Run chr(34) & cloudflaredPath & chr(34) & " tunnel run --token " & token, 0
Set WshShell = Nothing
Set fso = Nothing
