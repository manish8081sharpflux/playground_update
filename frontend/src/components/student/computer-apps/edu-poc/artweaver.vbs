Set objShell = CreateObject("WScript.Shell")
Set objHTTP = CreateObject("MSXML2.XMLHTTP")
Set fso = CreateObject("Scripting.FileSystemObject")

Function FindExecutable(executableNames, productName)
    Dim name, hive, value, roots, root, folder, file

    ' Prefer Windows' registered application paths. These support custom install folders.
    For Each hive In Array("HKCU", "HKLM")
        For Each name In executableNames
            On Error Resume Next
            value = objShell.RegRead(hive & "\Software\Microsoft\Windows\CurrentVersion\App Paths\" & name & "\")
            If Err.Number = 0 Then
                value = Replace(Trim(value), """", "")
                If fso.FileExists(value) Then
                    FindExecutable = value
                    On Error GoTo 0
                    Exit Function
                End If
            End If
            Err.Clear
            On Error GoTo 0
        Next
    Next

    ' Fall back to environment-provided application roots, not fixed drive paths.
    roots = Array(objShell.ExpandEnvironmentStrings("%ProgramFiles%"), _
                  objShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%"), _
                  objShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs"))
    For Each root In roots
        If root <> "" And InStr(root, "%") = 0 And fso.FolderExists(root) Then
            For Each folder In fso.GetFolder(root).SubFolders
                If InStr(1, folder.Name, productName, vbTextCompare) > 0 Then
                    file = FindInFolder(folder, executableNames, 4)
                    If file <> "" Then
                        FindExecutable = file
                        Exit Function
                    End If
                End If
            Next
        End If
    Next

    FindExecutable = ""
End Function

Function FindInFolder(folder, executableNames, depth)
    Dim name, candidate, child, result
    For Each name In executableNames
        candidate = fso.BuildPath(folder.Path, name)
        If fso.FileExists(candidate) Then
            FindInFolder = candidate
            Exit Function
        End If
    Next
    If depth > 0 Then
        On Error Resume Next
        For Each child In folder.SubFolders
            result = FindInFolder(child, executableNames, depth - 1)
            If result <> "" Then
                FindInFolder = result
                On Error GoTo 0
                Exit Function
            End If
        Next
        On Error GoTo 0
    End If
    FindInFolder = ""
End Function

If WScript.Arguments.Count = 0 Then
    MsgBox "Please click Open ArtWeaver from the Art Course.", vbInformation, "Art Course"
    WScript.Quit
End If

fullUrl = WScript.Arguments(0)
queryString = Mid(fullUrl, InStr(fullUrl, "?") + 1)

Function URLDecode(s)
    Dim i, c, result
    result = ""
    i = 1
    Do While i <= Len(s)
        c = Mid(s, i, 1)
        If c = "+" Then
            result = result & " "
        ElseIf c = "%" And i + 2 <= Len(s) Then
            result = result & Chr(CLng("&H" & Mid(s, i + 1, 2)))
            i = i + 2
        Else
            result = result & c
        End If
        i = i + 1
    Loop
    URLDecode = result
End Function

Set params = CreateObject("Scripting.Dictionary")
pairs = Split(queryString, "&")

For i = 0 To UBound(pairs)
    eqPos = InStr(pairs(i), "=")
    If eqPos > 0 Then
        params(Left(pairs(i), eqPos - 1)) = URLDecode(Mid(pairs(i), eqPos + 1))
    End If
Next

token = ""
studentId = ""
serverUrl = "http://localhost:5001"

If params.Exists("token") Then token = params("token")
If params.Exists("studentId") Then studentId = params("studentId")
If params.Exists("serverUrl") Then serverUrl = params("serverUrl")

If studentId = "" Then
    MsgBox "Student ID was not provided.", vbExclamation, "Art Course"
    WScript.Quit
End If

saveFolder = "C:\EduBridgeLauncher\Drawings"
If Not fso.FolderExists("C:\EduBridgeLauncher") Then fso.CreateFolder("C:\EduBridgeLauncher")
If Not fso.FolderExists(saveFolder) Then fso.CreateFolder(saveFolder)

For Each oldFile In fso.GetFolder(saveFolder).Files
    oldFile.Delete True
Next

artPath = FindExecutable(Array("Artweaver.exe"), "Artweaver")

If Not fso.FileExists(artPath) Then
    MsgBox "ArtWeaver is not installed on this computer." & vbCrLf & vbCrLf & _
           "You have to download and install ArtWeaver before you can use ArtWeaver Studio.", _
           vbExclamation, "ArtWeaver Required"
    WScript.Quit
End If

timestamp = Year(Now()) & Right("0" & Month(Now()), 2) & Right("0" & Day(Now()), 2) & "-" & _
            Right("0" & Hour(Now()), 2) & Right("0" & Minute(Now()), 2) & Right("0" & Second(Now()), 2)
starterFile = saveFolder & "\ArtWeaver-" & timestamp & ".jpg"

' Start ArtWeaver with an existing JPEG so normal Save/Ctrl+S keeps JPEG format.
powerShellCommand = "powershell.exe -NoProfile -WindowStyle Hidden -Command " & Chr(34) & _
    "Add-Type -AssemblyName System.Drawing; " & _
    "$bitmap = New-Object System.Drawing.Bitmap 1000,600; " & _
    "$graphics = [System.Drawing.Graphics]::FromImage($bitmap); " & _
    "$graphics.Clear([System.Drawing.Color]::White); " & _
    "$bitmap.Save('" & starterFile & "',[System.Drawing.Imaging.ImageFormat]::Jpeg); " & _
    "$graphics.Dispose(); $bitmap.Dispose()" & Chr(34)
objShell.Run powerShellCommand, 0, True

If Not fso.FileExists(starterFile) Then
    MsgBox "Could not prepare the JPEG drawing file. Please contact support.", vbCritical, "Art Course"
    WScript.Quit
End If

MsgBox "ArtWeaver will open now." & vbCrLf & vbCrLf & _
       "1. Draw your picture" & vbCrLf & _
       "2. Press Ctrl+S to save it" & vbCrLf & _
       "3. Close ArtWeaver to upload it for coach review" & vbCrLf & vbCrLf & _
       "The JPEG file is already prepared in: " & saveFolder & "\", _
       vbInformation, "Art Course"

startTime = Now()
Set oExec = objShell.Exec(Chr(34) & artPath & Chr(34) & " " & Chr(34) & starterFile & Chr(34))
Do While oExec.Status = 0
    WScript.Sleep 2000
Loop
durationMs = DateDiff("s", startTime, Now()) * 1000

Set foundFile = Nothing
For Each drawingFile In fso.GetFolder(saveFolder).Files
    ext = LCase(fso.GetExtensionName(drawingFile.Name))
    If (ext = "jpg" Or ext = "jpeg") And drawingFile.DateLastModified > startTime Then
        If foundFile Is Nothing Then
            Set foundFile = drawingFile
        ElseIf drawingFile.DateLastModified > foundFile.DateLastModified Then
            Set foundFile = drawingFile
        End If
    End If
Next

If foundFile Is Nothing Then
    MsgBox "The drawing was not uploaded because it was not saved. Open ArtWeaver again, draw, and press Ctrl+S before closing.", vbExclamation, "Art Course"
    WScript.Quit
End If

Set stream = CreateObject("ADODB.Stream")
stream.Type = 1
stream.Open
stream.LoadFromFile foundFile.Path
imageBytes = stream.Read
stream.Close

Set xmlDoc = CreateObject("MSXML2.DOMDocument")
Set xmlElem = xmlDoc.createElement("b64")
xmlElem.dataType = "bin.base64"
xmlElem.nodeTypedValue = imageBytes
base64String = xmlElem.text
base64String = Replace(base64String, vbCrLf, "")
base64String = Replace(base64String, vbLf, "")

mimeType = "image/jpeg"

imageData = "data:" & mimeType & ";base64," & base64String
safeTitle = Replace(fso.GetBaseName(foundFile.Name), """", "'")

jsonBody = "{" & _
    """imageData"":""" & imageData & """," & _
    """title"":""" & safeTitle & """," & _
    """description"":""Drawing created in ArtWeaver""," & _
    """sessionDuration"":" & durationMs & _
"}"

postUrl = serverUrl & "/api/v2/lms/student/" & studentId & "/courses/art/artweaver/submit"

On Error Resume Next
objHTTP.open "POST", postUrl, False
objHTTP.setRequestHeader "Content-Type", "application/json"
objHTTP.setRequestHeader "Authorization", "Bearer " & token
objHTTP.send jsonBody

If Err.Number <> 0 Then
    MsgBox "Upload failed: " & Err.Description, vbCritical, "Art Course"
ElseIf objHTTP.status = 200 Or objHTTP.status = 201 Then
    MsgBox "Your ArtWeaver drawing was saved to your gallery and submitted for coach review.", vbInformation, "Art Course"
Else
    MsgBox "Upload failed: " & objHTTP.status & vbCrLf & objHTTP.responseText, vbCritical, "Art Course"
End If
On Error GoTo 0
