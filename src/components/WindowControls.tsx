import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Windows-style caption controls for the frameless window. These sit outside
 * any data-tauri-drag-region so the drag handler does not swallow their clicks;
 * macOS keeps its native traffic lights instead (see App).
 *
 * Two details are load-bearing:
 *
 * `shape-rendering="crispEdges"` on every glyph. These are 1px strokes on a
 * 10px box, and Windows runs at 125% or 150% scaling far more often than not —
 * at 1.25x a stroke lands on a half-pixel and the renderer spreads it over two
 * columns at half opacity. The result reads as a smudged double edge on some
 * sides of the square and not others, which is exactly the "square with a line
 * on top and one on the right" it looked like before. Snapping to whole device
 * pixels is the fix; these shapes are axis-aligned rectangles, so there is
 * nothing for antialiasing to do for them anyway.
 *
 * The middle button follows the window instead of always drawing a square. A
 * maximised window offers *restore*, and Windows draws that as two offset
 * squares — showing the maximise glyph while maximised is a button that lies
 * about what it does, and the app now starts maximised, so that state is the
 * common one rather than the exception.
 */
/**
 * Every call into the window runs through here.
 *
 * `getCurrentWindow()` reads the label out of the runtime's metadata and
 * throws if there is none — a stubbed `__TAURI_INTERNALS__`, a handle torn
 * down mid-unmount. Unguarded, that threw inside the mount effect and took the
 * whole header down with it: no logo, no Settings button, nothing. A caption
 * button that does nothing, or a glyph left in the wrong state, is a far
 * smaller failure than a window with no chrome at all.
 */
function onWindow<T>(action: (win: ReturnType<typeof getCurrentWindow>) => T): T | undefined {
  try {
    return action(getCurrentWindow());
  } catch {
    return undefined;
  }
}

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let alive = true;
    let stop: (() => void) | undefined;

    const sync = () =>
      onWindow((win) =>
        win
          .isMaximized()
          .then((value) => {
            if (alive) setMaximized(value);
          })
          .catch(() => {}),
      );

    sync();
    // Resize is the only event that can change it — snapping, double-clicking
    // the caption and the button itself all arrive as one.
    onWindow((win) =>
      win
        .onResized(sync)
        .then((unlisten) => {
          if (alive) stop = unlisten;
          else unlisten();
        })
        .catch(() => {}),
    );

    return () => {
      alive = false;
      stop?.();
    };
  }, []);

  return (
    <div className="flex items-stretch self-stretch flex-shrink-0">
      <CaptionButton label="Minimize" onClick={() => onWindow((win) => win.minimize())}>
        <line x1="0" y1="5.5" x2="10" y2="5.5" />
      </CaptionButton>

      <CaptionButton
        label={maximized ? "Restore" : "Maximize"}
        onClick={() => onWindow((win) => win.toggleMaximize())}
      >
        {maximized ? (
          <>
            {/* The front square, and the back one reduced to the two edges
                that are not hidden behind it. */}
            <rect x="0.5" y="2.5" width="7" height="7" />
            <path d="M2.5 2.5V0.5H9.5V7.5H7.5" />
          </>
        ) : (
          <rect x="0.5" y="0.5" width="9" height="9" />
        )}
      </CaptionButton>

      <CaptionButton label="Close" danger onClick={() => onWindow((win) => win.close())}>
        <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" />
        <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" />
      </CaptionButton>
    </div>
  );
}

function CaptionButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      // data-flat: no press dip here. These are chrome, not controls in the
      // page, and Windows caption buttons do not move when pressed.
      data-flat
      onClick={onClick}
      className={
        "w-[60px] flex items-center justify-center text-fg/80 transition-colors " +
        (danger ? "hover:bg-[#c42b1c] hover:text-white" : "hover:bg-elevate-3")
      }
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        shapeRendering="crispEdges"
      >
        {children}
      </svg>
    </button>
  );
}
