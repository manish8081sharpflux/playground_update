# EduPOC — Educational Software POC

A full-stack educational platform built with **MongoDB + Node.js + React.js**.  
Students read lessons, take quizzes, and their time + progress is tracked automatically.

\---

## Tech Stack

|Layer|Technology|
|-|-|
|Frontend|React 18, React Router 6, Recharts, Axios|
|Backend|Node.js, Express 4, JWT Auth, bcryptjs|
|Database|MongoDB (Mongoose ODM)|

\---

## Features

### Student

* Email/password login with JWT sessions
* Browse published courses
* Read lesson material (rich HTML content)
* **Automatic time tracking** — session starts when a lesson opens, ends when they navigate away (uses `fetch keepalive` for page-close reliability)
* Live timer badge shown while reading
* Mark lessons as complete
* Take quiz with multiple-choice questions and instant scoring
* Review correct/wrong answers with explanations after quiz
* Dashboard with: course progress bars, total time chart, login history

### Admin

* Overview stats: total students, sessions, avg. completion
* Per-student table: completion %, time spent, last login
* Expand any student to see per-course progress + recent sessions
* Search students by name or email

\---

## Project Structure

```
edu-poc/
├── server/
│   ├── config/db.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js           # name, email, password (hashed), role, loginHistory
│   │   ├── Course.js         # title, lessons\[], quiz (questions, passMark)
│   │   ├── Progress.js       # completedLessons\[], completionPct, quizAttempts\[]
│   │   └── Session.js        # userId, lessonId, startTime, endTime, durationMs
│   ├── routes/
│   │   ├── auth.js           # POST /register, POST /login, GET /me
│   │   ├── courses.js        # GET /courses, GET /courses/:id
│   │   ├── progress.js       # GET/POST progress, POST quiz submission
│   │   ├── sessions.js       # POST start, PATCH end, GET summary
│   │   └── admin.js          # GET students, GET student/:id, GET overview
│   ├── middleware/auth.js     # protect (JWT), adminOnly
│   ├── seed.js               # Demo data: 2 courses, 1 admin, 3 students
│   └── server.js
└── client/src/
    ├── context/AuthContext.jsx  # Global user state + login/logout
    ├── hooks/useTimer.js        # Auto session start/end on lesson mount
    ├── api/axios.js             # Axios instance with JWT interceptor
    ├── pages/
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── Dashboard.jsx        # Stats, time chart, login history, course cards
    │   ├── CoursePage.jsx       # Lesson list + progress bar + quiz entry
    │   ├── LessonPage.jsx       # Reading content + live timer + mark complete
    │   ├── QuizPage.jsx         # Quiz taking + result + answer review
    │   └── AdminPage.jsx        # Student analytics table + charts
    └── styles.css
```

\---

## Setup \& Run

### Prerequisites

* Node.js 18+
* MongoDB running locally **or** a MongoDB Atlas connection string

### 1 — Clone and install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2 — Configure environment

```bash
cd server
cp .env.example .env
# Edit .env and set your MONGO\_URI and a strong JWT\_SECRET
```

`.env` example:

```
PORT=5000
MONGO\_URI=mongodb://localhost:27017/edu\_poc
JWT\_SECRET=change\_this\_to\_a\_long\_random\_string
JWT\_EXPIRES\_IN=7d
```

### 3 — Seed demo data

```bash
cd server
node seed.js
```

This creates:

* **Admin:** `admin@edu.com` / `admin123`
* **Students:** `ravi@student.com`, `priya@student.com`, `amit@student.com` (all `student123`)
* **2 published courses** with lessons, quizzes, and explanations

### 4 — Run the app

Open **two terminals**:

```bash
# Terminal 1 — backend (port 5000)
cd server
npm run dev

# Terminal 2 — frontend (port 3000)
cd client
npm start
```

Visit: **http://localhost:3000**

\---

## API Reference

### Auth

|Method|Route|Description|
|-|-|-|
|POST|`/api/auth/register`|Create student account|
|POST|`/api/auth/login`|Login → returns JWT|
|GET|`/api/auth/me`|Get current user|

### Courses

|Method|Route|Description|
|-|-|-|
|GET|`/api/courses`|List published courses|
|GET|`/api/courses/:id`|Full course with lessons + quiz|
|POST|`/api/courses`|Create course (admin)|

### Progress

|Method|Route|Description|
|-|-|-|
|GET|`/api/progress/:courseId`|Student's progress|
|POST|`/api/progress/:courseId/lesson/:lessonId`|Mark lesson complete|
|POST|`/api/progress/:courseId/quiz`|Submit quiz, get score|

