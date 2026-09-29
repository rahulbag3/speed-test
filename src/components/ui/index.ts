/**
 * The project's component kit.
 *
 * Import from `@/components/ui` rather than reaching into individual files, so
 * the public surface of the design system stays in one place.
 */

export { AppBar, type AppBarProps, type AppBarSize } from "./app-bar";
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from "./button";
export { Chip, type ChipProps, type ChipSize } from "./chip";
export { Divider, type DividerProps } from "./divider";
export { Icon, ICON_PATHS, type IconName, type IconProps } from "./icons";
export { IconButton, type IconButtonProps, type IconButtonSize, type IconButtonVariant } from "./icon-button";
export { LinearProgress, type LinearProgressProps, type ProgressColor } from "./linear-progress";
export {
  SegmentedButtons,
  type SegmentedButtonsProps,
  type SegmentedOption,
} from "./segmented-buttons";
export { Slider, type SliderProps, type SliderSize } from "./slider";
export {
  Surface,
  type SurfaceProps,
  type SurfaceRadius,
  type SurfaceTone,
} from "./surface";
export { Switch, type SwitchProps, type SwitchSize } from "./switch";
export { DisplayText, Text, TEXT_VARIANTS, type TextProps, type TextVariant } from "./text";
