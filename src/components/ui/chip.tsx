import { cn } from "@/lib/cn";

/**
 * Material 3 chips: assist, filter and suggestion.
 *
 * A chip is a compact, removable or selectable element. `filter` chips hold a
 * selected state and expose it with `aria-pressed`; `assist` chips are simple
 * action triggers.
 */

const SIZES = {
  sm: "h-7 gap-1 pl-2.5 pr-2 text-label-md",
  md: "h-8 gap-1.5 pl-3 pr-3 text-label-lg",
} as const;

export type ChipSize = keyof typeof SIZES;

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: React.ReactNode;
  variant?: "assist" | "filter" | "suggestion";
  size?: ChipSize;
  /** Renders a leading glyph. */
  iconStart?: React.ReactNode;
  /** Renders a trailing glyph, e.g. a close icon for a removable chip. */
  iconEnd?: React.ReactNode;
  /** Selected state. Only meaningful for `filter` chips. */
  selected?: boolean;
  /** Raised chips sit on a tinted surface and carry a shadow. */
  elevated?: boolean;
}

/**
 * @example
 * <Chip variant="filter" selected={autoStart} onClick={toggle}>
 *   Auto-start
 * </Chip>
 */
export function Chip({
  children,
  variant = "assist",
  size = "md",
  iconStart,
  iconEnd,
  selected = false,
  elevated = false,
  className,
  type = "button",
  ...props
}: ChipProps) {
  const interactive = variant !== "suggestion";

  return (
    <button
      type={type}
      aria-pressed={variant === "filter" ? selected : undefined}
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg",
        "transition-[background-color,color,box-shadow,border-color] duration-short2 ease-standard",
        SIZES[size],
        interactive ? "cursor-pointer" : "cursor-default",
        selected
          ? "bg-secondary-container text-on-secondary-container"
          : "border border-outline-variant text-on-surface-variant",
        elevated && "shadow-1",
        !selected && interactive && "hover:bg-on-surface/8 active:bg-on-surface/12",
        !interactive && "border-transparent bg-surface-variant",
        className,
      )}
      {...props}
    >
      {iconStart ? (
        <span aria-hidden className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
          {iconStart}
        </span>
      ) : null}
      {children}
      {iconEnd ? (
        <span aria-hidden className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
          {iconEnd}
        </span>
      ) : null}
    </button>
  );
}
