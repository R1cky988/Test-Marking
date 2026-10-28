import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow-sm shadow-blue-950/10 hover:bg-blue-700 focus-visible:ring-blue-500/30 dark:border dark:border-[#2D4E83] dark:bg-[#182842] dark:text-[#D8E8FF] dark:hover:border-[#3B65A3] dark:hover:bg-[#1E3352]",
        success:
          "bg-emerald-600 text-white shadow-sm shadow-emerald-950/10 hover:bg-emerald-700 focus-visible:ring-emerald-500/30 dark:border dark:border-[#2D6A4F] dark:bg-[#142D25] dark:text-[#D7FBE8] dark:hover:border-[#3C8A68] dark:hover:bg-[#18382D]",
        info:
          "bg-sky-600 text-white shadow-sm shadow-sky-950/10 hover:bg-sky-700 focus-visible:ring-sky-500/30 dark:border dark:border-[#2B6478] dark:bg-[#142B35] dark:text-[#D6F4FF] dark:hover:border-[#3A829A] dark:hover:bg-[#183643]",
        warning:
          "bg-amber-500 text-white shadow-sm shadow-amber-950/10 hover:bg-amber-600 focus-visible:ring-amber-500/30 dark:border dark:border-[#7A5A24] dark:bg-[#332713] dark:text-[#FFE7B0] dark:hover:border-[#9A7130] dark:hover:bg-[#403018]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-card text-foreground shadow-none hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  React.ElementRef<"button">,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
      loading?: boolean;
    }
>(({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      className={cn(buttonVariants({ variant, size, className }), loading && "pointer-events-none opacity-80")}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Loader2 className="animate-spin size-4 shrink-0" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
