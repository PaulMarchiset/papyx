interface Props {
  title?: string;
  children: React.ReactNode;
}

/** A titled card. The title sits outside the surface, as in FFkit's panels. */
export function Section({ title, children }: Props) {
  return (
    <div>
      {title && (
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
          {title}
        </h3>
      )}
      <div className="rounded-2xl bg-surface px-6 py-6 space-y-5">{children}</div>
    </div>
  );
}
