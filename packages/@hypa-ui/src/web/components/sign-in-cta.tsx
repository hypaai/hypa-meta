import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

interface SignInCtaProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction: () => void;
  icon?: IconComponent;
  actionIcon?: IconComponent;
}

export function SignInCta({
  title = "Access Restricted",
  description = "You can't access this page without being signed in.",
  actionLabel = "Sign in",
  onAction,
  icon: Icon,
  actionIcon: ActionIcon,
}: SignInCtaProps): JSX.Element {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl p-8 shadow-lg">
        {Icon ? (
          <Icon className="size-10 text-[var(--muted-foreground)]" />
        ) : null}
        <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          {description}
        </p>

        <button
          onClick={onAction}
          className="mt-3 flex cursor-pointer items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] transition duration-300 hover:gap-3 hover:opacity-90"
        >
          <span>{actionLabel}</span>
          {ActionIcon ? <ActionIcon className="size-4" /> : null}
        </button>
      </div>
    </div>
  );
}
