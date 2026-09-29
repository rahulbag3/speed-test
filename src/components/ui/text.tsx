import { cn } from "@/lib/cn";

/**
 * Material 3 type scale, exposed as React components.
 *
 * Each variant maps to the right semantic element as well as the right token,
 * so a screen reader hears a heading because the markup says `<h2>`, not
 * because a class was applied.
 */

export const TEXT_VARIANTS = {
  "display-xl": { className: "text-display-xl", as: "h1" },
  "display-lg": { className: "text-display-lg", as: "h1" },
  "display-md": { className: "text-display-md", as: "h2" },
  "display-sm": { className: "text-display-sm", as: "h2" },
  "headline-lg": { className: "text-headline-lg", as: "h2" },
  "headline-md": { className: "text-headline-md", as: "h3" },
  "headline-sm": { className: "text-headline-sm", as: "h3" },
  "title-lg": { className: "text-title-lg", as: "h3" },
  "title-md": { className: "text-title-md", as: "h4" },
  "title-sm": { className: "text-title-sm", as: "h5" },
  "body-lg": { className: "text-body-lg", as: "p" },
  "body-md": { className: "text-body-md", as: "p" },
  "body-sm": { className: "text-body-sm", as: "p" },
  "label-lg": { className: "text-label-lg", as: "span" },
  "label-md": { className: "text-label-md", as: "span" },
  "label-sm": { className: "text-label-sm", as: "span" },
  /** Tabular numerals for values that update live. */
  metric: { className: "text-metric numeric", as: "p" },
} as const;

/**
 * Tailwind only sees class names it can find literally in the source, so these
 * are written out rather than interpolated.
 */
const ALIGN_CLASSES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;


export type TextVariant = keyof typeof TEXT_VARIANTS;

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  /**
   * Override the element. Defaults to the semantic element for the variant,
   * which is what you want in almost every case.
   */
  as?: React.ElementType;
  /** Centre the text. */
  align?: "left" | "center" | "right";
  /** Muted supporting copy. */
  muted?: boolean;
}

/**
 * Renders text at a Material 3 type style.
 *
 * @example
 * <Text variant="display-lg">Fast enough to notice</Text>
 * <Text variant="body-md" muted>Measured over a 10 second sample.</Text>
 */
export function Text({
  variant = "body-lg",
  as,
  align = "left",
  muted = false,
  className,
  ...props
}: TextProps) {
  const config = TEXT_VARIANTS[variant];
  const Component = as ?? config.as;

  return (
    <Component
      className={cn(
        config.className,
        ALIGN_CLASSES[align],
        muted && "text-on-surface-variant",
        className,
      )}
      {...props}
    />
  );
}

/** Centred display text, the standard hero heading. */
export function DisplayText({
  className,
  ...props
}: Omit<TextProps, "align">) {
  return <Text variant="display-lg" align="center" className={className} {...props} />;
}
