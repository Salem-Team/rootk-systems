"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ApiBootstrapProvider } from "@/components/providers/api-bootstrap-provider";
import { StorageBootstrapProvider } from "@/components/providers/storage-bootstrap-provider";
import { NotificationAudioProvider } from "@/components/providers/notification-audio-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLocaleStore } from "@/stores/locale-store";
import { Toaster } from "sonner";

function AppToaster() {
  const locale = useLocaleStore((s) => s.locale);
  return (
    <Toaster
      position={locale === "ar" ? "top-left" : "top-right"}
      dir={locale === "ar" ? "rtl" : "ltr"}
      richColors
      closeButton
      toastOptions={{
        className: "rounded-xl border border-border shadow-lg",
      }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="rootk-theme"
      disableTransitionOnChange
    >
      <LocaleProvider>
        <ApiBootstrapProvider>
          <StorageBootstrapProvider>
            <NotificationAudioProvider>
              <TooltipProvider delayDuration={200}>
                {children}
                <AppToaster />
              </TooltipProvider>
            </NotificationAudioProvider>
          </StorageBootstrapProvider>
        </ApiBootstrapProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
