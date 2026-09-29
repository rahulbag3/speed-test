import { cn } from "@/lib/cn";

/**
 * Material 3 icon buttons.
 *
 * An icon button must always have an accessible name, so `label` is required
 * and becomes the `aria-label`. The visible glyph is decorative.
 */

const VARIANTS = {
  standard: "text-on-surface-variant hover:bg-on-surface/8 active:bg-on-surface/12",
  filled: "bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 active:bg-secondary-container/70",
  outlined:
    "border border-outline-variant text-on-surface-variant hover:bg-on-surface/8 active:bg-on-surface/12",
} as const;

export type IconButtonVariant = keyof typeof VARIANTS;

const SIZES = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

export type IconButtonSize = keyof typeof SIZES;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name. Also used as the tooltip. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** The glyph to render. */
  children: React.ReactNode;
  /** Render in a selected state, for toggle buttons. */
  selected?: boolean;
}

/**
 * @example
 * <IconButton label="Toggle dark mode" variant="tonal" selected={isDark}>
 *   <Icon name="moon" />
 * </IconButton>
 */
export function IconButton({
  label,
  variant = "standard",
  size = "md",
  children,
  selected = false,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={selected || undefined}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full",
        "transition-[background-color,color,border-color] duration-short2 ease-standard",
        "disabled:pointer-events-none disabled:opacity-38",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      <span aria-hidden className="flex items-center justify-center">
        {children}
      </span>
    </button>
  );
}