### Sessions (Time Tracking)

|Method|Route|Description|
|-|-|-|
|POST|`/api/sessions/start`|Start timer for a lesson|
|PATCH|`/api/sessions/:id/end`|Stop timer, save duration|
|GET|`/api/sessions/summary`|Total minutes per course|

### Admin

|Method|Route|Description|
|-|-|-|
|GET|`/api/admin/overview`|Platform-wide stats|
|GET|`/api/admin/students`|All students + summaries|
|GET|`/api/admin/students/:id`|Full detail for one student|

\---

## How Time Tracking Works

1. Student opens a lesson → `useTimer` hook fires `POST /api/sessions/start`
2. A `Session` document is created with `startTime = now`
3. While reading, a display timer counts up in the UI (client-side only)
4. When the student navigates away / closes tab → cleanup runs `fetch(..., { keepalive: true })` to call `PATCH /api/sessions/:id/end`
5. Backend computes `durationMs = endTime - startTime` and stores it
6. The `/api/sessions/summary` aggregation sums all `durationMs` grouped by course

\---

## Extending the POC

* **Add video lessons** — add a `videoUrl` field to the lesson schema; use an `<iframe>` or `<video>` tag in `LessonPage`
* **Email notifications** — integrate Nodemailer for weekly progress emails
* **Course enrolment** — add an `Enrolment` model so students must explicitly join a course
* **Certificate generation** — generate a PDF certificate when `completionPct` reaches 100%
* **Rich text editor** — replace plain HTML content with a TipTap or Quill editor in the admin panel


setup\_edulauncher.bat/////////





@echo off

echo ==========================================

echo   EduLauncher Auto Setup Script

echo ==========================================



REM Step 1: Create project folder

set PROJECT\_DIR=%USERPROFILE%\\EduBridgeLauncher

mkdir "%PROJECT\_DIR%" 2>nul



echo Project folder created at %PROJECT\_DIR%



REM Step 2: Create Python file

echo Creating edulauncher.py...



(

echo import sys

echo import subprocess

echo import json

echo import time

echo from pathlib import Path

echo from urllib.parse import urlparse, parse\_qs

echo from datetime import datetime

echo import requests

echo.

echo TOKEN\_FILE = Path.home() / ".edu\_bridge\_token"

echo.

echo def load\_token():

echo     if not TOKEN\_FILE.exists():

echo         print("Token not found")

echo         return None

echo     return json.loads(TOKEN\_FILE.read\_text())

echo.

echo def find\_gcompris():

echo     paths = \[

echo         r"C:\\Program Files\\GCompris-Qt\\gcompris-qt.exe",

echo         r"C:\\Program Files (x86)\\GCompris-Qt\\gcompris-qt.exe"

echo     ]

echo     for p in paths:

echo         if Path(p).exists():

echo             return p

echo     return None

echo.

echo def main():

echo     if len(sys.argv) ^< 2:

echo         print("No URL provided")

echo         return

echo.

echo     raw\_url = sys.argv\[1]

echo     parsed = urlparse(raw\_url)

echo     params = parse\_qs(parsed.query)

echo.

echo     activity = params.get("activity", \[""])\[0]

echo     sessionId = params.get("sessionId", \[""])\[0]

echo.

echo     config = load\_token()

echo     if not config:

echo         return

echo.

echo     gcompris = find\_gcompris()

echo     if not gcompris:

echo         print("GCompris not found")

echo         return

echo.

echo     start\_time = time.time()

echo.

echo     process = subprocess.Popen(\[gcompris, "--activity", activity])

echo     process.wait()

echo.

echo     end\_time = time.time()

echo.

echo     payload = \[{

echo         "activityName": activity,

echo         "level": 1,

echo         "startTime": datetime.fromtimestamp(start\_time).isoformat(),

echo         "endTime": datetime.fromtimestamp(end\_time).isoformat(),

echo         "durationMs": int((end\_time - start\_time) \* 1000),

echo         "score": 80,

echo         "sessionId": sessionId

echo     }]

echo.

echo     try:

echo         requests.post(

echo             f"{config\['serverUrl']}/api/gcompris/sync",

echo             json=payload,

echo             headers={"Authorization": f"Bearer {config\['token']}"}

echo         )

echo     except Exception as e:

echo         print(e)

echo.

echo if \_\_name\_\_ == "\_\_main\_\_":

echo     main()

) > "%PROJECT\_DIR%\\edulauncher.py"



