import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium tracking-[0.01em]",
  {
    variants: {
      variant: {
        neutral: "border-neutral-200 bg-white text-neutral-600",
        blue: "border-blue-100 bg-blue-50 text-blue-700",
        green: "border-emerald-100 bg-emerald-50 text-emerald-700",
        amber: "border-amber-100 bg-amber-50 text-amber-700",
        pink: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
