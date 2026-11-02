import { SOCIAL_LINKS, type SocialLinkId } from "@hypa/config/socials";

type SocialLinksProps = {
  className?: string;
  linkClassName?: string;
  iconClassName?: string;
  showLabels?: boolean;
};

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width={16}
      height={16}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M23.5 6.2a3.05 3.05 0 0 0-2.15-2.16C19.4 3.6 12 3.6 12 3.6s-7.4 0-9.35.44A3.05 3.05 0 0 0 .5 6.2 32.4 32.4 0 0 0 0 12a32.4 32.4 0 0 0 .5 5.8 3.05 3.05 0 0 0 2.15 2.16C4.6 20.4 12 20.4 12 20.4s7.4 0 9.35-.44a3.05 3.05 0 0 0 2.15-2.16A32.4 32.4 0 0 0 24 12a32.4 32.4 0 0 0-.5-5.8zM9.75 15.52V8.48L15.84 12z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width={16}
      height={16}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12M7.12 20.45H3.56V9h3.56zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width={16}
      height={16}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04v-2.66c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width={16}
      height={16}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95C23.73 2.69 21.31.27 16.95.07 15.67.01 15.26 0 12 0m0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width={16}
      height={16}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width={16}
      height={16}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M18.9 1.15h3.67l-8.02 9.17L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.58-9.81L0 1.15h7.59l5.24 6.93zM17.61 20.65h2.03L6.48 3.24H4.3z" />
    </svg>
  );
}

const ICONS: Record<
  SocialLinkId,
  (props: { className?: string }) => JSX.Element
> = {
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  threads: ThreadsIcon,
  x: XIcon,
};

export function SocialLinks({
  className,
  linkClassName,
  iconClassName,
  showLabels,
}: SocialLinksProps): JSX.Element {
  return (
    <div className={className ?? "flex items-center gap-3"}>
      {SOCIAL_LINKS.map((link) => {
        const Icon = ICONS[link.id];

        return (
          <a
            key={link.id}
            aria-label={link.label}
            className={
              linkClassName ??
              "hover:text-[var(--foreground)] transition-colors"
            }
            href={link.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon className={iconClassName} />
            {showLabels && <span>{link.label}</span>}
          </a>
        );
      })}
    </div>
  );
}
