<p align="center">
  <img src=".github/assets/waven-icon.png" alt="WAVEN logo" width="140">
</p>

<h1 align="center">WAVEN</h1>

<p align="center">
  <b>A free desktop music player. No account, no sign-in: everything stays on your PC.</b><br>
  Search any song, build playlists, synced lyrics, wallpapers, themes, an equalizer, listening stats and more.
</p>

<p align="center">
  <a href="https://github.com/sorinisthedev/Waven-liner-mod/releases/latest/download/WAVEN-Setup.exe"><img alt="Download WAVEN" src="https://img.shields.io/badge/Download-WAVEN--Setup.exe-111111?style=for-the-badge&logo=windows&logoColor=white"></a>
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0b0b10?style=flat-square">
  <img alt="Version" src="https://img.shields.io/badge/version-1.1.0-111111?style=flat-square">
</p>

<p align="center">
  <img src=".github/assets/waven-stats.png" alt="WAVEN stats page with the Aurora wallpaper" width="820">
</p>

> **WAVEN is an unofficial, personal build based on [Liner](https://github.com/tryliner/desktop).** It is not made by, endorsed by or affiliated with the Liner team. WAVEN doesn't use Liner's servers: music comes from YouTube Music and SoundCloud, lyrics from [LRCLIB](https://lrclib.net), and your library is saved on your own PC.

## Install

1. **[Download WAVEN-Setup.exe](https://github.com/sorinisthedev/Waven-liner-mod/releases/latest/download/WAVEN-Setup.exe)** and run it.
2. Open WAVEN from the Start menu and start listening. There's nothing to sign up for.
3. Coming from Liner 2.0? WAVEN replaces it, keeps your settings, and copies your Liner likes and playlists to your PC the first time it opens.

> Windows may say "Windows protected your PC" because the installer isn't code-signed. Click **More info → Run anyway**.

## What you get

- **No account**: likes, playlists, saved albums and artists, and your history are stored on your PC. Back them up to a file from Settings.
- **Search and play anything** from YouTube Music and SoundCloud, with albums, artists, song radio, daily mixes and the weekly charts.
- **Your own music files**: add folders from your PC and play your MP3, FLAC, M4A, WAV and OGG files with their covers, next to everything else.
- **Offline downloads**: download any playlist or album and play it with no internet.
- **Automatic updates**: WAVEN checks this page for new versions and installs them for you.
- **Discord status**: shows the song you're playing with its cover, the WAVEN logo and a button to play it on YouTube Music.
- **Make it yours**: profile picture, app wallpapers (gradients or your own image), accent colors, app and lyrics fonts, and a custom theme builder with import and export.
- **Sound**: 10-band equalizer with presets, crossfade, volume leveling, karaoke mode, a visualizer, a sleep timer and a wake-up alarm.
- **Your stats**: minutes listened, top songs and artists, when you listen, a full play history and a shareable Wrapped-style card.
- **Faster to use**: a Ctrl+K command palette, a `?` shortcut sheet, pinned playlists in the sidebar and custom playlist icons.
- **Performance mode**: one click turns off blur and motion to cut CPU, GPU and memory use.
- **Desktop extras**: close to tray, start with Windows, desktop now-playing alerts and settings backup and restore.

<p align="center">
  <img src=".github/assets/waven-settings.png" alt="Personalize settings with wallpapers" width="400">
  <img src=".github/assets/waven-sound.png" alt="Sound settings with the equalizer" width="400">
</p>

New versions are posted on the [Releases](https://github.com/sorinisthedev/Waven-liner-mod/releases) page.

## For developers

WAVEN is an Electron + React app. Requires Node.js 20 or newer.

```bash
npx -y pnpm@10 install
npx -y pnpm@10 dev
```

Build the Windows installer with `npx electron-builder --win --publish never` after `npx tsc -b && npx vite build`; it lands in `release/WAVEN-Setup.exe`. What changed compared to Liner is listed in [LINER2_CHANGES.md](LINER2_CHANGES.md).

## License

Based on [Liner](https://github.com/tryliner/desktop) and distributed under the **Liner Source-Available & Non-Commercial Contribution License**. See [LICENSE](LICENSE). Personal, non-commercial use only.
