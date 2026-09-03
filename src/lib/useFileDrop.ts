import { useEffect, useRef, useState } from "react";
import type { PickedFile } from "@/lib/services/fileSystem";

/**
 * Window-wide drag and drop, in HTML5 form on both runtimes.
 *
 * Tauri can hand the webview native drop events carrying real paths, but on
 * Windows that mode takes the whole drag pipeline over and disables the HTML5
 * drag-and-drop API inside the page — which is what reordering pages and files
 * is built on. So the window is configured with `dragDropEnabled: false` (see
 * tauri.conf.json) and drops arrive as ordinary `DataTransfer` files here.
 *
 * The trade-off: a dropped file has no `path`, only its bytes. Nothing in the
 * app needs one — outputs are written where the user says, not next to the
 * source — so this costs a tooltip and buys in-page dragging.
 */
export function useFileDrop(onFiles: (files: PickedFile[]) => void): boolean {
  const [dragging, setDragging] = useState(false);
  // Keeps the effect from re-subscribing on every render of the caller.
  const handler = useRef(onFiles);
  handler.current = onFiles;

  useEffect(() => {
    // Nested elements fire dragleave as the pointer crosses them, so "still
    // inside the window" is tracked with a counter rather than a boolean.
    let depth = 0;

    /** True for an OS file drag; a page or row being dragged inside the app
     *  must not light up the drop zone. */
    const carriesFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = async (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const list = Array.from(event.dataTransfer?.files ?? []);
      if (list.length === 0) return;
      handler.current(
        await Promise.all(
          list.map(async (file) => ({
            name: file.name,
            path: null,
            bytes: new Uint8Array(await file.arrayBuffer()),
          })),
        ),
      );
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return dragging;
}
