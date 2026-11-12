Option Explicit

Dim shell, projectDir, command
Set shell = CreateObject("WScript.Shell")
projectDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
command = "cmd.exe /c cd /d """ & projectDir & """ && npm.cmd start"
shell.Run command, 0, False
