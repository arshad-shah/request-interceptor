/**
 * Empty state shown inside a details tab
 */

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-[var(--text-tertiary)] opacity-50 mb-2">{icon}</div>
      <div className="text-sm font-medium text-[var(--text-tertiary)]">{title}</div>
      {description && (
        <div className="text-[12px] text-[var(--text-tertiary)] mt-1 max-w-[200px]">
          {description}
        </div>
      )}
    </div>
  );
}
