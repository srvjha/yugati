"use client"

import { cn } from "@/lib/utils"

function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      style={{ backgroundColor: checked ? 'var(--switch-on)' : 'var(--switch-off)' }}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-1",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
    >
      <span
        style={{ backgroundColor: '#ffffff' }}
        className={cn(
          "pointer-events-none absolute top-[2px] h-[18px] w-[18px] rounded-full shadow-sm transition-transform duration-200",
          checked ? "translate-x-[19px]" : "translate-x-[2px]",
        )}
      />
    </button>
  )
}

export { Switch }
