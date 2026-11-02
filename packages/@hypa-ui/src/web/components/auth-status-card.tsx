import type { ReactNode } from "react";

interface AuthStatusCardProps {
  title: string;
  description: string;
  meta?: string;
  icon: ReactNode;
}

export function AuthStatusCard({
  title,
  description,
  meta,
  icon,
}: AuthStatusCardProps): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-4">{icon}</div>
          <h2 className="mb-2 text-xl font-bold text-[var(--foreground)]">
            {title}
          </h2>
          <p className="text-[var(--muted-foreground)]">{description}</p>
          {meta ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
