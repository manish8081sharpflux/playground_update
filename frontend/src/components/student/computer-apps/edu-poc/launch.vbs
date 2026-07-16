Set objShell = CreateObject("WScript.Shell")
Set objHTTP = CreateObject("MSXML2.XMLHTTP")
Set fso = CreateObject("Scripting.FileSystemObject")

If WScript.Arguments.Count = 0 Then
    MsgBox "No EduBridge URL received."
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
        pKey = Left(pairs(i), eqPos - 1)
        pVal = Mid(pairs(i), eqPos + 1)
        params(pKey) = URLDecode(pVal)
    End If
Next

activity = "algebra_plus"
sessionId = ""
token = ""
serverUrl = "http://localhost:5001"
startLevel = 1

If params.Exists("activity") Then activity = params("activity")
If params.Exists("sessionId") Then sessionId = params("sessionId")
If params.Exists("token") Then token = params("token")
If params.Exists("serverUrl") Then serverUrl = params("serverUrl")
If params.Exists("startLevel") And IsNumeric(params("startLevel")) Then startLevel = CInt(params("startLevel"))

On Error Resume Next
Set levelHTTP = CreateObject("MSXML2.XMLHTTP")
levelHTTP.open "GET", serverUrl & "/api/gcompris/lastlevel/" & activity, False
levelHTTP.setRequestHeader "Authorization", "Bearer " & token
levelHTTP.send

If Err.Number = 0 And levelHTTP.status = 200 Then
    levelResponse = Trim(levelHTTP.responseText)
    If IsNumeric(levelResponse) Then startLevel = CInt(levelResponse)
End If
On Error GoTo 0

If startLevel < 1 Then startLevel = 1
If startLevel > 6 Then startLevel = 6

gcomprisPath = "C:\Program Files\GCompris-Qt\bin\GCompris.exe"

If Not fso.FileExists(gcomprisPath) Then
    gcomprisPath = "C:\Program Files\GCompris-Qt\gcompris-qt.exe"
End If

If Not fso.FileExists(gcomprisPath) Then
    MsgBox "GCompris is not installed on this computer." & vbCrLf & vbCrLf & _
           "You have to download and install GCompris before you can open this activity.", _
           vbExclamation, "GCompris Required"
    WScript.Quit
End If

startTime = Now()

objShell.Run """" & gcomprisPath & """ --launch " & activity & " --start-level " & startLevel, 1, True

endTime = Now()
durationMs = DateDiff("s", startTime, endTime) * 1000

coins = 0
passed = "false"
score = 0

If durationMs >= 10000 Then
    passed = "true"
    score = 80
    coins = 5
End If

jsonBody = "{" & _
    """sessionId"":""" & sessionId & """," & _
    """activityName"":""" & activity & """," & _
    """durationMs"":" & durationMs & "," & _
    """score"":" & score & "," & _
    """level"":" & startLevel & "," & _
    """passed"":" & passed & "," & _
    """coinsAwarded"":" & coins & _
"}"

On Error Resume Next
objHTTP.open "POST", serverUrl & "/api/gcompris/result", False
objHTTP.setRequestHeader "Content-Type", "application/json"
objHTTP.setRequestHeader "Authorization", "Bearer " & token
objHTTP.send jsonBody
On Error GoTo 0
