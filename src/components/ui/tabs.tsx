"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto min-h-11 w-full max-w-full flex-wrap items-center justify-start gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-border/70 bg-muted/55 p-1 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] [scrollbar-width:none] dark:bg-muted/40 dark:shadow-none sm:min-h-10 sm:w-auto sm:flex-nowrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex min-h-10 min-w-0 max-w-full items-center justify-center whitespace-normal rounded-lg px-2.5 py-1.5 text-center text-[12px] font-medium leading-tight ring-offset-background sm:min-h-9 sm:shrink-0 sm:whitespace-nowrap sm:px-3 sm:text-[13px]",
      "transition-[color,background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/28 focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "hover:text-foreground",
      "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[var(--shadow-card)]",
      "active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/28 focus-visible:ring-offset-2",
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300",
      "motion-reduce:data-[state=active]:animate-none",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
