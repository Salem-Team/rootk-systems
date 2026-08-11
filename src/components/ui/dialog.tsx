"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "motion-reduce:animate-none motion-reduce:transition-none",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

function DialogCloseLabel() {
  const { t } = useTranslation();
  return <span className="sr-only">{t("common.close")}</span>;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string;
  }
>(({ className, children, overlayClassName, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      data-ui-overlay=""
      className={cn(
        // Base shell
        "fixed z-50 flex w-full flex-col gap-4 border border-border/80 bg-card shadow-[var(--shadow-float)] outline-none",
        "min-h-0 overflow-y-auto overscroll-contain",
        // Mobile: bottom sheet — stays usable on short viewports
        "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,100%)] translate-x-0 translate-y-0",
        "rounded-t-[1.25rem] rounded-b-none",
        "px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4",
        "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        // Desktop / tablet: centered modal
        "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2",
        "sm:w-[calc(100%-2rem)] sm:max-w-lg",
        "sm:max-h-[min(90dvh,880px)]",
        "sm:-translate-x-1/2 sm:-translate-y-1/2",
        "sm:rounded-2xl sm:px-5 sm:py-5 sm:pb-5",
        "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
        "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
        "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
        "motion-reduce:animate-none motion-reduce:transition-none motion-reduce:zoom-in-100 motion-reduce:zoom-out-100",
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden"
      />
      {children}
      <DialogPrimitive.Close
        className={cn(
          "absolute end-3 top-3 z-20 rounded-md border border-transparent p-1.5 opacity-70",
          "ring-offset-background transition-all",
          "hover:border-border hover:bg-muted hover:opacity-100",
          "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2",
          "disabled:pointer-events-none",
          "sm:top-3.5 sm:end-3.5"
        )}
      >
        <X className="h-4 w-4" />
        <DialogCloseLabel />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky top-0 z-10 -mx-4 -mt-1 flex flex-col gap-1.5 bg-card/95 px-4 pb-3 pt-1 text-start backdrop-blur-sm",
      "sm:-mx-5 sm:px-5",
      "pe-11 sm:pe-12",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col-reverse gap-2 bg-card/95 px-4 pb-1 pt-3 backdrop-blur-sm",
      "sm:-mx-5 sm:flex-row sm:justify-end sm:px-5",
      "border-t border-border/50",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base font-semibold leading-snug tracking-tight sm:text-lg sm:leading-none",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
