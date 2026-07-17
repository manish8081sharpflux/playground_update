# Client Setup: GCompris and ArtWeaver

This guide prepares a Windows client computer to open GCompris and ArtWeaver from ISF Playground.

## Requirements

- Windows 10 or Windows 11
- An administrator account
- Google Chrome or Microsoft Edge
- The latest `launch.vbs` and `artweaver.vbs` files supplied with Playground

Run installation and registration commands in **Command Prompt opened as Administrator**.

## 1. Install GCompris

First try Windows Package Manager:

```cmd
winget search GCompris
winget install --id KDE.GCompris --exact --accept-package-agreements --accept-source-agreements
```

If WinGet cannot find the package, open the official download page and install the Windows version:

```cmd
start "" "https://gcompris.net/downloads-en.html"
```

Keep the installer's default location. Verify that Windows can find the executable:

```cmd
where /r "C:\Program Files" GCompris.exe 2>nul
where /r "C:\Program Files" gcompris-qt.exe 2>nul
where /r "C:\Program Files (x86)" GCompris.exe 2>nul
where /r "C:\Program Files (x86)" gcompris-qt.exe 2>nul
```

At least one command should print an executable path. Open that `.exe` once and confirm GCompris starts.

## 2. Install ArtWeaver

Open the official ArtWeaver download page:

```cmd
start "" "https://www.artweaver.de/download-en"
```

Download and install **ArtWeaver Free for Windows**. Keep the installer's default location. Verify the installation:

```cmd
where /r "C:\Program Files" Artweaver.exe 2>nul
where /r "C:\Program Files (x86)" Artweaver.exe 2>nul
where /r "%LOCALAPPDATA%\Programs" Artweaver.exe 2>nul
```

At least one command should print an executable path. Open that `.exe` once and confirm ArtWeaver starts.

## 3. Install the Playground launcher files

Create the local launcher folder:

```cmd
mkdir "C:\EduBridgeLauncher"
```

Copy the latest supplied files into it. The final layout must be:

```text
C:\EduBridgeLauncher\launch.vbs
C:\EduBridgeLauncher\artweaver.vbs
```

Do not put these files in the GCompris or ArtWeaver installation directories. Redeploying the Playground website does not update these local client files; replace them manually whenever the launcher scripts change.

Verify both files exist:

```cmd
dir "C:\EduBridgeLauncher\launch.vbs"
dir "C:\EduBridgeLauncher\artweaver.vbs"
```

The launchers discover application locations using Windows App Paths and the application folders represented by `%ProgramFiles%`, `%ProgramFiles(x86)%`, and `%LOCALAPPDATA%\Programs`. No environment-variable changes are required.

## 4. Register the GCompris browser protocol

Playground uses `edubridge://` to open GCompris:

```cmd
reg add "HKCR\edubridge" /ve /d "URL:EduBridge Protocol" /f
reg add "HKCR\edubridge" /v "URL Protocol" /d "" /f
reg add "HKCR\edubridge\shell\open\command" /ve /d "\"C:\Windows\System32\wscript.exe\" \"C:\EduBridgeLauncher\launch.vbs\" \"%1\"" /f
```

Verify it:

```cmd
reg query "HKCR\edubridge\shell\open\command" /ve
```

## 5. Register the ArtWeaver browser protocol

Playground uses `eduart://` to open ArtWeaver:

```cmd
reg add "HKCR\eduart" /ve /d "URL:EduArt Protocol" /f
reg add "HKCR\eduart" /v "URL Protocol" /d "" /f
reg add "HKCR\eduart\shell\open\command" /ve /d "\"C:\Windows\System32\wscript.exe\" \"C:\EduBridgeLauncher\artweaver.vbs\" \"%1\"" /f
```

Verify it:

```cmd
reg query "HKCR\eduart\shell\open\command" /ve
```

Do not register `artweaver://`; the deployed Playground frontend uses `eduart://`.

## 6. Test from Playground

1. Close every Chrome or Edge window.
2. Reopen the browser and sign in to Playground.
3. Open **Student > Computer Apps > GCompris** and select a game.
4. When the browser asks, allow it to open the EduBridge protocol.
5. Open the student's Art course and select **Open ArtWeaver**.
6. When the browser asks, allow it to open the EduArt protocol.

Do not share the `token` shown in an `edubridge://` or `eduart://` URL. If it is exposed, log out and sign back in to replace the session token.

## 7. Creating and saving ArtWeaver artwork

When ArtWeaver is opened from Playground, the launcher prepares a JPEG in:

```text
C:\EduBridgeLauncher\Drawings
```

### Student artwork process

1. Sign in to Playground and open the student's Art course.
2. Select **Open ArtWeaver**. Do not start ArtWeaver directly from the Windows Start menu, because Playground must prepare the JPEG and pass the student's upload details to the launcher.
3. Approve the browser prompt to open the EduArt protocol if it appears.
4. Wait for ArtWeaver to open with a blank white JPEG already loaded.
5. Create the drawing.
6. Press **Ctrl+S** while working and again when the drawing is finished. This saves back into the prepared JPEG; the student normally does not need to select a folder or filename.
7. Confirm any ArtWeaver prompt that asks to save the current picture. Keep the format as **JPEG/JPG**.
8. Close the complete ArtWeaver application after saving. The launcher waits for ArtWeaver to close before it starts the upload.
9. Wait for the message confirming that the drawing was saved to the gallery and submitted for coach review. Do not close the launcher message or turn off the computer before this confirmation appears.
10. Return to Playground and refresh the gallery if the new artwork is not immediately visible.

If **Save As** is used, save the artwork as a `.jpg` or `.jpeg` inside:

```text
C:\EduBridgeLauncher\Drawings
```

Using **Ctrl+S** with the prepared file is recommended because it preserves the filename and location expected by the launcher.

The launcher then uploads the JPEG to the student's Playground gallery and submits it for coach review. The local `Drawings` folder is temporary: older files are deleted when a new ArtWeaver session begins. Copy an artwork elsewhere before starting another session if a permanent local copy is required.

## Troubleshooting

### The application opens directly but not from Playground

Check the protocol registrations:

```cmd
reg query "HKCR\edubridge\shell\open\command" /ve
reg query "HKCR\eduart\shell\open\command" /ve
```

Confirm both launcher files still exist:

```cmd
dir "C:\EduBridgeLauncher\launch.vbs"
dir "C:\EduBridgeLauncher\artweaver.vbs"
```

Then restart the browser and approve its external-application prompt.

### The launcher says the application is not installed

Run the executable searches from sections 1 and 2. If an application was installed in a completely custom, unregistered directory, reinstall it using the default location.

### GCompris opens but progress looks inaccurate

The current integration awards results based on how long GCompris remains open. It does not read the student's actual in-game score.