echo Python file created



REM Step 3: Install dependencies

echo Installing Python dependencies...

pip install requests pyinstaller



REM Step 4: Build EXE

echo Building EXE...

cd /d "%PROJECT\_DIR%"

pyinstaller --onefile --noconsole --name EduLauncher edulauncher.py



REM Step 5: Copy EXE

mkdir "C:\\EduBridge" 2>nul

copy /Y "%PROJECT\_DIR%\\dist\\EduLauncher.exe" "C:\\EduBridge\\EduLauncher.exe"



REM Step 6: Create protocol script

(

echo @echo off

echo SET EXE=C:\\EduBridge\\EduLauncher.exe

echo REG ADD "HKCR\\edubridge" /ve /d "URL:EduBridge Protocol" /f

echo REG ADD "HKCR\\edubridge" /v "URL Protocol" /d "" /f

echo REG ADD "HKCR\\edubridge\\shell\\open\\command" /ve /d "\\"%%EXE%%\\" \\"%%%%1\\"" /f

echo echo Protocol registered

echo pause

) > "%PROJECT\_DIR%\\register\_protocol.bat"



echo ==========================================

echo   SETUP COMPLETED

echo ==========================================

echo.

echo Next Steps:

echo 1. Run register\_protocol.bat as Administrator

echo 2. Install GCompris

echo 3. Test: edubridge://open?activity=algebra\_by

echo.



pause





C:\\EduBridgeLauncher\\launch.vbs









Set objShell = CreateObject("WScript.Shell")

Set objHTTP  = CreateObject("MSXML2.XMLHTTP")



' ── Get the full URL passed in: edubridge://open?activity=algebra\_by\&sessionId=xxx\&... ──

Dim fullUrl

fullUrl = WScript.Arguments(0)



' Strip the "edubridge://open?" prefix

Dim queryString

queryString = Mid(fullUrl, InStr(fullUrl, "?") + 1)



' ── URL Decode function ──────────────────────────────────────────────────────

Function URLDecode(s)

&#x20;   Dim i, c, result

&#x20;   result = ""

&#x20;   i = 1

&#x20;   Do While i <= Len(s)

&#x20;       c = Mid(s, i, 1)

&#x20;       If c = "+" Then

&#x20;           result = result \& " "

&#x20;       ElseIf c = "%" And i + 2 <= Len(s) Then

&#x20;           result = result \& Chr(CLng("\&H" \& Mid(s, i+1, 2)))

&#x20;           i = i + 2

&#x20;       Else

&#x20;           result = result \& c

&#x20;       End If

&#x20;       i = i + 1

&#x20;   Loop

&#x20;   URLDecode = result

End Function



' ── Parse parameters into a dictionary ──────────────────────────────────────

Dim params

Set params = CreateObject("Scripting.Dictionary")

Dim pairs, pair, i

pairs = Split(queryString, "\&")

For i = 0 To UBound(pairs)

&#x20;   Dim eqPos

&#x20;   eqPos = InStr(pairs(i), "=")

&#x20;   If eqPos > 0 Then

&#x20;       Dim pKey, pVal

&#x20;       pKey = Left(pairs(i), eqPos - 1)

&#x20;       pVal = Mid(pairs(i), eqPos + 1)

&#x20;       params(pKey) = URLDecode(pVal)

&#x20;   End If

Next



Dim activity  : activity  = params("activity")

Dim sessionId : sessionId = params("sessionId")

Dim token     : token     = params("token")

Dim serverUrl : serverUrl = params("serverUrl")



' ── Get last level student reached for this activity ─────────────────────────

Dim lastLevel

lastLevel = 1



On Error Resume Next

Dim getLevelHTTP

Set getLevelHTTP = CreateObject("MSXML2.XMLHTTP")

getLevelHTTP.open "GET", serverUrl \& "/api/gcompris/lastlevel/" \& activity, False

getLevelHTTP.setRequestHeader "Authorization", "Bearer " \& token

getLevelHTTP.send



If Err.Number = 0 And getLevelHTTP.status = 200 Then

&#x20;   Dim lvlResponse

&#x20;   lvlResponse = Trim(getLevelHTTP.responseText)

&#x20;   If IsNumeric(lvlResponse) Then

&#x20;       lastLevel = CInt(lvlResponse)

&#x20;   End If

End If

On Error GoTo 0



' ── Launch GCompris with the specific activity at student's last level ────────

Dim gcomprisPath

