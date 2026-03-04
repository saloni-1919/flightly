"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";

function cn(...c: Array<string | undefined | false | null>) {
  return c.filter(Boolean).join(" ");
}

function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        border: 0,
        clip: "rect(0 0 0 0)",
        height: 1,
        margin: -1,
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        width: 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const Sheet = SheetPrimitive.Root;
const SheetTitle = SheetPrimitive.Title;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    style={{ zIndex: 999999 }}
    className={cn("fixed inset-0 bg-black/60 backdrop-blur-sm", className)}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    a11yTitle?: string;
  }
>(({ className, children, a11yTitle = "Menu", ...props }, ref) => (
  <>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      style={{ zIndex: 1000000 }}
      className={cn(
        "fixed inset-y-0 left-0 w-[320px] bg-[#070a0f] text-white",
        "border-r border-white/10 shadow-2xl p-6",
        "transition-transform duration-200 ease-out",
        "data-[state=open]:translate-x-0",
        "data-[state=closed]:-translate-x-full",
        className
      )}
      {...props}
    >
      <VisuallyHidden>
        <SheetTitle>{a11yTitle}</SheetTitle>
      </VisuallyHidden>

      {children}
    </SheetPrimitive.Content>
  </>
));
SheetContent.displayName = "SheetContent";

export { Sheet, SheetContent };