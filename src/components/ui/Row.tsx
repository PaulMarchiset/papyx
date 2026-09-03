interface Props {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}

export function Row({ label, description, children }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-fg">{label}</div>
        {description != null && (
          <div className="text-sm text-muted mt-1">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
