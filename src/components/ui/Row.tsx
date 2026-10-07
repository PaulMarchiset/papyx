interface Props {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A label (and its explanation) with the control on the right — or, when the
 * panel is too narrow for both, with the control wrapped under it. The tool
 * panel shares the window with the documents and can be as narrow as 380px; a
 * row that refused to wrap pushed a segmented control straight out of the card.
 */
export function Row({ label, description, children }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
      {/* Basis 0 and a floor: the label takes whatever the control leaves,
          so a long description wraps beside the control instead of pushing
          it onto a line of its own — that only happens below the floor. */}
      <div className="min-w-[13rem] max-w-full flex-1 basis-0">
        <div className="text-sm font-medium text-fg">{label}</div>
        {description != null && (
          <div className="text-sm text-muted mt-1">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0 max-w-full">{children}</div>
    </div>
  );
}