gcomprisPath = "C:\\Program Files\\GCompris-Qt\\bin\\GCompris.exe"



Dim startTime

startTime = Now()



' Run GCompris and WAIT for it to close (last param = True)

objShell.Run """" \& gcomprisPath \& """ --launch " \& activity \& " --start-level " \& lastLevel, 1, True



' ── GCompris has closed — calculate duration ─────────────────────────────────

Dim endTime, durationMs

endTime    = Now()

durationMs = DateDiff("s", startTime, endTime) \* 1000



' ── Award coins + calculate new level based on time played ───────────────────

Dim coins, passed, score, newLevel



If durationMs < 10000 Then

&#x20;   ' Less than 10 seconds — accidental open, no reward

&#x20;   coins    = 0

&#x20;   passed   = "false"

&#x20;   score    = 0

&#x20;   newLevel = lastLevel



ElseIf durationMs < 60000 Then

&#x20;   ' 10 seconds – 1 minute

&#x20;   coins    = 2

&#x20;   passed   = "true"

&#x20;   score    = 40

&#x20;   newLevel = lastLevel



ElseIf durationMs < 180000 Then

&#x20;   ' 1 – 3 minutes

&#x20;   coins    = 5

&#x20;   passed   = "true"

&#x20;   score    = 60

&#x20;   newLevel = lastLevel



ElseIf durationMs < 300000 Then

&#x20;   ' 3 – 5 minutes

&#x20;   coins    = 8

&#x20;   passed   = "true"

&#x20;   score    = 70

&#x20;   newLevel = lastLevel + 1



ElseIf durationMs < 600000 Then

&#x20;   ' 5 – 10 minutes

&#x20;   coins    = 12

&#x20;   passed   = "true"

&#x20;   score    = 80

&#x20;   newLevel = lastLevel + 1



Else

&#x20;   ' 10+ minutes

&#x20;   coins    = 15

&#x20;   passed   = "true"

&#x20;   score    = 90

&#x20;   newLevel = lastLevel + 2



End If



' Cap level between 1 and 6

If newLevel > 6 Then newLevel = 6

If newLevel < 1 Then newLevel = 1



' ── POST result back to Node server ──────────────────────────────────────────

Dim jsonBody

jsonBody = "{" \& \_

&#x20;   """sessionId"":"""  \& sessionId  \& """," \& \_

&#x20;   """activityName"":""" \& activity \& """," \& \_

&#x20;   """durationMs"":"   \& durationMs \& ","  \& \_

&#x20;   """score"":"        \& score      \& ","  \& \_

&#x20;   """level"":"        \& newLevel   \& ","  \& \_

&#x20;   """passed"":"       \& passed     \& ","  \& \_

&#x20;   """coinsAwarded"":"  \& coins      \& \_

"}"



Dim postUrl

postUrl = serverUrl \& "/api/gcompris/result"



On Error Resume Next

objHTTP.open "POST", postUrl, False

objHTTP.setRequestHeader "Content-Type", "application/json"

objHTTP.setRequestHeader "Authorization", "Bearer " \& token

objHTTP.send jsonBody

On Error GoTo 0









C:\\EduBridgeLauncher\\artweaver.vbs









Set objShell = CreateObject("WScript.Shell")

Set objHTTP  = CreateObject("MSXML2.XMLHTTP")

Set fso      = CreateObject("Scripting.FileSystemObject")



If WScript.Arguments.Count = 0 Then

&#x20;   MsgBox "Please click Draw Art button in browser.", vbInformation, "EduPOC"

&#x20;   WScript.Quit

End If



' Parse URL

Dim fullUrl : fullUrl = WScript.Arguments(0)

Dim queryString : queryString = Mid(fullUrl, InStr(fullUrl, "?") + 1)



Function URLDecode(s)

&#x20;   Dim i, c, result : result = "" : i = 1

&#x20;   Do While i <= Len(s)

&#x20;       c = Mid(s, i, 1)

&#x20;       If c = "+" Then

&#x20;           result = result \& " "

&#x20;       ElseIf c = "%" And i + 2 <= Len(s) Then

&#x20;           result = result \& Chr(CLng("\&H" \& Mid(s, i+1, 2)))

&#x20;           i = i + 2

&#x20;       Else

&#x20;           result = result \& c

&#x20;       End If

&#x20;       i = i + 1

&#x20;   Loop

&#x20;   URLDecode = result

End Function



Dim params : Set params = CreateObject("Scripting.Dictionary")

