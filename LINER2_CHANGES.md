# WAVEN (formerly Liner 2.0) — changes from Liner

Changes on top of upstream `tryliner/desktop` (v0.2.10, commit `30f319d`).

## New in Settings

**Account → Profile**
- Upload a profile picture (click or drag-and-drop). It is center-cropped to 256×256 WebP and stored on this device only.
- Avatar shape: rounded square or circle.
- Edit display name (saved to the Liner account through the existing `updateProfile` API).
- The home greeting avatar and the settings sidebar card both open this tab.

**Interface → Personalize**
- App wallpaper: none, 8 built-in gradients, or your own image (PNG/JPG/WebP/GIF/AVIF, up to 25 MB, downscaled to 2560px and kept in IndexedDB).
- Blur and dim sliders. The dim tint uses the theme canvas color, so it works in light and dark mode.
- Slow-motion drift (turned off automatically when the OS asks for reduced motion).
- Toggle for album/artist/playlist cover backdrops over the wallpaper.
- Accent color presets (overrides `--accent-*` CSS variables).
- Reset all personalization.

## Code map

- `src/features/personalization/`: store (`zustand` persist, validated on rehydrate), image processing, IndexedDB wallpaper assets, `WallpaperLayer`, `PersonalizationSync`, `CurrentUserAvatar`
- `src/features/settings/ui/tabs/ProfileTab.tsx`, `WallpaperTab.tsx`, `useImageDrop.ts`
- `modalStore.openSettingsTab(tab)` opens Settings on a specific tab
- Strings: `settings.profile_custom.*` and `settings.personalize.*` in `en.json` (other locales fall back to English)

## Browser-only UI preview

`.claude/vite.renderer.config.ts` runs the renderer without Electron. The API points at a dead port, so nothing reaches the real backend:

```bash
npx vite --config .claude/vite.renderer.config.ts
```

## Later additions

- **Sound tab**: 10-band EQ with presets, crossfade (fades each song out/in, 0–12 s, not overlapping playback), volume leveling (compressor), karaoke (centre-vocal cancel), visualizer, sleep timer, wake-up alarm, now-playing notifications. All effects live in one Web Audio chain after the existing pitch/reverb graph (`pitchShifter.ts`).
- **Performance mode**: header leaf button and Settings toggle; kills backdrop blur, framer transforms, wallpaper blur/drift; Kawarp at 30 fps / 0.3 scale; trims renderer caches while hidden; YouTube token window idles out after 90 s (10 min normally). Spellcheck is off.
- **Stats** (`/stats`) and **History** (`/history`) pages from a local listening log (`liner_listening_log_v1`, 5000 entries max), plus a downloadable Wrapped card.
- **Command palette** (Ctrl+K) and **shortcut cheat sheet** (`?`).
- **Custom theme builder** with presets, saved themes, JSON export/import.
- **Pinned playlists** in the sidebar (pin button on playlist pages).
- **Desktop tab**: close to tray, start with Windows (packaged builds only), settings backup/restore.
- **Updates disabled** and the app renamed **Liner 2.0** (`com.liner2.app`, `liner2.exe`) so it can't be replaced by upstream Liner.
- **Playlist icons**: click a playlist's cover to pick an emoji + color or upload an image. Stored locally (`liner_playlist_icons_v1`, included in backups) and shown on library cards/rows, the playlist page and sidebar pins.
- **Upstream fully cut off**: no `publish` feed in the build (no `app-update.yml`), upstream update URLs are refused at the network layer, and the `tryliner/desktop` git remote is removed.
- **Renamed to WAVEN** with the wave logo (`branding/`, generated icons in `build/` and `public/`, `src/assets/waven-logo.png`). The appId stays `com.liner2.app`, so the installer upgrades an existing Liner 2.0 install, and the old `%APPDATA%/Liner 2.0` data folder is moved to `%APPDATA%/WAVEN` on first launch. Text about Liner's service (account, servers, Discord buttons, licence) still says Liner.
- **Player bar and overlay redesign**: thin progress line, cover-colour wash, times beside the transport, larger play button, tinted active toggles; overlay gets a blurred-cover glass card and a bottom progress line.
- **No account, no Liner servers (local mode)**: `src/shared/local/` answers every `/v1` request the app used to send to Liner (likes, saved items, playlists, history, profile, home page) from an IndexedDB document on the PC. Search, albums, artists and radio come straight from YouTube Music / SoundCloud with no server fallback, playback skips Liner's audio cache, lyrics come from LRCLIB, the home page uses YouTube Music charts and mixes seeded by your listening. Sign-in and sign-out are gone. The first launch copies an existing Liner library over if the old session still works. Switch back with `LOCAL_MODE` in `src/shared/local/mode.ts`.
- **1.1.0**: automatic updates from the WAVEN GitHub releases (electron-updater with the GitHub provider; Liner's channels stay blocked); your own music files (`electron/localMedia.ts`, folder scan with music-metadata, served over `waven-media://` only from folders you added, with range support for seeking; Your files page); offline downloads (`src/features/offline`, songs pinned in the audio cache so they're never evicted); Discord status uses the WAVEN Discord app, cover art, a WAVEN logo badge and a YouTube Music button. The exe is `WAVEN Music.exe`, because Discord mistook `waven.exe` for the Ankama game.
