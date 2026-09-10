import { useEffect } from "react";

interface Props {
  title: string;
  description?: string;
  /** Optional block between the description and the actions. */
  body?: React.ReactNode;
  /** The actions, laid out in a row along the bottom edge. */
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * A small centred dialog. Hand-rolled rather than pulled from a library: the
 * app needs two of these (the unsaved-result prompt and the update prompt), and
 * they need to match the surface tokens.
 */
export function Modal({ title, description, body, children, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-surface px-7 py-6 space-y-4 shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-semibold text-fg">{title}</h3>
          {description && <p className="text-sm text-muted mt-2 leading-relaxed">{description}</p>}
        </div>
        {body}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">{children}</div>
      </div>
    </div>
  );
}
