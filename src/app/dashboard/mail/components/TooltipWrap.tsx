"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

export function TooltipWrap({
  children,
  label,
  side = "bottom",
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
}) {
  if (disabled) return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 shadow-lg border border-zinc-700 z-50"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
