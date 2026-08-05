import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-tight transition-[transform,box-shadow,background-color,color,border-color,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/28 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(8,40,104,0.24),0_6px_14px_rgba(8,40,104,0.14)] hover:bg-[#0a3178] hover:shadow-[0_4px_18px_rgba(8,40,104,0.22)] dark:hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92",
        outline:
          "border border-border/90 bg-card font-medium shadow-[0_1px_2px_rgba(11,20,36,0.03)] hover:border-primary/30 hover:bg-accent/75 hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground font-medium hover:bg-secondary/85",
        ghost: "font-medium hover:bg-muted/90 hover:text-foreground",
        link: "font-medium text-primary underline-offset-4 hover:underline",
        success:
          "bg-emerald-700 text-white shadow-sm hover:bg-emerald-600",
        warning:
          "bg-amber-600 text-white shadow-sm hover:bg-amber-500",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-5 text-sm",
        xl: "h-12 rounded-xl px-6 text-[0.95rem] font-semibold",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
