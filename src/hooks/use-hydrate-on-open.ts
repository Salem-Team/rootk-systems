"use client";

import { useEffect, useRef } from "react";

/**
 * Hydrate a draft only when an overlay opens, or when the edited entity
 * changes while open. Parent list refreshes must not wipe in-progress input.
 */
export function useHydrateOnOpen(
  open: boolean,
  entityKey: string | number | null | undefined,
  hydrate: () => void
) {
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;
  const prevOpen = useRef(false);
  const prevKey = useRef(entityKey);

  useEffect(() => {
    const justOpened = open && !prevOpen.current;
    const entityChanged = open && entityKey !== prevKey.current;
    prevOpen.current = open;
    prevKey.current = entityKey;
    if (justOpened || entityChanged) hydrateRef.current();
  }, [open, entityKey]);
}
