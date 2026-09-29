import { cn } from "@/lib/cn";

/**
 * Material 3 divider.
 *
 * The full-width variant is the default; `inset` pulls it in to align with
 * list content, which is the usual choice inside a card.
 */

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "full" | "inset";
}

export function Divider({ variant = "full", className, ...props }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        "h-px w-full bg-outline-variant",
        variant === "inset" && "mx-4 w-auto",
        className,
      )}
      {...props}
    />
  );
}
