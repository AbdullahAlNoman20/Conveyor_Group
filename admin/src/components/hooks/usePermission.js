// admin/src/components/hooks/usePermission.js
import { useCallback, useMemo } from "react";
import { useAuth } from "./useAuth";

/**
 * Permission helpers for hiding controls the server would refuse.
 *
 * The server is the authority — this only shapes the UI, so a stale or forged
 * permission list can't actually do anything.
 */
export function usePermission() {
  const { user } = useAuth();

  const permissions = useMemo(() => new Set(user?.permissions ?? []), [user]);

  const can = useCallback((...required) => required.some((p) => permissions.has(p)), [permissions]);
  const canAll = useCallback((...required) => required.every((p) => permissions.has(p)), [permissions]);

  return { can, canAll, permissions, devTools: user?.devTools === true };
}