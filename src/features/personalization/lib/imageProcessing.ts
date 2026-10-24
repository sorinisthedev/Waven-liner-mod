export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
export const AVATAR_SIZE = 256;
export const WALLPAPER_MAX_EDGE = 2560;

export class ImageInputError extends Error {
  constructor(
    public readonly reason: "type" | "size" | "decode",
    message: string,
  ) {
    super(message);
    this.name = "ImageInputError";
  }
}

export function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new ImageInputError("type", "Pick an image file (PNG, JPG, WebP or GIF).");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new ImageInputError("size", "Image is larger than 25 MB.");
  }
}

async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to <img>, some formats only decode there
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new ImageInputError("decode", "That image couldn't be read.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sourceSize(src: ImageBitmap | HTMLImageElement) {
  return "naturalWidth" in src
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : { w: src.width, h: src.height };
}

function release(src: ImageBitmap | HTMLImageElement) {
  if ("close" in src) src.close();
}

/** center-crops to a square and downsizes, returns a small webp data url */
export async function fileToAvatarDataUrl(file: File, size = AVATAR_SIZE): Promise<string> {
  validateImageFile(file);
  const src = await decodeImage(file);
  try {
    const { w, h } = sourceSize(src);
    if (!w || !h) throw new ImageInputError("decode", "That image couldn't be read.");
    const side = Math.min(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageInputError("decode", "That image couldn't be read.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    release(src);
  }
}

/** keeps aspect ratio, caps the long edge so huge photos don't eat memory */
export async function fileToWallpaperBlob(
  file: File,
  maxEdge = WALLPAPER_MAX_EDGE,
): Promise<Blob> {
  validateImageFile(file);
  // animated gifs would lose their animation on a canvas, keep them as-is
  if (file.type === "image/gif") return file;
  const src = await decodeImage(file);
  try {
    const { w, h } = sourceSize(src);
    if (!w || !h) throw new ImageInputError("decode", "That image couldn't be read.");
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageInputError("decode", "That image couldn't be read.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.88),
    );
    if (!blob) throw new ImageInputError("decode", "That image couldn't be read.");
    return blob;
  } finally {
    release(src);
  }
}