Dim pairs, i

pairs = Split(queryString, "\&")

For i = 0 To UBound(pairs)

&#x20;   Dim eqPos : eqPos = InStr(pairs(i), "=")

&#x20;   If eqPos > 0 Then

&#x20;       params(Left(pairs(i), eqPos-1)) = URLDecode(Mid(pairs(i), eqPos+1))

&#x20;   End If

Next



Dim token     : token     = params("token")

Dim serverUrl : serverUrl = params("serverUrl")



' Create save folder

Dim saveFolder : saveFolder = "C:\\EduBridgeLauncher\\Drawings"

If Not fso.FolderExists(saveFolder) Then fso.CreateFolder(saveFolder)



' Delete old drawings in folder (keep it clean)

Dim oldFile

For Each oldFile In fso.GetFolder(saveFolder).Files

&#x20;   oldFile.Delete True

Next



' Launch ArtWeaver — student draws and SAVES as PNG inside ArtWeaver

Dim artPath : artPath = "C:\\Program Files\\Artweaver 8\\Artweaver.exe"



MsgBox "ArtWeaver will open now!" \& vbCrLf \& vbCrLf \& \_

&#x20;      "1. Draw your picture" \& vbCrLf \& \_

&#x20;      "2. Click File → Export As → PNG" \& vbCrLf \& \_

&#x20;      "3. Save it to: C:\\EduBridgeLauncher\\Drawings\\" \& vbCrLf \& \_

&#x20;      "4. Close ArtWeaver", \_

&#x20;      vbInformation, "EduPOC - Instructions"



Dim oExec : Set oExec = objShell.Exec(Chr(34) \& artPath \& Chr(34))

Do While oExec.Status = 0

&#x20;   WScript.Sleep 2000

Loop



' Find the PNG file student saved

Dim pngFile, foundFile

Set foundFile = Nothing

For Each pngFile In fso.GetFolder(saveFolder).Files

&#x20;   If LCase(fso.GetExtensionName(pngFile.Name)) = "png" Or \_

&#x20;      LCase(fso.GetExtensionName(pngFile.Name)) = "jpg" Then

&#x20;       Set foundFile = pngFile

&#x20;   End If

Next



If foundFile Is Nothing Then

&#x20;   MsgBox "No drawing found in the folder." \& vbCrLf \& \_

&#x20;          "Please try again and save your drawing to:" \& vbCrLf \& \_

&#x20;          "C:\\EduBridgeLauncher\\Drawings\\", \_

&#x20;          vbExclamation, "EduPOC - No Drawing Found"

&#x20;   WScript.Quit

End If



' Read PNG file and convert to base64

Dim stream

Set stream = CreateObject("ADODB.Stream")

stream.Type = 1 ' binary

stream.Open

stream.LoadFromFile foundFile.Path

Dim imageBytes : imageBytes = stream.Read

stream.Close



' Convert to base64

Dim xmlDoc

Set xmlDoc = CreateObject("MSXML2.DOMDocument")

Dim xmlElem

Set xmlElem = xmlDoc.createElement("b64")

xmlElem.dataType = "bin.base64"

xmlElem.nodeTypedValue = imageBytes

Dim base64String : base64String = xmlElem.text

base64String = Replace(base64String, vbCrLf, "")

base64String = Replace(base64String, vbLf, "")



Dim imageData : imageData = "data:image/png;base64," \& base64String

MsgBox "Token: " \& token

' POST to server

Dim jsonBody

Dim drawingTitle : drawingTitle = fso.GetBaseName(foundFile.Name)

jsonBody = "{""imageData"":""" \& imageData \& """," \& \_

&#x20;          """title"":""My Drawing""," \& \_

&#x20;          """description"":""Drawing submitted from ArtWeaver""}"



objHTTP.open "POST", serverUrl \& "/api/artweaver/submit", False

objHTTP.setRequestHeader "Content-Type", "application/json"

objHTTP.setRequestHeader "Authorization", "Bearer " \& token

objHTTP.send jsonBody

MsgBox "URL: " \& serverUrl

If objHTTP.status = 201 Then

&#x20;   MsgBox "Your drawing was submitted! 🎨" \& vbCrLf \& \_

&#x20;          "Your teacher will review it soon.", \_

&#x20;          vbInformation, "EduPOC - Submitted!"

Else

&#x20;   MsgBox "Error: " \& objHTTP.status \& vbCrLf \& objHTTP.responseText, \_

&#x20;          vbCritical, "Submission Failed"

End If

