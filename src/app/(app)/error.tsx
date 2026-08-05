"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { useTranslation } from "@/hooks/use-translation";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ErrorState
        title={t("common.error")}
        description={t("a11y.errorDesc")}
        actionLabel={t("common.tryAgain")}
        onAction={reset}
      />
    </div>
  );
}
