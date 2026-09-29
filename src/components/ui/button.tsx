import { cn } from "@/lib/cn";

/**
 * Material 3 common buttons.
 *
 * The five variants are the ones the spec defines: filled, tonal, elevated,
 * outlined and text. Each one is the right choice in a different context, so
 * they are all first-class rather than being collapsed into a `primary` flag.
 */

const VARIANTS = {
  /** Highest emphasis. One per screen. */
  filled: "bg-primary text-on-primary",
  /** Medium emphasis. */
  tonal: "bg-secondary-container text-on-secondary-container",
  /** Medium emphasis with a shadow, for use on tinted backgrounds. */
  elevated: "bg-surface-container-low text-primary shadow-1",
  /** Medium emphasis with an outline. */
  outlined: "border border-outline text-primary",
  /** Lowest emphasis. */
  text: "text-primary",
  /** Destructive action. */
  danger: "bg-error text-on-error",
  "danger-text": "text-error",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

/** Press/hover/disabled layers, applied on top of the variant colour. */
const STATE_LAYERS = {
  filled:
    "hover:bg-primary/90 active:bg-primary/80 disabled:bg-on-surface/12 disabled:text-on-surface/38",
  tonal:
    "hover:bg-secondary-container/80 active:bg-secondary-container/70 disabled:bg-on-surface/12 disabled:text-on-surface/38",
  elevated:
    "hover:bg-surface-container-high active:bg-surface-container-highest disabled:bg-on-surface/12 disabled:text-on-surface/38",
  outlined:
    "hover:bg-primary/8 active:bg-primary/12 disabled:border-on-surface/38 disabled:text-on-surface/38",
  text: "hover:bg-primary/8 active:bg-primary/12 disabled:text-on-surface/38",
  danger: "hover:bg-error/90 active:bg-error/80 disabled:bg-on-surface/12 disabled:text-on-surface/38",
  "danger-text": "hover:bg-error/8 active:bg-error/12 disabled:text-on-surface/38",
} as const;

const SIZES = {
  sm: "h-8 gap-1.5 px-3 text-label-md",
  md: "h-10 gap-2 px-4 text-label-lg",
  lg: "h-14 gap-2.5 px-6 text-title-md",
} as const;

export type ButtonSize = keyof typeof SIZES;

/** Rounded ends for the common button, per the shape scale. */
const RADII = {
  sm: "rounded-full",
  md: "rounded-full",
  lg: "rounded-2xl",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render a leading icon. */
  iconStart?: React.ReactNode;
  /** Render a trailing icon. */
  iconEnd?: React.ReactNode;
  /** Stretch to the width of the parent. */
  fill?: boolean;
}

/**
 * @example
 * <Button variant="filled" size="lg" iconStart={<PlayIcon />}>Start test</Button>
 */
export function Button({
  variant = "filled",
  size = "md",
  iconStart,
  iconEnd,
  fill = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap",
        "transition-[background-color,color,box-shadow,border-color] duration-short2 ease-standard",
        "disabled:pointer-events-none",
        VARIANTS[variant],
        STATE_LAYERS[variant],
        SIZES[size],
        RADII[size],
        fill && "w-full",
        className,
      )}
      {...props}
    >
      {iconStart ? (
        <span aria-hidden className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-5">
          {iconStart}
        </span>
      ) : null}
      {props.children}
      {iconEnd ? (
        <span aria-hidden className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-5">
          {iconEnd}
        </span>
      ) : null}
    </button>
  );
}
