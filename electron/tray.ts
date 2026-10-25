import { app, ipcMain, Menu, nativeImage, Tray, type BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface DesktopOptions {
  /** closing the window hides it to the tray instead of quitting */
  closeToTray: boolean;
  /** launch with windows, straight into the tray */
  openAtLogin: boolean;
}

const DEFAULTS: DesktopOptions = { closeToTray: false, openAtLogin: false };
export const HIDDEN_ARG = "--hidden";

type TrayAction = "togglePlay" | "next" | "prev";

/**
 * Tray icon, close-to-tray and start-with-windows. Options live in a small
 * json file in userData so they apply before the renderer has loaded.
 */
export class DesktopIntegration {
  private tray: Tray | null = null;
  private options: DesktopOptions;
  private readonly file: string;

  constructor(
    private readonly deps: {
      getWindow: () => BrowserWindow | null;
      sendAction: (action: TrayAction) => void;
      quit: () => void;
      iconPath: string;
    },
  ) {
    this.file = path.join(app.getPath("userData"), "desktop-options.json");
    this.options = this.read();
    if (process.platform !== "darwin") this.createTray();

    ipcMain.handle("desktop:get-options", () => ({
      ...this.options,
      openAtLogin: this.loginItemEnabled(),
    }));
    ipcMain.handle("desktop:set-options", (_event, patch: unknown) => {
      this.update(patch as Partial<DesktopOptions>);
      return { ...this.options, openAtLogin: this.loginItemEnabled() };
    });
  }

  /** launched by the login item: stay in the tray until the user opens it */
  startHidden(): boolean {
    return Boolean(this.tray) && process.argv.includes(HIDDEN_ARG);
  }

  shouldHideOnClose(): boolean {
    return Boolean(this.tray) && this.options.closeToTray;
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  private read(): DesktopOptions {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as Partial<DesktopOptions>;
      return {
        closeToTray: typeof raw.closeToTray === "boolean" ? raw.closeToTray : DEFAULTS.closeToTray,
        openAtLogin: typeof raw.openAtLogin === "boolean" ? raw.openAtLogin : DEFAULTS.openAtLogin,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private update(patch: Partial<DesktopOptions>): void {
    if (typeof patch.closeToTray === "boolean") this.options.closeToTray = patch.closeToTray;
    if (typeof patch.openAtLogin === "boolean") {
      this.options.openAtLogin = patch.openAtLogin;
      // only a packaged build has a stable exe path worth registering
      if (app.isPackaged) {
        app.setLoginItemSettings({ openAtLogin: patch.openAtLogin, args: [HIDDEN_ARG] });
      }
    }
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.options));
    } catch {}
  }

  private loginItemEnabled(): boolean {
    if (!app.isPackaged) return this.options.openAtLogin;
    try {
      return app.getLoginItemSettings({ args: [HIDDEN_ARG] }).openAtLogin;
    } catch {
      return this.options.openAtLogin;
    }
  }

  private showWindow(): void {
    const win = this.deps.getWindow();
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }

  private createTray(): void {
    try {
      const icon = nativeImage.createFromPath(this.deps.iconPath).resize({ width: 16, height: 16 });
      this.tray = new Tray(icon);
    } catch {
      this.tray = null;
      return;
    }
    this.tray.setToolTip("WAVEN");
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Show WAVEN", click: () => this.showWindow() },
        { type: "separator" },
        { label: "Play / Pause", click: () => this.deps.sendAction("togglePlay") },
        { label: "Next", click: () => this.deps.sendAction("next") },
        { label: "Previous", click: () => this.deps.sendAction("prev") },
        { type: "separator" },
        { label: "Quit WAVEN", click: () => this.deps.quit() },
      ]),
    );
    this.tray.on("click", () => {
      const win = this.deps.getWindow();
      if (win && win.isVisible() && !win.isMinimized() && win.isFocused()) win.hide();
      else this.showWindow();
    });
  }
}
