// the WAVEN listen page (GitHub Pages): opens the link in WAVEN when it's
// installed, otherwise offers the download
export const SHARE_BASE_URL = "https://sorinisthedev.github.io/Waven-liner-mod/open";

export type ShareEntityType = "artist" | "album" | "playlist" | "track";

// builds a public share link; the listen page bounces it to the waven:// deeplink
export function buildShareUrl(
  type: ShareEntityType,
  id: string,
  label?: { title?: string; artist?: string },
): string {
  const params = new URLSearchParams({ type, id });
  if (label?.title) params.set("t", label.title.slice(0, 100));
  if (label?.artist) params.set("a", label.artist.slice(0, 80));
  return `${SHARE_BASE_URL}/?${params}`;
}
