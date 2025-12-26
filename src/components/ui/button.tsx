import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary hover:shadow-[0_0_30px_hsl(217_99%_56%_/_0.6)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 glow-destructive",
        success:
          "bg-success text-success-foreground hover:bg-success/90 glow-success",
        outline:
          "border border-primary/40 bg-transparent text-primary hover:bg-primary/10 hover:border-primary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        neon:
          "relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display uppercase tracking-wider glow-primary hover:shadow-[0_0_40px_hsl(217_99%_56%_/_0.8)] before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-transparent before:via-primary-foreground/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        glass:
          "glass border border-primary/20 text-foreground hover:bg-primary/10 hover:border-primary/40",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
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
