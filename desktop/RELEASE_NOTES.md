Eumo for Windows and macOS brings the web game's focus timer, mole companion, outfits, underground home, and reports to your desktop.

## What's new in 3.7.4

- The **EUMO** startup greeting stays on screen for an additional half second before fading out. It now waits 1.2 seconds before the existing 0.24-second fade, across web, offline, Windows and Mac versions.
- Reduced-motion preferences still skip the greeting, and it does not replay when switching pages or opening the floating companion.

Windows users on 3.3.0 or later can use Help → App updates to download this version and restart to install. Older Windows versions need one manual overwrite installation. Mac users can use the update check to download the matching DMG.

## Downloads

- **Windows 10 / 11 (x64):** `Eumo-Windows-x64-Setup.exe`
- **Mac with Apple silicon:** `Eumo-macOS-arm64.dmg`
- **Mac with Intel:** `Eumo-macOS-x64.dmg`
- **Web app:** https://1111-phi-ten.vercel.app

Mac ZIP builds are also available in the release assets.

## Floating companion

Float mole opens a native, draggable, always-on-top window with **no browser address bar**. It shares the main window's timer and rewards. Closing the main window while the mole is floating hides the main window and keeps the session running; use the return button to bring it back.

## Offline play and progress transfer

Local gameplay works offline. Chat, voice transcription, and friends require an internet connection. Web and desktop progress are stored separately; use **Help → Move / back up progress** to export and import a backup. Friend connections must be set up again on the new client. Chat history is not included in the backup.

## Installation notes

This release has no Windows publisher certificate or Apple Developer ID signature/notarization. macOS builds use ad-hoc signing only. Windows may show an unknown-publisher warning, and macOS may require confirmation in Privacy & Security before opening the app. Download from this repository's release page. `SHA256SUMS.txt` contains file checksums for verifying downloads.
