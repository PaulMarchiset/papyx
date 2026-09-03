import { useEffect } from "react";

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}

/**
 * A small centred dialog. Hand-rolled rather than pulled from a library: the
 * app needs exactly one of these (the unsaved-result prompt), and it needs to
 * match the surface tokens.
 */
export function Modal({ title, description, children, onClose }: Props) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 animate-fade"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface px-6 py-6 space-y-4 shadow-xl shadow-black/40 animate-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-semibold text-fg">{title}</h3>
          {description && <p className="text-sm text-muted mt-2 leading-relaxed">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">{children}</div>
      </div>
    </div>
  );
}
