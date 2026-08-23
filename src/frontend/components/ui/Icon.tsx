import type { CSSProperties } from "react";
import {
  ICON_PATHS,
  type IconName,
} from "./iconPaths";

export type { IconName };

interface IconProps {
  name: IconName;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
}

export function Icon({
  name,
  className = "",
  filled = false,
  style,
}: IconProps) {
  const resolvedName = (filled && `${name}-fill` in ICON_PATHS
    ? `${name}-fill`
    : name) as IconName;
  const content = ICON_PATHS[resolvedName];

  if (!content) {
    return null;
  }

  return (
    <svg
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{
        width: "1em",
        height: "1em",
        display: "inline-block",
        verticalAlign: "-0.125em",
        flexShrink: 0,
        ...style,
      }}
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default Icon;
