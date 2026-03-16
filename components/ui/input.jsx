import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 transition-[color,box-shadow,border-color] outline-none placeholder:text-neutral-400 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-neutral-400 focus-visible:ring-[3px] focus-visible:ring-neutral-200",
        "aria-invalid:border-red-300 aria-invalid:ring-red-100",
        className
      )}
      {...props} />
  );
}

export { Input }
