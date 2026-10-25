import type { ComponentType } from "react";
import {
  Home7Fill,
  Search3Fill,
  BookmarksFill,
  Settings4Fill,
  ChartBarFill,
  HistoryFill,
  FolderOpenFill,
} from "@mingcute/react";

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

export const sidebarNavItems: NavItem[] = [
  { id: "home", label: "Home", href: "/", Icon: Home7Fill },
  { id: "search", label: "Search", Icon: Search3Fill },
  { id: "library", label: "Library", href: "/library", Icon: BookmarksFill },
  { id: "files", label: "Your files", href: "/files", Icon: FolderOpenFill },
  { id: "stats", label: "Stats", href: "/stats", Icon: ChartBarFill },
  { id: "history", label: "History", href: "/history", Icon: HistoryFill },
  { id: "settings", label: "Settings", Icon: Settings4Fill },
];
