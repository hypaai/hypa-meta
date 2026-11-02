import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

// Inline icons: a lucide-react copy here would bind to the repo root's React types, not the app's.
const icon = (path: string, className: string) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d={path} />
  </svg>
);

export type ProviderSelectorOption = {
  value: string;
  label: string;
};

export function SettingsSelector({
  value,
  options,
  onChange,
  ariaLabel,
  label,
  disabled = false,
  containerClassName = "",
}: {
  value: string;
  options: readonly ProviderSelectorOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  label: string;
  disabled?: boolean;
  containerClassName?: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className={containerClassName}>
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label={ariaLabel}
            className="inline-flex h-9 min-w-[280px] items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 lg:min-w-[400px] dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
          >
            <span className="truncate">{selected?.label || value}</span>
            {icon("m6 9 6 6 6-6", "ml-2 size-4 shrink-0")}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-50 max-h-80 min-w-[280px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md lg:min-w-[400px]"
          >
            <DropdownMenu.Label className="px-2 py-1.5 text-sm font-medium">
              Available {label.toLowerCase()}s
            </DropdownMenu.Label>
            <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
            {options.map((option) => (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => onChange(option.value)}
                className={`relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground ${
                  option.value === value ? "bg-accent" : ""
                }`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {option.label}
                </span>
                {option.value === value && (
                  icon("M20 6 9 17l-5-5", "ml-auto size-4 shrink-0")
                )}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export function ProviderSelector(
  props: Omit<
    Parameters<typeof SettingsSelector>[0],
    "label" | "containerClassName"
  >,
) {
  return (
    <SettingsSelector {...props} label="Provider" containerClassName="mb-4" />
  );
}

export function ProviderModelSettings({
  title,
  provider,
  model,
  providers,
  models,
  onProviderChange,
  onModelChange,
  selectionEnabled,
  ariaPrefix,
}: {
  title: string;
  provider: string;
  model: string;
  providers: readonly ProviderSelectorOption[];
  models: readonly ProviderSelectorOption[];
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  selectionEnabled: boolean;
  ariaPrefix: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-lg text-card-foreground font-medium mb-3">{title}</p>
      {selectionEnabled && (
        <ProviderSelector
          value={provider}
          options={providers}
          onChange={onProviderChange}
          ariaLabel={`${ariaPrefix} provider selector`}
        />
      )}
      <SettingsSelector
        label="Model"
        value={model}
        options={models}
        onChange={onModelChange}
        ariaLabel={`${ariaPrefix} model selector`}
        disabled={!selectionEnabled}
      />
    </div>
  );
}
