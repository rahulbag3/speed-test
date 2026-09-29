import { cn } from "@/lib/cn";

/**
 * Material 3 top app bar.
 *
 * Material defines four sizes. `small` and `center` are the standard bars;
 * `medium` and `large` are the expressive variants that give a screen a large
 * headline. `sticky` keeps the bar pinned while the page scrolls.
 */

const SIZES = {
  small: "h-16 px-4",
  center: "h-16 px-4",
  medium: "h-28 px-4",
  large: "h-36 px-4",
} as const;

export type AppBarSize = keyof typeof SIZES;

export interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
  size?: AppBarSize;
  /** Pin the bar to the top of the viewport. */
  sticky?: boolean;
  /** Centre the contents horizontally (Material's "center" app bar). */
  centered?: boolean;
  children: React.ReactNode;
}

export function AppBar({
  size = "small",
  sticky = false,
  centered = false,
  className,
  children,
  ...props
}: AppBarProps) {
  return (
    <header
      className={cn(
        "flex w-full items-center gap-2 bg-surface text-on-surface",
        SIZES[size],
        centered && "justify-center",
        sticky &&
          "sticky top-0 z-50 border-b border-outline-variant/60 bg-surface/85 backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}
