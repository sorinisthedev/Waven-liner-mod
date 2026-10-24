import { useCallback, useRef, useState } from "react";

/** file picker + drag-and-drop wiring shared by the avatar and wallpaper pickers */
export function useImageDrop(onFile: (file: File) => void | Promise<void>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const inputProps = {
    ref: inputRef,
    type: "file" as const,
    accept: "image/png,image/jpeg,image/webp,image/gif,image/avif",
    hidden: true,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // reset so picking the same file again still fires change
      e.target.value = "";
      if (file) void onFile(file);
    },
  };

  const dropProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) void onFile(file);
    },
  };

  return { inputProps, dropProps, dragging, openPicker };
}
