<p align="center">
  <img src=".github/assets/waven-icon.png" alt="WAVEN logo" width="140">
</p>

<h1 align="center">WAVEN</h1>

<p align="center">
  <b>A desktop music player built on <a href="https://github.com/tryliner/desktop">Liner</a>, made yours.</b><br>
  Wallpapers, custom themes, an equalizer, listening stats, a command palette, performance mode and more.
</p>

<p align="center">
  <a href="https://github.com/sorinisthedev/Liner2.0/releases/latest/download/WAVEN-Setup.exe"><img alt="Download WAVEN" src="https://img.shields.io/badge/Download-WAVEN--Setup.exe-111111?style=for-the-badge&logo=windows&logoColor=white"></a>
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0b0b10?style=flat-square">
  <img alt="Version" src="https://img.shields.io/badge/version-1.0-111111?style=flat-square">
</p>

<p align="center">
  <img src=".github/assets/waven-stats.png" alt="WAVEN stats page with the Aurora wallpaper" width="820">
</p>

> **WAVEN is an unofficial, personal build of Liner.** It is not made by, endorsed by or affiliated with the Liner team. Sign-in, the music catalogue and lyrics still come from Liner's servers, so you use your Liner account.

## Install

1. **[Download WAVEN-Setup.exe](https://github.com/sorinisthedev/Liner2.0/releases/latest/download/WAVEN-Setup.exe)** and run it.
2. Sign in with your Liner account.
3. Open WAVEN from the Start menu. If you had Liner 2.0 installed, WAVEN replaces it and keeps your login and settings.

> Windows may say "Windows protected your PC" because the installer isn't code-signed. Click **More info → Run anyway**.

## What you get

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

New versions are posted on the [Releases](https://github.com/sorinisthedev/Liner2.0/releases) page.

## For developers

WAVEN is an Electron + React app. Requires Node.js 20 or newer.

```bash
npx -y pnpm@10 install
npx -y pnpm@10 dev
```

Build the Windows installer with `npx electron-builder --win --publish never` after `npx tsc -b && npx vite build`; it lands in `release/WAVEN-Setup.exe`. What changed compared to Liner is listed in [LINER2_CHANGES.md](LINER2_CHANGES.md).

## License

Based on [Liner](https://github.com/tryliner/desktop) and distributed under the **Liner Source-Available & Non-Commercial Contribution License**. See [LICENSE](LICENSE). Personal, non-commercial use only.
