// admin/src/components/hooks/useRoleBase.js  (NEW)
import { useAuth } from "./useAuth";

/** URL prefix of the signed-in staff role, so shared pages link correctly. */
export function useRoleBase() {
  const { user } = useAuth();
  if (user?.role === "manager") return "/app/manager";
  if (user?.role === "accounts") return "/app/accounts";
  return "/app/super-admin";
}